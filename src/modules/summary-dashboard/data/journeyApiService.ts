import type { TabData, MetricData, LifecycleStage, GlobalFilters } from '../types/metrics'
import { ApiError, isAuthError } from '../utils/apiUtils'
import { AuthenticationError } from '../auth/authApiService'
import { fetchIndentsCount, type IndentsApiResponse } from './indentsApiService'
import { MODULE_URLS } from '../config/moduleNavigation'
import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { TokenManager } from '../auth/tokenManager'
import { JOURNEY_COUNT_ONLY_MODE } from '../config/apiMode'

// API response types based on the provided structure
interface JourneyApiMilestone {
  count: number
  alerts: {
    count?: number
    long_stoppage?: { count: number }
    eway_bill?: { count: number }
    route_deviation?: { count: number }
  }
  analytics: {
    count?: number
    delay_in_minutes?: {
      count: number
      time_bucket: {
        '0-6h': number
        '6-12h': number
        '12h': number
      }
    }
    expected_arrival?: {
      count: number
      time_bucket: {
        '0-12h': number
        '12h': number
      }
    }
    epod_status?: {
      count: number
      time_bucket: {
        pending_submission: number
        approval_pending: number
        verified_as_unclean: number
        verified_as_clean: number
      }
    }
  }
}

type JourneyMilestoneKey =
  | 'PLANNED'
  | 'BEFORE_ORIGIN'
  | 'AT_ORIGIN'
  | 'IN_TRANSIT'
  | 'AT_DESTINATION'
  | 'IN_RETURN'
  | 'AFTER_DESTINATION'
  | 'CLOSED'

type JourneyMilestones = Partial<Record<JourneyMilestoneKey, JourneyApiMilestone>>

interface JourneyApiResponse {
  success: boolean
  data: {
    milestone: JourneyMilestones
  }
}

interface EpodListApiResponse {
  success?: boolean
  data?: {
    epods?: unknown[]
    pagination?: {
      totalItems?: number
      total?: number
      total_count?: number
      total_records?: number
    }
    totalItems?: number
    total?: number
    total_count?: number
    total_records?: number
  }
  pagination?: {
    totalItems?: number
    total?: number
    total_count?: number
    total_records?: number
  }
}

interface EpodSummary {
  awaitingApproval: number
  pendingSubmission: number
  verifiedRejected: number
  approved: number
  deliveredClean: number
  deliveredUnclean: number
}

interface EpodSummaryResult {
  summary: EpodSummary
  isMissing: boolean
}

// Map API milestones to lifecycle stages
const MILESTONE_TO_STAGE_MAPPING = {
  BEFORE_ORIGIN: {
    title: 'En route to loading',
    id: 'en-route-loading'
  },
  AT_ORIGIN: {
    title: 'At Loading',
    id: 'at-loading'
  },
  IN_TRANSIT: {
    title: 'In Transit',
    id: 'in-transit'
  },
  AT_DESTINATION: {
    title: 'At Destination',
    id: 'at-destination'
  },
  IN_RETURN: {
    title: 'In Return',
    id: 'return-journey'
  },
  AFTER_DESTINATION: {
    title: 'Delivered',
    id: 'delivered'
  },
  CLOSED: {
    title: 'Delivered',
    id: 'delivered'
  }
} as const

const JOURNEY_STATUSES_FOR_ALERTS: JourneyMilestoneKey[] = [
  'PLANNED',
  'BEFORE_ORIGIN',
  'AT_ORIGIN',
  'IN_TRANSIT',
  'AT_DESTINATION',
  'IN_RETURN',
  'AFTER_DESTINATION',
  'CLOSED'
]

const formatDateForApi = (date: Date, isEnd: boolean = false): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = '18'
  const minutes = isEnd ? '29' : '30'
  const seconds = isEnd ? '59' : '00'
  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`
}

const buildJourneySnapshotUrl = (globalFilters: GlobalFilters, journeyStatus: string): string => {
  const baseUrl = buildFtTmsUrl('/api/journey-snapshot/v1/journeys/count')
  const startTime = formatDateForApi(globalFilters.dateRange.start, false)
  const endTime = formatDateForApi(globalFilters.dateRange.end, true)

  const params = new URLSearchParams({
    page: '1',
    size: '20',
    entity_type: 'CNR',
    journey_status: journeyStatus,
    start_time_utc: startTime,
    end_time_utc: endTime,
    journey_direction: 'outbound',
    journey_stop_type: 'source',
    'sort[sort_by]': 'created_at',
    'sort[sort_by_order]': 'DESC'
  })

  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }
  if (globalFilters.consigneeId) {
    params.append('consignee_fteid', globalFilters.consigneeId)
  }

  const milestones = ['PLANNED', 'BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION', 'IN_RETURN', 'AFTER_DESTINATION', 'CLOSED']
  milestones.forEach(milestone => {
    params.append('milestones[]', milestone)
  })

  const activeAlerts = ['long_stoppage', 'route_deviation', 'eway_bill']
  activeAlerts.forEach(alert => {
    params.append('active_alerts[]', alert)
  })

  const activeAnalytics = ['delay_in_minutes', 'expected_arrival']
  activeAnalytics.forEach(analytic => {
    params.append('active_analytics[]', analytic)
  })

  return `${baseUrl}?${params.toString()}`
}

const buildJourneyRequestHeaders = (): Record<string, string> => {
  const token = TokenManager.getAccessToken()
  if (!token) {
    throw new AuthenticationError('No access token available for journey snapshot')
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  const userContext = TokenManager.getUserContext()
  if (userContext?.orgId) {
    headers['X-FT-ORGID'] = userContext.orgId
  }
  if (userContext?.userId) {
    headers['X-FT-USERID'] = userContext.userId
  }

  return headers
}

const fetchJourneyStatusCounts = async (globalFilters: GlobalFilters, journeyStatus: JourneyMilestoneKey): Promise<JourneyApiResponse> => {
  const url = buildJourneySnapshotUrl(globalFilters, journeyStatus)
  const headers = buildJourneyRequestHeaders()

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  })
  const data: JourneyApiResponse = await response.json()
  if (!data.success) {
    throw new ApiError(
      data.message || 'API returned failure status',
      response.status,
      response.statusText,
      url
    )
  }

  return data
}

/**
 * Fetch journey metrics from the real API with enhanced error handling
 */
export const fetchJourneyMetrics = async (globalFilters: GlobalFilters): Promise<TabData> => {
  // Always fetch both journey data and indents data in parallel
  const [epodSummaryResult, journeyData, indentsData] = await Promise.all([
    fetchJourneyEpodSummary(),
    fetchJourneyMetricsFromAPI(globalFilters),
    fetchIndentsCount(globalFilters)
  ])

  // Combine indents data with journey data
  const withEpod = applyEpodSummaryToJourneys(journeyData, epodSummaryResult)
  return combineJourneyAndIndentsData(withEpod, indentsData)
}

const getEpodTotal = (response: EpodListApiResponse | null | undefined): number => {
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

const fetchJourneyEpodSummary = async (): Promise<EpodSummaryResult> => {
  try {
    const baseUrl = buildFtTmsUrl('/api/trip-snapshot/api/v1/epods')
    const makeUrl = (params: Record<string, string>) => {
      const search = new URLSearchParams({ page: '1', size: '1', ...params })
      return `${baseUrl}?${search.toString()}`
    }

    const requests = await Promise.all([
      ftTmsFetch(makeUrl({ epod_status: 'AWAITING_APPROVAL' })),
      ftTmsFetch(makeUrl({ epod_status: 'PENDING_SUBMISSION' })),
      ftTmsFetch(makeUrl({ epod_status: 'VERIFIED_AS_REJECTED' })),
      ftTmsFetch(makeUrl({ epod_status: 'APPROVED' })),
      ftTmsFetch(makeUrl({ delivery_status: 'VERIFIED_AS_SUCCESSFULLY_DELIVERED' })),
      ftTmsFetch(makeUrl({ delivery_status: 'VERIFIED_AS_DELIVERED_WITH_ISSUES' }))
    ])

    const [
      awaitingApprovalRes,
      pendingSubmissionRes,
      verifiedRejectedRes,
      approvedRes,
      deliveredCleanRes,
      deliveredUncleanRes
    ] = await Promise.all(requests.map(res => res.json() as Promise<EpodListApiResponse>))

    const safeTotal = (res: EpodListApiResponse) =>
      res.success === false ? 0 : getEpodTotal(res)

    return {
      summary: {
        awaitingApproval: safeTotal(awaitingApprovalRes),
        pendingSubmission: safeTotal(pendingSubmissionRes),
        verifiedRejected: safeTotal(verifiedRejectedRes),
        approved: safeTotal(approvedRes),
        deliveredClean: safeTotal(deliveredCleanRes),
        deliveredUnclean: safeTotal(deliveredUncleanRes)
      },
      isMissing: false
    }
  } catch (error) {
    console.warn('Failed to fetch ePOD summary:', error)
    return {
      summary: {
        awaitingApproval: 0,
        pendingSubmission: 0,
        verifiedRejected: 0,
        approved: 0,
        deliveredClean: 0,
        deliveredUnclean: 0
      },
      isMissing: true
    }
  }
}

const applyEpodSummaryToJourneys = (journeyData: TabData, epodSummaryResult: EpodSummaryResult): TabData => {
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

/**
 * Real API call implementation - Now activated
 */
export const fetchJourneyMetricsFromAPI = async (globalFilters: GlobalFilters): Promise<TabData> => {
  const isLocalOnly = import.meta.env.DEV
  const sampleUrl = buildJourneySnapshotUrl(globalFilters, 'IN_TRANSIT')

  try {
    const statusResponses = await Promise.all(
      JOURNEY_STATUSES_FOR_ALERTS.map((status) => fetchJourneyStatusCounts(globalFilters, status))
    )
    const inTransitIndex = JOURNEY_STATUSES_FOR_ALERTS.indexOf('IN_TRANSIT')
    const baseResponse = statusResponses[inTransitIndex]
    if (!baseResponse) {
      throw new ApiError('Missing IN_TRANSIT response', 0, 'Missing Data', sampleUrl)
    }

    if (isLocalOnly) {
      console.log('[FT TMS] journeys/count raw response:', baseResponse)
    }

    const alertOverrides: Record<JourneyMilestoneKey, { alerts?: JourneyApiMilestone['alerts']; analytics?: JourneyApiMilestone['analytics'] }> = {}
    JOURNEY_STATUSES_FOR_ALERTS.forEach((status, index) => {
      const milestoneData = statusResponses[index].data.milestone[status]
      if (milestoneData) {
        alertOverrides[status] = {
          alerts: milestoneData.alerts,
          analytics: milestoneData.analytics
        }
      }
    })

    return transformApiDataToTabData(baseResponse, alertOverrides)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication error while fetching journey metrics:', error.message)
      throw error
    }

    if (error instanceof ApiError) {
      console.error(`API error while fetching journey metrics [${error.status}]:`, error.message)
      throw error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error while fetching journey metrics:', error.message)
      throw new ApiError(
        'Network connection failed',
        0,
        'Network Error',
        sampleUrl
      )
    }

    console.error('Unknown error while fetching journey metrics:', error)
    throw new ApiError(
      'An unexpected error occurred',
      500,
      'Unknown Error',
      sampleUrl
    )
  }
}

/**
 * Combine journey data with indents data
 */
function combineJourneyAndIndentsData(journeyData: TabData, indentsData: any[]): TabData {
  // Create indents stage from the indents API data
  const indentsStage = createIndentsLifecycleStage(indentsData)

  // Add indents stage at the beginning of the lifecycle stages
  const updatedLifecycleStages = [indentsStage, ...journeyData.lifecycleStages]

  // Update quick KPIs to include indents data
  const totalIndents = indentsData.reduce((sum, item) => sum + item.count, 0)
  const activeIndents = indentsData
    .filter(item => ['OPEN', 'SCHEDULED', 'DRAFT'].includes(item.key))
    .reduce((sum, item) => sum + item.count, 0)

  const updatedQuickKPIs: MetricData[] = [
    {
      metricId: 'total-indents',
      label: 'Total Indents',
      count: totalIndents,
      statusType: 'neutral',
      target: { path: MODULE_URLS.indents, defaultFilters: {} }
    },
    {
      metricId: 'active-indents',
      label: 'Active Indents',
      count: activeIndents,
      statusType: 'positive',
      target: { path: MODULE_URLS.indents, defaultFilters: { status: 'active' } }
    },
    ...journeyData.quickKPIs
  ]

  return {
    ...journeyData,
    quickKPIs: updatedQuickKPIs,
    lifecycleStages: updatedLifecycleStages
  }
}

/**
 * Create lifecycle stage for indents data
 */
function createIndentsLifecycleStage(indentsData: any[]): LifecycleStage {
  const metrics: MetricData[] = []
  const exceptions: MetricData[] = []

  const normalizeText = (text?: string) => (text ?? '').trim().toLowerCase()
  const lookup = new Map<string, { count: number; key?: string }>()

  const addItem = (text?: string, key?: string, count?: number) => {
    if (!text) return
    const normalized = normalizeText(text)
    const existing = lookup.get(normalized)
    const nextCount = (existing?.count ?? 0) + (typeof count === 'number' ? count : 0)
    lookup.set(normalized, { count: nextCount, key: existing?.key ?? key })
  }

  indentsData.forEach(item => {
    addItem(item.text, item.key, item.count)
    if (item.child && item.child.length > 0) {
      item.child.forEach((childItem: any) => {
        addItem(childItem.text, childItem.key, childItem.count)
      })
    }
  })

  const makeIndentMetric = (label: string, metricId: string, statusType: MetricData['statusType']): MetricData => {
    const entry = lookup.get(normalizeText(label))
    const count = entry?.count ?? 0
    const isMissing = !entry
    const targetPath = entry?.key ? `/indents/${entry.key.toLowerCase()}` : MODULE_URLS.indents
    return {
      metricId,
      label,
      count,
      statusType,
      target: { path: targetPath, defaultFilters: {} },
      isMissing
    }
  }

  const milestoneMetrics: MetricData[] = [
    makeIndentMetric('Pending Acceptance', 'indents-pending-acceptance', 'warning'),
    makeIndentMetric('In Assignment', 'indents-in-assignment', 'warning'),
    makeIndentMetric('In Reporting', 'indents-in-reporting', 'warning')
  ]

  const exceptionMetrics: MetricData[] = [
    makeIndentMetric('Expired', 'indents-expired', 'critical'),
    makeIndentMetric('Rejected By Transporter', 'indents-rejected-by-transporter', 'critical')
  ]

  const summaryCount = milestoneMetrics.reduce((sum, metric) => sum + metric.count, 0)
  const summaryMissing = milestoneMetrics.every(metric => metric.isMissing)

  metrics.push({
    metricId: 'indents-summary',
    label: 'Total',
    count: summaryCount,
    statusType: 'neutral',
    target: { path: MODULE_URLS.indents, defaultFilters: {} },
    groupKey: 'summary',
    isMissing: summaryMissing
  })
  metrics.push(...milestoneMetrics)
  exceptions.push(...exceptionMetrics)

  return {
    id: 'indents',
    title: 'Vehicle procurement',
    metrics,
    exceptions,
    status: undefined
  }
}

/**
 * Transform API response to TabData format
 */
function transformApiDataToTabData(
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
