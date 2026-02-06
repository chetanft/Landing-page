import type {
  TabData,
  MetricData,
  LifecycleStage,
  JourneyApiResponse,
  JourneyMilestoneKey,
  JourneyApiMilestone,
  JourneySearchResponse,
  JourneySearchSummary,
  EpodListApiResponse,
  EpodSummaryResult
} from './journeyTypes'
import { MILESTONE_TO_STAGE_MAPPING } from './journeyTypes'
import { MODULE_URLS } from '../../config/moduleNavigation'

// Re-export indents mapping functions for backward compatibility
export { combineJourneyAndIndentsData, createIndentsLifecycleStage } from './indentsMapper'

// Get total from journey search response
export const getJourneySearchTotal = (response: JourneySearchResponse): number => {
  const data = response.data
  const pagination = data?.pagination || response.pagination
  if (!pagination) return 0
  return (
    pagination.totalItems ??
    pagination.total ??
    pagination.total_count ??
    pagination.total_records ??
    0
  )
}

// Get total from ePOD response
export const getEpodTotal = (response: EpodListApiResponse | null | undefined): number => {
  if (!response) return 0
  const data = response.data
  const pagination = data?.pagination || response.pagination
  if (pagination) {
    return (
      pagination.totalItems ??
      pagination.total ??
      pagination.total_count ??
      pagination.total_records ??
      data?.epods?.length ??
      0
    )
  }
  return (
    data?.totalItems ??
    data?.total ??
    data?.total_count ??
    data?.total_records ??
    data?.epods?.length ??
    0
  )
}

// Apply search summaries to tab data
export const applyJourneySearchSummaries = (tabData: TabData, summaries: JourneySearchSummary[]): TabData => {
  const validSummaries = summaries.filter(summary => summary)
  if (validSummaries.length === 0) return tabData

  const summaryByStatus = new Map<JourneyMilestoneKey, JourneySearchSummary>()
  validSummaries.forEach(summary => {
    summaryByStatus.set(summary.status, summary)
  })

  const updatedStages = tabData.lifecycleStages.map(stage => {
    const metrics = [...stage.metrics]
    const status = [...(stage.status ?? [])]

    if (stage.id === 'in-transit') {
      const summary = summaryByStatus.get('IN_TRANSIT')
      if (summary) {
        const updateMetric = (metricId: string, count: number) => {
          const index = status.findIndex(item => item.metricId === metricId)
          if (index >= 0) {
            status[index] = { ...status[index], count, isMissing: false }
          }
        }
        updateMetric('in-transit-at-drop', summary.atDrop)
        updateMetric('in-transit-at-pickup', summary.atPickup)
        updateMetric('in-transit-at-drop-pickup', summary.atDropPickup)
      }
    }

    return { ...stage, metrics, status }
  })

  return { ...tabData, lifecycleStages: updatedStages }
}

// Create missing journey tab data (fallback)
export const createMissingJourneyTabData = (): TabData => {
  const emptyResponse = {
    success: true,
    data: {
      milestone: {}
    }
  } as JourneyApiResponse

  const tabData = transformApiDataToTabData(emptyResponse)
  return {
    ...tabData,
    id: 'journeys',
    label: 'FTL'
  }
}

// Apply ePOD summary to journeys
export const applyEpodSummaryToJourneys = (journeyData: TabData, epodSummaryResult: EpodSummaryResult): TabData => {
  const { summary: epodSummary, isMissing } = epodSummaryResult
  const updatedStages = journeyData.lifecycleStages.map(stage => {
    if (stage.id !== 'delivered') return stage

    const metrics = [...(stage.metrics ?? [])]
    const status = [...(stage.status ?? [])]
    const exceptions = [...(stage.exceptions ?? [])]

    const setMetric = (list: MetricData[], metricId: string, count: number, isMissingFlag: boolean) => {
      const index = list.findIndex(item => item.metricId === metricId)
      if (index >= 0) {
        list[index] = { ...list[index], count, isMissing: isMissingFlag }
      }
    }

    setMetric(metrics, 'delivered-epod-approved', epodSummary.approved, isMissing)
    setMetric(metrics, 'delivered-epod-approval-pending', epodSummary.awaitingApproval, isMissing)
    setMetric(metrics, 'delivered-epod-pending-submission', epodSummary.pendingSubmission, isMissing)

    setMetric(status, 'delivered-clean', epodSummary.deliveredClean, isMissing)
    setMetric(status, 'delivered-unclean', epodSummary.deliveredUnclean, isMissing)

    setMetric(exceptions, 'delivered-epod-rejected', epodSummary.verifiedRejected, isMissing)

    return { ...stage, metrics, status, exceptions }
  })

  return { ...journeyData, lifecycleStages: updatedStages }
}

// Transform API response to TabData format
export function transformApiDataToTabData(
  apiResponse: JourneyApiResponse,
  alertOverrides?: Record<JourneyMilestoneKey, { alerts?: JourneyApiMilestone['alerts']; analytics?: JourneyApiMilestone['analytics'] }>
): TabData {
  const { milestone } = apiResponse.data
  const getMilestone = (key: JourneyMilestoneKey): JourneyApiMilestone => {
    const baseData = milestone[key] ?? { count: 0, alerts: {}, analytics: {} }
    const override = alertOverrides?.[key]
    return {
      ...baseData,
      alerts: override?.alerts ?? baseData.alerts,
      analytics: override?.analytics ?? baseData.analytics
    }
  }
  const getMilestoneCount = (key: JourneyMilestoneKey) => getMilestone(key).count
  const hasMilestone = (key: JourneyMilestoneKey) => milestone[key] !== undefined

  // Calculate quick KPIs from milestone data
  const totalJourneys = Object.values(milestone).reduce((sum, m) => sum + (m?.count ?? 0), 0)
  const activeJourneys = getMilestoneCount('PLANNED') + getMilestoneCount('BEFORE_ORIGIN') +
                        getMilestoneCount('AT_ORIGIN') + getMilestoneCount('IN_TRANSIT') +
                        getMilestoneCount('AT_DESTINATION') + getMilestoneCount('IN_RETURN') +
                        getMilestoneCount('AFTER_DESTINATION')

  const quickKPIs: MetricData[] = [
    {
      metricId: 'total-journeys',
      label: 'Total Journeys',
      count: totalJourneys,
      statusType: 'neutral',
      target: { path: MODULE_URLS.journeys, defaultFilters: {} }
    },
    {
      metricId: 'active-journeys',
      label: 'Active Journeys',
      count: activeJourneys,
      statusType: 'positive',
      target: { path: MODULE_URLS.journeys, defaultFilters: { status: 'active' } }
    },
    {
      metricId: 'completed-journeys',
      label: 'Completed Journeys',
      count: getMilestoneCount('CLOSED'),
      statusType: 'positive',
      target: { path: MODULE_URLS.journeys, defaultFilters: { status: 'closed' } }
    }
  ]

  // Transform milestones to lifecycle stages
  // First, let's group the milestones and combine AFTER_DESTINATION + CLOSED into "Delivered"
  const processedMilestones = new Map<string, {
    stageInfo: { title: string; id: string },
    totalCount: number,
    combinedData: JourneyApiMilestone,
    hasMilestone: boolean
  }>()

  Object.entries(MILESTONE_TO_STAGE_MAPPING).forEach(([milestoneKey, stageInfo]) => {
    const milestoneData = getMilestone(milestoneKey as JourneyMilestoneKey)
    const milestonePresent = hasMilestone(milestoneKey as JourneyMilestoneKey)

    if (processedMilestones.has(stageInfo.id)) {
      // Combine with existing stage (for Delivered combining AFTER_DESTINATION + CLOSED)
      const existing = processedMilestones.get(stageInfo.id)!
      existing.totalCount += milestoneData.count
      existing.hasMilestone = existing.hasMilestone || milestonePresent
      // Combine alerts and analytics
      if (milestoneData.alerts.long_stoppage?.count) {
        existing.combinedData.alerts.long_stoppage = existing.combinedData.alerts.long_stoppage || { count: 0 }
        existing.combinedData.alerts.long_stoppage.count += milestoneData.alerts.long_stoppage.count
      }
      if (milestoneData.alerts.route_deviation?.count) {
        existing.combinedData.alerts.route_deviation = existing.combinedData.alerts.route_deviation || { count: 0 }
        existing.combinedData.alerts.route_deviation.count += milestoneData.alerts.route_deviation.count
      }
      if (milestoneData.alerts.eway_bill?.count) {
        existing.combinedData.alerts.eway_bill = existing.combinedData.alerts.eway_bill || { count: 0 }
        existing.combinedData.alerts.eway_bill.count += milestoneData.alerts.eway_bill.count
      }

      // Combine analytics (especially important for ePOD status from CLOSED milestone)
      if (milestoneData.analytics?.epod_status) {
        // Ensure analytics object exists
        if (!existing.combinedData.analytics) {
          existing.combinedData.analytics = {}
        }

        if (!existing.combinedData.analytics.epod_status) {
          existing.combinedData.analytics.epod_status = {
            count: milestoneData.analytics.epod_status.count,
            time_bucket: { ...milestoneData.analytics.epod_status.time_bucket }
          }
        } else {
          // Combine ePOD status counts
          const existingBucket = existing.combinedData.analytics.epod_status.time_bucket
          const newBucket = milestoneData.analytics.epod_status.time_bucket

          existingBucket.pending_submission = (existingBucket.pending_submission || 0) + (newBucket.pending_submission || 0)
          existingBucket.approval_pending = (existingBucket.approval_pending || 0) + (newBucket.approval_pending || 0)
          existingBucket.verified_as_unclean = (existingBucket.verified_as_unclean || 0) + (newBucket.verified_as_unclean || 0)
          existingBucket.verified_as_clean = (existingBucket.verified_as_clean || 0) + (newBucket.verified_as_clean || 0)

          existing.combinedData.analytics.epod_status.count = (existing.combinedData.analytics.epod_status.count || 0) + (milestoneData.analytics.epod_status.count || 0)
        }
      }
    } else {
      // First occurrence of this stage
      processedMilestones.set(stageInfo.id, {
        stageInfo,
        totalCount: milestoneData.count,
        combinedData: { ...milestoneData },
        hasMilestone: milestonePresent
      })
    }
  })

  // Transform processed milestones to lifecycle stages
  const lifecycleStages: LifecycleStage[] = Array.from(processedMilestones.values()).map(
    ({ stageInfo, totalCount, combinedData, hasMilestone }) => {
      const metrics: MetricData[] = []
      const status: MetricData[] = []
      const exceptions: MetricData[] = []

      const makeJourneyMetric = (
        metricId: string,
        label: string,
        count: number,
        statusType: MetricData['statusType'],
        isMissing: boolean,
        defaultFilters: Record<string, string> = {}
      ): MetricData => ({
        metricId,
        label,
        count,
        statusType,
        target: { path: `/journeys/${stageInfo.id}`, defaultFilters },
        isMissing
      })

      metrics.push({
        metricId: `${stageInfo.id}-summary`,
        label: 'Total',
        count: totalCount,
        statusType: 'neutral',
        target: { path: `/journeys/${stageInfo.id}`, defaultFilters: {} },
        groupKey: 'summary',
        isMissing: !hasMilestone
      })

      if (stageInfo.id === 'en-route-loading') {
        metrics.push(makeJourneyMetric('en-route-loading-in-transit', 'In transit', totalCount, 'neutral', !hasMilestone))
      }

      if (stageInfo.id === 'at-loading') {
        metrics.push(
          makeJourneyMetric('at-loading-gate-in', 'Gate In', 0, 'neutral', true),
          makeJourneyMetric('at-loading-yard-in', 'Yard In', 0, 'neutral', true),
          makeJourneyMetric('at-loading-yard-out', 'Yard Out', 0, 'neutral', true),
          makeJourneyMetric('at-loading-gate-out', 'Gate Out', 0, 'neutral', true)
        )
        exceptions.push(
          makeJourneyMetric('at-loading-detained', 'Detained', 0, 'critical', true),
          makeJourneyMetric('at-loading-vehicle-rejected', 'Vehicle rejected', 0, 'critical', true)
        )
      }

      if (stageInfo.id === 'in-transit') {
        metrics.push(
          makeJourneyMetric('in-transit-in-transit', 'In Transit', totalCount, 'neutral', !hasMilestone)
        )
        const longStoppageCount = combinedData.alerts.long_stoppage?.count ?? 0
        const routeDeviationCount = combinedData.alerts.route_deviation?.count ?? 0
        const ewayBillCount = combinedData.alerts.eway_bill?.count ?? 0
        const alertMissing = !hasMilestone
        exceptions.push(
          makeJourneyMetric('in-transit-long-stoppage', 'Long Stoppage', longStoppageCount, 'critical', alertMissing, { alert: 'long_stoppage' }),
          makeJourneyMetric('in-transit-eway-bill', 'E-way Bill Issues', ewayBillCount, 'critical', alertMissing, { alert: 'eway_bill' }),
          makeJourneyMetric('in-transit-transit-delay', 'Transit delay', 0, 'critical', true),
          makeJourneyMetric('in-transit-diversion', 'Diversion', 0, 'critical', true),
          makeJourneyMetric('in-transit-route-deviation', 'Route Deviation', routeDeviationCount, 'critical', alertMissing, { alert: 'route_deviation' })
        )
        metrics.push(
          makeJourneyMetric('in-transit-at-drop', 'At Drop', 0, 'neutral', true),
          makeJourneyMetric('in-transit-at-pickup', 'At Pickup', 0, 'neutral', true),
          makeJourneyMetric('in-transit-at-drop-pickup', 'At Drop + Pickup', 0, 'neutral', true)
        )
      }

      if (stageInfo.id === 'at-destination') {
        metrics.push(
          makeJourneyMetric('at-destination-gate-in', 'Gate In', 0, 'neutral', true),
          makeJourneyMetric('at-destination-yard-in', 'Yard In', 0, 'neutral', true),
          makeJourneyMetric('at-destination-yard-out', 'Yard Out', 0, 'neutral', true),
          makeJourneyMetric('at-destination-gate-out', 'Gate Out', 0, 'neutral', true)
        )
        exceptions.push(
          makeJourneyMetric('at-destination-detained', 'Detained', 0, 'critical', true)
        )
      }

      if (stageInfo.id === 'return-journey') {
        metrics.push(makeJourneyMetric('return-journey-in-transit', 'In Transit', totalCount, 'neutral', !hasMilestone))
      }

      if (stageInfo.id === 'delivered') {
        metrics.push(
          makeJourneyMetric('delivered-epod-pending-submission', 'ePOD pending submission', 0, 'warning', true, { epod_status: 'PENDING_SUBMISSION' }),
          makeJourneyMetric('delivered-epod-approval-pending', 'ePOD pending approval', 0, 'warning', true, { epod_status: 'AWAITING_APPROVAL' }),
          makeJourneyMetric('delivered-epod-approved', 'ePOD Approved', 0, 'positive', true, { epod_status: 'APPROVED' })
        )
        exceptions.push(
          makeJourneyMetric('delivered-epod-rejected', 'ePOD Rejected', 0, 'critical', true, { epod_status: 'VERIFIED_AS_REJECTED' })
        )
        status.push(
          makeJourneyMetric('delivered-clean', 'Clean', 0, 'positive', true, { delivery_status: 'VERIFIED_AS_SUCCESSFULLY_DELIVERED' }),
          makeJourneyMetric('delivered-unclean', 'Unclean', 0, 'warning', true, { delivery_status: 'VERIFIED_AS_DELIVERED_WITH_ISSUES' })
        )
      } else {
        const delayData = combinedData.analytics.delay_in_minutes
        const hasDelay = Boolean(delayData) && hasMilestone
        const delayedCount = delayData?.count || 0
        const onTimeCount = Math.max(0, totalCount - delayedCount)

        status.push(
          makeJourneyMetric(`${stageInfo.id}-delay-on-time`, 'On time', onTimeCount, 'positive', !hasDelay, { delay: '0-6h' }),
          makeJourneyMetric(`${stageInfo.id}-delay-delayed`, 'Delayed', delayedCount, 'warning', !hasDelay, { delay: '6h+' })
        )
      }

      return {
        id: stageInfo.id,
        title: stageInfo.title,
        metrics,
        exceptions,
        status
      }
    }
  )

  return {
    id: 'journeys',
    label: 'Journeys',
    quickKPIs,
    lifecycleStages
  }
}
