import type { TabData, MetricData, LifecycleStage, GlobalFilters } from '../../types/metrics'
import type {
  ShipmentMilestoneSummary,
  ShipmentSummaryApiResponse,
  ShipmentSpecificBucketSummary,
  OrdersBucketSummary
} from './shipmentsTypes'
import { SHIPMENT_MILESTONE_MAPPING } from './shipmentsTypes'

/**
 * Create lifecycle stage for orders data
 */
export function createOrdersLifecycleStage(
  ordersData?: OrdersBucketSummary | null,
  error?: string | null
): LifecycleStage {
  const counts: OrdersBucketSummary = {
    SERVICEABLE: ordersData?.SERVICEABLE ?? 0,
    UNSERVICEABLE: ordersData?.UNSERVICEABLE ?? 0,
    PROCESSING: ordersData?.PROCESSING ?? 0,
    BOOKED: ordersData?.BOOKED ?? 0,
    FAILED: ordersData?.FAILED ?? 0,
    CANCELLED: ordersData?.CANCELLED ?? 0,
  }
  const isMissing = !ordersData

  const metrics: MetricData[] = []
  const exceptions: MetricData[] = []

  const totalOrders = Object.values(counts).reduce((sum, count) => sum + count, 0)

  metrics.push({
    metricId: 'orders-total',
    label: 'Orders',
    count: totalOrders,
    statusType: 'neutral',
    target: { path: '/orders', defaultFilters: {} },
    isMissing
  })

  metrics.push({
    metricId: 'orders-serviceable',
    label: 'Serviceable',
    count: counts.SERVICEABLE,
    statusType: 'positive',
    target: { path: '/orders', defaultFilters: { status: 'serviceable' } },
    isMissing
  })

  metrics.push({
    metricId: 'orders-processing',
    label: 'Processing',
    count: counts.PROCESSING,
    statusType: 'warning',
    target: { path: '/orders', defaultFilters: { status: 'processing' } },
    isMissing
  })

  metrics.push({
    metricId: 'orders-booked',
    label: 'Ready to Ship',
    count: counts.BOOKED,
    statusType: 'positive',
    target: { path: '/orders', defaultFilters: { status: 'booked' } },
    isMissing
  })

  exceptions.push({
    metricId: 'orders-unserviceable',
    label: 'Unserviceable',
    count: counts.UNSERVICEABLE,
    statusType: 'critical',
    target: { path: '/orders', defaultFilters: { status: 'unserviceable' } },
    isMissing
  })

  exceptions.push({
    metricId: 'orders-failed',
    label: 'Failed',
    count: counts.FAILED,
    statusType: 'critical',
    target: { path: '/orders', defaultFilters: { status: 'failed' } },
    isMissing
  })

  exceptions.push({
    metricId: 'orders-cancelled',
    label: 'Cancelled',
    count: counts.CANCELLED,
    statusType: 'critical',
    target: { path: '/orders', defaultFilters: { status: 'cancelled' } },
    isMissing
  })

  const stage: LifecycleStage = {
    id: 'orders',
    title: 'Orders',
    metrics,
    exceptions
  }

  if (error) {
    stage.error = error
  }

  return stage
}

/**
 * Transform API response to TabData format
 */
export function transformShipmentDataToTabData(
  apiResponse: ShipmentSummaryApiResponse,
  analyticsMap?: Map<string, ShipmentSpecificBucketSummary | null>,
  ordersData?: OrdersBucketSummary | null,
  ordersError?: string | null,
  globalFilters?: GlobalFilters
): TabData {
  const milestoneData = apiResponse.data.milestone_summary
  const priorityFilter = globalFilters?.priority
  const selectedPriorities = priorityFilter && priorityFilter.length > 0 ? priorityFilter : null

  const getMilestoneCount = (milestoneKey: keyof ShipmentMilestoneSummary): number => {
    return milestoneData[milestoneKey] ?? 0
  }
  const hasMilestone = (milestoneKey: keyof ShipmentMilestoneSummary): boolean => {
    return milestoneData[milestoneKey] !== undefined
  }

  const totalShipments = Object.values(milestoneData).reduce((sum, count) => sum + (count ?? 0), 0)

  const activeShipments = getMilestoneCount('BOOKED') +
    getMilestoneCount('PICKED_UP') +
    getMilestoneCount('IN_TRANSIT') +
    getMilestoneCount('OUT_FOR_DELIVERY')

  const deliveredShipments = getMilestoneCount('DELIVERED')

  const quickKPIs: MetricData[] = [
    {
      metricId: 'total-shipments',
      label: 'Total Shipments',
      count: totalShipments,
      statusType: 'neutral',
      target: { path: '/shipments', defaultFilters: {} }
    },
    {
      metricId: 'active-shipments',
      label: 'Active Shipments',
      count: activeShipments,
      statusType: 'positive',
      target: { path: '/shipments', defaultFilters: { status: 'active' } }
    },
    {
      metricId: 'delivered-shipments',
      label: 'Delivered Shipments',
      count: deliveredShipments,
      statusType: 'positive',
      target: { path: '/shipments', defaultFilters: { status: 'delivered' } }
    }
  ]

  const exceptionRollupKeys = ['UNDELIVERED', 'RTO', 'AWAITING_UPDATES', 'NO_UPDATES'] as const

  const lifecycleStages: LifecycleStage[] = Object.entries(SHIPMENT_MILESTONE_MAPPING)
    .filter(([milestoneKey]) => !exceptionRollupKeys.includes(milestoneKey as typeof exceptionRollupKeys[number]))
    .map(([milestoneKey, stageInfo]) => {
      const milestoneKeyTyped = milestoneKey as keyof ShipmentMilestoneSummary
      const milestoneCount = getMilestoneCount(milestoneKeyTyped)
      const milestoneMissing = !hasMilestone(milestoneKeyTyped)

      const metrics: MetricData[] = []
      const status: MetricData[] = []

      const bucketAnalytics = analyticsMap?.get(milestoneKey)

      metrics.push({
        metricId: `${stageInfo.id}-total`,
        label: 'Total',
        count: milestoneCount,
        statusType: milestoneKey === 'EXCEPTIONS' || milestoneKey === 'UNDELIVERED' ? 'critical' : 'neutral',
        target: { path: `/shipments/${stageInfo.id}`, defaultFilters: {} },
        groupKey: 'summary',
        groupLabel: undefined,
        groupOrder: 0,
        isMissing: milestoneMissing
      })

      const prioritySummary = bucketAnalytics?.priority_summary
      const prioritiesToShow = selectedPriorities ?? ['high', 'standard', 'low']
      prioritiesToShow.forEach((priority) => {
        const count = prioritySummary?.[priority] ?? 0
        const label = `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`
        metrics.push({
          metricId: `${stageInfo.id}-priority-${priority}`,
          label,
          count,
          statusType: priority === 'high' ? 'critical' : 'neutral',
          target: {
            path: `/shipments/${stageInfo.id}`,
            defaultFilters: { priority }
          },
          groupKey: 'priority',
          groupLabel: 'Priority',
          groupOrder: 1,
          isMissing: !prioritySummary
        })
      })

      if (milestoneKey === 'DELIVERED' || milestoneKey === 'OUT_FOR_DELIVERY') {
        const podSummary = bucketAnalytics?.pod_summary
        metrics.push({
          metricId: `${stageInfo.id}-pod-available`,
          label: 'POD Available',
          count: podSummary ? parseInt(podSummary.pod_available) : 0,
          statusType: 'positive',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { pod_status: 'available' } },
          groupKey: 'epod',
          groupLabel: 'ePOD',
          groupOrder: 2,
          isMissing: !podSummary
        })

        metrics.push({
          metricId: `${stageInfo.id}-pod-pending`,
          label: 'POD Pending',
          count: podSummary ? parseInt(podSummary.pod_pending) : 0,
          statusType: 'warning',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { pod_status: 'pending' } },
          groupKey: 'epod',
          groupLabel: 'ePOD',
          groupOrder: 2,
          isMissing: !podSummary
        })
      }

      if (milestoneKey === 'OUT_FOR_DELIVERY') {
        const ofdSummary = bucketAnalytics?.ofd_summary
        status.push({
          metricId: `${stageInfo.id}-ofd-today`,
          label: 'Today',
          count: ofdSummary ? parseInt(ofdSummary.today) : 0,
          statusType: 'positive',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { ofd_date: 'today' } },
          isMissing: !ofdSummary
        })
        status.push({
          metricId: `${stageInfo.id}-ofd-tomorrow`,
          label: 'Tomorrow',
          count: ofdSummary ? parseInt(ofdSummary.tomorrow) : 0,
          statusType: 'neutral',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { ofd_date: 'tomorrow' } },
          isMissing: !ofdSummary
        })
      }

      const delayedSummary = bucketAnalytics?.delayed_summary
      status.push({
        metricId: `${stageInfo.id}-delayed-1day`,
        label: '1 Day',
        count: delayedSummary ? parseInt(delayedSummary['1 day']) : 0,
        statusType: 'warning',
        target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { delayed_days: '1' } },
        isMissing: !delayedSummary
      })
      status.push({
        metricId: `${stageInfo.id}-delayed-2-4days`,
        label: '2-4 Days',
        count: delayedSummary ? parseInt(delayedSummary['2-4 days']) : 0,
        statusType: 'warning',
        target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { delayed_days: '2-4' } },
        isMissing: !delayedSummary
      })
      status.push({
        metricId: `${stageInfo.id}-delayed-4plusdays`,
        label: '4+ Days',
        count: delayedSummary ? parseInt(delayedSummary['4+ days']) : 0,
        statusType: 'critical',
        target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { delayed_days: '4+' } },
        isMissing: !delayedSummary
      })

      const transitStatus = bucketAnalytics?.transit_status_summary
      status.push({
        metricId: `${stageInfo.id}-on-time`,
        label: 'On Time',
        count: transitStatus?.on_time ?? 0,
        statusType: 'positive',
        target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { transit_status: 'on_time' } },
        isMissing: !transitStatus
      })
      status.push({
        metricId: `${stageInfo.id}-delayed`,
        label: 'Delayed',
        count: transitStatus?.delayed ?? 0,
        statusType: 'warning',
        target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { transit_status: 'delayed' } },
        isMissing: !transitStatus
      })

      const exceptions: MetricData[] = []
      if (milestoneKey === 'EXCEPTIONS') {
        exceptions.push({
          metricId: `${stageInfo.id}-exceptions`,
          label: 'Exception Shipments',
          count: milestoneCount,
          statusType: 'critical',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { type: 'exception' } },
          isMissing: milestoneMissing
        })
      }

      if (milestoneKey === 'EXCEPTIONS') {
        exceptionRollupKeys.forEach((rollupKey) => {
          const rollupCount = getMilestoneCount(rollupKey)
          const rollupMissing = !hasMilestone(rollupKey)
          exceptions.push({
            metricId: `${stageInfo.id}-${rollupKey.toLowerCase()}`,
            label: rollupKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
            count: rollupCount,
            statusType: rollupKey === 'RTO' ? 'critical' : 'warning',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { milestone: rollupKey } },
            isMissing: rollupMissing
          })
        })
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

  const finalLifecycleStages: LifecycleStage[] = []
  const ordersStage = createOrdersLifecycleStage(ordersData, ordersError)
  finalLifecycleStages.push(ordersStage)
  finalLifecycleStages.push(...lifecycleStages)

  return {
    id: 'shipments',
    label: 'Shipments',
    quickKPIs,
    lifecycleStages: finalLifecycleStages
  }
}

/**
 * Create missing/empty shipment tab data
 */
export const createMissingShipmentTabData = (globalFilters?: GlobalFilters): TabData => {
  const emptyResponse = {
    success: true,
    data: {
      bucket_summary: {},
      milestone_summary: {}
    }
  } as ShipmentSummaryApiResponse

  return transformShipmentDataToTabData(emptyResponse, undefined, null, 'Missing data', globalFilters)
}
