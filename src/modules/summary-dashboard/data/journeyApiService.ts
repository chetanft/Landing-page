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

// Map API milestones to lifecycle stages
const MILESTONE_TO_STAGE_MAPPING = {
  BEFORE_ORIGIN: {
    title: 'En Route to Loading',
    id: 'en-route-loading'
  },
  AT_ORIGIN: {
    title: 'At Loading Point',
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
    title: 'Return Journey',
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

/**
 * Fetch journey metrics from the real API with enhanced error handling
 */
export const fetchJourneyMetrics = async (globalFilters: GlobalFilters): Promise<TabData> => {
  // Always fetch both journey data and indents data in parallel
  const [epodSummary, journeyData, indentsData] = await Promise.all([
    fetchJourneyEpodSummary(),
    fetchJourneyMetricsFromAPI(globalFilters),
    fetchIndentsCount(globalFilters)
  ])

  // Combine indents data with journey data
  const withEpod = applyEpodSummaryToJourneys(journeyData, epodSummary)
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

const fetchJourneyEpodSummary = async (): Promise<EpodSummary> => {
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
      awaitingApproval: safeTotal(awaitingApprovalRes),
      pendingSubmission: safeTotal(pendingSubmissionRes),
      verifiedRejected: safeTotal(verifiedRejectedRes),
      approved: safeTotal(approvedRes),
      deliveredClean: safeTotal(deliveredCleanRes),
      deliveredUnclean: safeTotal(deliveredUncleanRes)
    }
  } catch (error) {
    console.warn('Failed to fetch ePOD summary:', error)
    return {
      awaitingApproval: 0,
      pendingSubmission: 0,
      verifiedRejected: 0,
      approved: 0,
      deliveredClean: 0,
      deliveredUnclean: 0
    }
  }
}

const applyEpodSummaryToJourneys = (journeyData: TabData, epodSummary: EpodSummary): TabData => {
  const updatedStages = journeyData.lifecycleStages.map(stage => {
    if (stage.id !== 'delivered') return stage

    const status = [...(stage.status ?? [])]
    if (epodSummary.deliveredClean > 0) {
      status.push({
        metricId: 'delivered-epod-clean',
        label: 'Clean Delivery',
        count: epodSummary.deliveredClean,
        statusType: 'positive',
        target: { path: `/journeys/${stage.id}`, defaultFilters: { delivery_status: 'VERIFIED_AS_SUCCESSFULLY_DELIVERED' } }
      })
    }
    if (epodSummary.deliveredUnclean > 0) {
      status.push({
        metricId: 'delivered-epod-unclean',
        label: 'Delivery With Issues',
        count: epodSummary.deliveredUnclean,
        statusType: 'warning',
        target: { path: `/journeys/${stage.id}`, defaultFilters: { delivery_status: 'VERIFIED_AS_DELIVERED_WITH_ISSUES' } }
      })
    }
    if (epodSummary.awaitingApproval > 0) {
      status.push({
        metricId: 'delivered-epod-approval-pending',
        label: 'ePOD Approval Pending',
        count: epodSummary.awaitingApproval,
        statusType: 'warning',
        target: { path: `/journeys/${stage.id}`, defaultFilters: { epod_status: 'AWAITING_APPROVAL' } }
      })
    }
    if (epodSummary.pendingSubmission > 0) {
      status.push({
        metricId: 'delivered-epod-pending-submission',
        label: 'ePOD Pending Submission',
        count: epodSummary.pendingSubmission,
        statusType: 'critical',
        target: { path: `/journeys/${stage.id}`, defaultFilters: { epod_status: 'PENDING_SUBMISSION' } }
      })
    }
    if (epodSummary.approved > 0) {
      status.push({
        metricId: 'delivered-epod-approved',
        label: 'ePOD Approved',
        count: epodSummary.approved,
        statusType: 'positive',
        target: { path: `/journeys/${stage.id}`, defaultFilters: { epod_status: 'APPROVED' } }
      })
    }
    if (epodSummary.verifiedRejected > 0) {
      status.push({
        metricId: 'delivered-epod-rejected',
        label: 'ePOD Rejected',
        count: epodSummary.verifiedRejected,
        statusType: 'critical',
        target: { path: `/journeys/${stage.id}`, defaultFilters: { epod_status: 'VERIFIED_AS_REJECTED' } }
      })
    }

    return { ...stage, status }
  })

  return { ...journeyData, lifecycleStages: updatedStages }
}

/**
 * Real API call implementation - Now activated
 */
export const fetchJourneyMetricsFromAPI = async (globalFilters: GlobalFilters): Promise<TabData> => {
  const baseUrl = buildFtTmsUrl('/api/journey-snapshot/v1/journeys/count')
  const isLocalOnly = import.meta.env.DEV

  // Format dates for the API (match FT app format exactly)
  // FT app uses: start at 18:30:00, end at 18:29:59 of the selected dates
  const formatDateForApi = (date: Date, isEnd: boolean = false): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    // Match FT app: start uses 18:30:00, end uses 18:29:59
    const hours = isEnd ? '18' : '18'
    const minutes = isEnd ? '29' : '30'
    const seconds = isEnd ? '59' : '00'
    return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`
  }
  
  const startTime = formatDateForApi(globalFilters.dateRange.start, false)
  const endTime = formatDateForApi(globalFilters.dateRange.end, true)

  const params = new URLSearchParams({
    page: '1',
    size: '20',
    entity_type: 'CNR',
    journey_status: 'IN_TRANSIT', // Match FT app behavior
    start_time_utc: startTime,
    end_time_utc: endTime,
    journey_direction: 'outbound',
    journey_stop_type: 'source',
    'sort[sort_by]': 'created_at',
    'sort[sort_by_order]': 'DESC'
  })

  // Add location filter if specified
  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }

  // Add transporter filter if specified
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }

  if (globalFilters.consigneeId) {
    params.append('consignee_fteid', globalFilters.consigneeId)
  }

  // Add milestones as array parameters (include PLANNED to match FT app behavior)
  const milestones = ['PLANNED', 'BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION', 'IN_RETURN', 'AFTER_DESTINATION', 'CLOSED']
  milestones.forEach(milestone => {
    params.append('milestones[]', milestone)
  })

  // Add active alerts as array parameters (these are the exceptions/alerts)
  const activeAlerts = ['long_stoppage', 'route_deviation', 'eway_bill']
  activeAlerts.forEach(alert => {
    params.append('active_alerts[]', alert)
  })

  // Add active analytics as array parameters (match FT app - exclude epod_status)
  const activeAnalytics = ['delay_in_minutes', 'expected_arrival']
  activeAnalytics.forEach(analytic => {
    params.append('active_analytics[]', analytic)
  })

  try {
    const token = TokenManager.getAccessToken()
    if (!token) {
      throw new AuthenticationError('No access token available for journey snapshot')
    }

    const userContext = TokenManager.getUserContext()
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    if (userContext?.orgId) {
      headers['X-FT-ORGID'] = userContext.orgId
    }
    if (userContext?.userId) {
      headers['X-FT-USERID'] = userContext.userId
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers,
      credentials: 'include'
    })
    const data: JourneyApiResponse = await response.json()
    if (isLocalOnly) {
      console.log('[FT TMS] journeys/count raw response:', data)
    }

    if (!data.success) {
      throw new ApiError(
        data.message || 'API returned failure status',
        response.status,
        response.statusText,
        baseUrl
      )
    }

    return transformApiDataToTabData(data)
  } catch (error) {
    // Enhanced error handling with specific error types
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
        baseUrl
      )
    }

    // Unknown error type
    console.error('Unknown error while fetching journey metrics:', error)
    throw new ApiError(
      'An unexpected error occurred',
      500,
      'Unknown Error',
      baseUrl
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

  // Process each indent status
  indentsData.forEach(item => {
    const statusType = getIndentStatusType(item.key)

    // Only add to main metrics (milestones) if it's not an exception status
    const isExceptionStatus = ['EXPIRED', 'CANCELLED', 'REJECTED', 'REJECTED_BY_TRANSPORTER', 'APPROVAL_REJECTION'].includes(item.key)
    
    if (!isExceptionStatus) {
      metrics.push({
        metricId: `indents-${item.key.toLowerCase()}`,
        label: item.text,
        count: item.count,
        statusType,
        target: { path: `/indents/${item.key.toLowerCase()}`, defaultFilters: {} }
      })
    }

    // Add child items as sub-metrics if they exist
    if (item.child && item.child.length > 0) {
      item.child.forEach((childItem: any) => {
        // Child items follow the same logic - only add to milestones if not an exception status
        const isChildExceptionStatus = ['EXPIRED', 'CANCELLED', 'REJECTED', 'REJECTED_BY_TRANSPORTER', 'APPROVAL_REJECTION'].includes(childItem.key)
        
        if (!isChildExceptionStatus) {
          metrics.push({
            metricId: `indents-${childItem.key.toLowerCase()}`,
            label: `  ${childItem.text}`, // Indent the label to show hierarchy
            count: childItem.count,
            statusType: getIndentStatusType(childItem.key),
            target: { path: `/indents/${childItem.key.toLowerCase()}`, defaultFilters: {} }
          })
        }

        // Check for overdue items as exceptions
        if (childItem.overdue && childItem.overdue > 0) {
          exceptions.push({
            metricId: `indents-${childItem.key.toLowerCase()}-overdue`,
            label: `${childItem.text} (Overdue)`,
            count: childItem.overdue,
            statusType: 'critical',
            target: { path: `/indents/${childItem.key.toLowerCase()}`, defaultFilters: { overdue: true } }
          })
        }
      })
    }

    // Add specific exceptions for certain statuses
    if (isExceptionStatus && item.count > 0) {
      exceptions.push({
        metricId: `indents-${item.key.toLowerCase()}-exception`,
        label: item.text,
        count: item.count,
        statusType: 'critical',
        target: { path: `/indents/${item.key.toLowerCase()}`, defaultFilters: {} }
      })
    }
  })

  return {
    id: 'indents',
    title: 'Indents',
    metrics,
    exceptions: exceptions.length > 0 ? exceptions : undefined,
    status: undefined
  }
}

/**
 * Get status type for indent status
 */
function getIndentStatusType(key: string): 'positive' | 'warning' | 'critical' | 'neutral' {
  switch (key) {
    case 'OPEN':
    case 'COMPLETELY_CLOSED':
    case 'PARTIALLY_CLOSED':
      return 'positive'
    case 'PENDING_APPROVAL':
    case 'TRANSPORTER_SELECTION_PENDING':
    case 'VEHICLE_PLACEMENT_IN_PROGRESS':
    case 'VEHICLE_REPORTING_IN_PROGRESS':
      return 'warning'
    case 'EXPIRED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'REJECTED_BY_TRANSPORTER':
    case 'APPROVAL_REJECTION':
      return 'critical'
    default:
      return 'neutral'
  }
}

/**
 * Transform API response to TabData format
 */
function transformApiDataToTabData(apiResponse: JourneyApiResponse): TabData {
  const { milestone } = apiResponse.data
  const getMilestone = (key: JourneyMilestoneKey): JourneyApiMilestone =>
    milestone[key] ?? { count: 0, alerts: {}, analytics: {} }
  const getMilestoneCount = (key: JourneyMilestoneKey) => getMilestone(key).count

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
    combinedData: JourneyApiMilestone
  }>()

  Object.entries(MILESTONE_TO_STAGE_MAPPING).forEach(([milestoneKey, stageInfo]) => {
    const milestoneData = getMilestone(milestoneKey as JourneyMilestoneKey)

    if (processedMilestones.has(stageInfo.id)) {
      // Combine with existing stage (for Delivered combining AFTER_DESTINATION + CLOSED)
      const existing = processedMilestones.get(stageInfo.id)!
      existing.totalCount += milestoneData.count
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
        combinedData: { ...milestoneData }
      })
    }
  })

  // Transform processed milestones to lifecycle stages
  const lifecycleStages: LifecycleStage[] = Array.from(processedMilestones.values()).map(
    ({ stageInfo, totalCount, combinedData }) => {
      // Create main metrics for each stage
      const metrics: MetricData[] = []
      const status: MetricData[] = []

      // Add expected arrival metrics as milestone metrics
      if (combinedData.analytics.expected_arrival) {
        const arrivalData = combinedData.analytics.expected_arrival
        const timeBuckets = arrivalData.time_bucket

        if (timeBuckets['0-12h'] > 0) {
          metrics.push({
            metricId: `${stageInfo.id}-arrival-soon`,
            label: 'Arriving Soon',
            count: timeBuckets['0-12h'],
            statusType: 'positive',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { arrival: '0-12h' } }
          })
        }

        if (timeBuckets['12h'] > 0) {
          metrics.push({
            metricId: `${stageInfo.id}-arrival-later`,
            label: 'Arriving Later',
            count: timeBuckets['12h'],
            statusType: 'neutral',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { arrival: '12h+' } }
          })
        }
      } else if (totalCount > 0) {
        // If no expected arrival breakdown, show total count as single milestone
        metrics.push({
          metricId: `${stageInfo.id}-count`,
          label: stageInfo.title,
          count: totalCount,
          statusType: 'neutral',
          target: { path: `/journeys/${stageInfo.id}`, defaultFilters: {} }
        })
      }

      // Add delay analytics as status metrics if available
      if (combinedData.analytics.delay_in_minutes) {
        const delayData = combinedData.analytics.delay_in_minutes
        const timeBuckets = delayData.time_bucket

        const onTimeCount = timeBuckets['0-6h'] || 0
        const delayedCount = (timeBuckets['6-12h'] || 0) + (timeBuckets['12h'] || 0)

        if (onTimeCount > 0) {
          status.push({
            metricId: `${stageInfo.id}-delay-0-6h`,
            label: 'On Time',
            count: onTimeCount,
            statusType: 'positive',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { delay: '0-6h' } }
          })
        }

        if (delayedCount > 0) {
          status.push({
            metricId: `${stageInfo.id}-delay-6h-plus`,
            label: 'Delayed',
            count: delayedCount,
            statusType: 'warning',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { delay: '6h+' } }
          })
        }
      }

      // Add ePOD status metrics to status array if available (only for delivered journeys)
      if (combinedData.analytics?.epod_status && stageInfo.id === 'delivered') {
        const epodData = combinedData.analytics.epod_status
        const statusBuckets = epodData.time_bucket || {}

        // Add ePOD status metrics to status array
        if ((statusBuckets.verified_as_clean || 0) > 0) {
          status.push({
            metricId: `${stageInfo.id}-epod-verified-clean`,
            label: 'ePOD Clean',
            count: statusBuckets.verified_as_clean || 0,
            statusType: 'positive',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { epod_status: 'verified_as_clean' } }
          })
        }

        if ((statusBuckets.verified_as_unclean || 0) > 0) {
          status.push({
            metricId: `${stageInfo.id}-epod-verified-unclean`,
            label: 'ePOD Unclean',
            count: statusBuckets.verified_as_unclean || 0,
            statusType: 'warning',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { epod_status: 'verified_as_unclean' } }
          })
        }

        if ((statusBuckets.approval_pending || 0) > 0) {
          status.push({
            metricId: `${stageInfo.id}-epod-approval-pending`,
            label: 'ePOD Approval Pending',
            count: statusBuckets.approval_pending || 0,
            statusType: 'warning',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { epod_status: 'approval_pending' } }
          })
        }

        if ((statusBuckets.pending_submission || 0) > 0) {
          status.push({
            metricId: `${stageInfo.id}-epod-pending-submission`,
            label: 'ePOD Pending',
            count: statusBuckets.pending_submission || 0,
            statusType: 'critical',
            target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { epod_status: 'pending_submission' } }
          })
        }
      }

      // Create exceptions from alerts
      const exceptions: MetricData[] = []
      if (combinedData.alerts.long_stoppage?.count) {
        exceptions.push({
          metricId: `${stageInfo.id}-long-stoppage`,
          label: 'Long Stoppage',
          count: combinedData.alerts.long_stoppage.count,
          statusType: 'critical',
          target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { alert: 'long_stoppage' } }
        })
      }

      if (combinedData.alerts.route_deviation?.count) {
        exceptions.push({
          metricId: `${stageInfo.id}-route-deviation`,
          label: 'Route Deviation',
          count: combinedData.alerts.route_deviation.count,
          statusType: 'critical',
          target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { alert: 'route_deviation' } }
        })
      }

      if (combinedData.alerts.eway_bill?.count) {
        exceptions.push({
          metricId: `${stageInfo.id}-eway-bill`,
          label: 'E-way Bill Issues',
          count: combinedData.alerts.eway_bill.count,
          statusType: 'critical',
          target: { path: `/journeys/${stageInfo.id}`, defaultFilters: { alert: 'eway_bill' } }
        })
      }

      return {
        id: stageInfo.id,
        title: stageInfo.title,
        metrics,
        exceptions: exceptions.length > 0 ? exceptions : undefined,
        status: status.length > 0 ? status : undefined
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
