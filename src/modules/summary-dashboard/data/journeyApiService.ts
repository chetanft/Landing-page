import type { TabData, MetricData, LifecycleStage, GlobalFilters } from '../types/metrics'
import { ApiError } from '../utils/apiUtils'
import { AuthenticationError } from '../auth/authApiService'
import { fetchIndentsCount } from './indentsApiService'
import { MODULE_URLS } from '../config/moduleNavigation'
import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { TokenManager } from '../auth/tokenManager'

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

interface JourneySearchItem {
  journey_status?: string
  journey_fteid?: string
  pickups?: unknown[]
  drops?: unknown[]
  [key: string]: unknown
}

interface JourneySearchResponse {
  success: boolean
  data?: {
    journey_data?: JourneySearchItem[]
    pagination?: {
      totalItems?: number
      total?: number
      total_count?: number
      total_records?: number
    }
  }
  pagination?: {
    totalItems?: number
    total?: number
    total_count?: number
    total_records?: number
  }
}

interface JourneySearchSummary {
  status: JourneyMilestoneKey
  total: number
  atDrop: number
  atPickup: number
  atDropPickup: number
  isComplete: boolean
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

const JOURNEY_SEARCH_PAGE_SIZE = 20
const JOURNEY_DETAILS_PREFETCH_CONCURRENCY = 5
const JOURNEY_SEARCH_STATUS_CONCURRENCY = 2
const journeySearchCache = new Map<JourneyMilestoneKey, JourneySearchItem[]>()
const journeySearchSubscribers = new Set<() => void>()
const journeySearchAbortControllers = new Map<JourneyMilestoneKey, AbortController>()
let journeySearchCacheKey: string | null = null
const journeyTrackingDetailsCache = new Map<string, any>()
const journeyAlertsCache = new Map<string, any>()
const journeyTrackingPathCache = new Map<string, any[]>()
const journeyPodSummaryCache = new Map<string, any>()

const JOURNEY_COUNTS_CACHE_TTL = 30 * 1000
let journeyCountsCache: { key: string; data: TabData; timestamp: number } | null = null

const buildJourneyCountsKey = (globalFilters: GlobalFilters): string => {
  const parts = [
    globalFilters.locationId ?? '__ALL__',
    globalFilters.transporterId ?? '__ALL__',
    globalFilters.consigneeId ?? '__ALL__',
    globalFilters.dateRange.start.toISOString(),
    globalFilters.dateRange.end.toISOString(),
    (globalFilters.priority ?? []).join(',')
  ]
  return parts.join('|')
}

const resetJourneySearchCache = () => {
  journeySearchCache.clear()
  notifyJourneySearchUpdate()
}

export const subscribeToJourneySearchUpdates = (callback: () => void): (() => void) => {
  journeySearchSubscribers.add(callback)
  return () => {
    journeySearchSubscribers.delete(callback)
  }
}

const notifyJourneySearchUpdate = () => {
  journeySearchSubscribers.forEach((callback) => callback())
}

const runWithConcurrency = async <T,>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> => {
  if (items.length === 0) return
  let index = 0
  const run = async () => {
    while (index < items.length) {
      const current = index
      index += 1
      await worker(items[current])
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, run)
  await Promise.all(workers)
}

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

const buildJourneySearchUrl = (
  globalFilters: GlobalFilters,
  journeyStatus: string,
  page: number,
  size: number
): string => {
  const baseUrl = buildFtTmsUrl('/api/journey-snapshot/v1/journeys/search')
  const startTime = formatDateForApi(globalFilters.dateRange.start, false)
  const endTime = formatDateForApi(globalFilters.dateRange.end, true)

  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
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

const buildJourneyDetailsUrl = (journeyFteid: string, path: string, globalFilters: GlobalFilters): string => {
  const baseUrl = buildFtTmsUrl(`/api/journey-snapshot/v1/journeys/${journeyFteid}/${path}`)
  const params = new URLSearchParams({
    entity_type: 'CNR',
    journey_stop_type: 'source',
    journey_direction: 'outbound'
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

  return `${baseUrl}?${params.toString()}`
}

const buildJourneyPodSummaryUrl = (journeyFteid: string): string => {
  return buildFtTmsUrl(`/api/epod-service-v2/v1/journey-fte/pod-summary/journey_fteid/${journeyFteid}`)
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

const getJourneySearchTotal = (response: JourneySearchResponse): number => {
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

const mergeJourneysIntoCache = (journeyStatus: JourneyMilestoneKey, journeys: JourneySearchItem[]) => {
  if (journeys.length === 0) return
  const existing = journeySearchCache.get(journeyStatus) ?? []
  if (existing.length === 0) {
    journeySearchCache.set(journeyStatus, journeys)
    notifyJourneySearchUpdate()
    return
  }

  const byId = new Map<string, JourneySearchItem>()
  existing.forEach(item => {
    if (item.journey_fteid) byId.set(item.journey_fteid, item)
  })
  journeys.forEach(item => {
    if (item.journey_fteid) {
      byId.set(item.journey_fteid, item)
    } else {
      existing.push(item)
    }
  })

  journeySearchCache.set(journeyStatus, Array.from(byId.values()))
  notifyJourneySearchUpdate()
}

const fetchJourneySearchPage = async (
  globalFilters: GlobalFilters,
  journeyStatus: JourneyMilestoneKey,
  page: number,
  signal?: AbortSignal
): Promise<JourneySearchResponse | null> => {
  const headers = buildJourneyRequestHeaders()
  const url = buildJourneySearchUrl(globalFilters, journeyStatus, page, JOURNEY_SEARCH_PAGE_SIZE)
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
    signal
  })
  const data: JourneySearchResponse = await response.json()
  if (!data.success) {
    return null
  }
  return data
}

const fetchJourneySearchSummary = async (
  globalFilters: GlobalFilters,
  journeyStatus: JourneyMilestoneKey
): Promise<JourneySearchSummary | null> => {
  const searchKey = buildJourneyCountsKey(globalFilters)
  if (journeySearchCacheKey !== searchKey) {
    journeySearchCacheKey = searchKey
    journeySearchAbortControllers.forEach((controller) => controller.abort())
    journeySearchAbortControllers.clear()
    resetJourneySearchCache()
  }

  const existingController = journeySearchAbortControllers.get(journeyStatus)
  if (existingController) {
    existingController.abort()
  }
  const controller = new AbortController()
  journeySearchAbortControllers.set(journeyStatus, controller)

  const data = await fetchJourneySearchPage(globalFilters, journeyStatus, 1, controller.signal)
  if (!data) {
    return null
  }

  const journeys = data.data?.journey_data ?? []
  const total = getJourneySearchTotal(data) || journeys.length
  const isComplete = total <= JOURNEY_SEARCH_PAGE_SIZE

  mergeJourneysIntoCache(journeyStatus, journeys)
  void prefetchJourneyDetails(journeys, globalFilters)

  if (!isComplete) {
    const totalPages = Math.ceil(total / JOURNEY_SEARCH_PAGE_SIZE)
    void (async () => {
      for (let page = 2; page <= totalPages; page += 1) {
        try {
          if (journeySearchCacheKey !== searchKey) return
          const nextData = await fetchJourneySearchPage(globalFilters, journeyStatus, page, controller.signal)
          if (!nextData) break
          const nextJourneys = nextData.data?.journey_data ?? []
          if (nextJourneys.length === 0) break
          mergeJourneysIntoCache(journeyStatus, nextJourneys)
          void prefetchJourneyDetails(nextJourneys, globalFilters)
        } catch (error) {
          if ((error as DOMException)?.name === 'AbortError') return
          if (import.meta.env.DEV) {
            console.warn('[fetchJourneySearchSummary] Failed to fetch page', page, error)
          }
          break
        }
      }
    })()
  }

  const atDrop = journeys.filter(item => (item.drops?.length ?? 0) > 0).length
  const atPickup = journeys.filter(item => (item.pickups?.length ?? 0) > 0).length
  const atDropPickup = journeys.filter(item => (item.drops?.length ?? 0) > 0 && (item.pickups?.length ?? 0) > 0).length

  return {
    status: journeyStatus,
    total,
    atDrop,
    atPickup,
    atDropPickup,
    isComplete
  }
}

const applyJourneySearchSummaries = (tabData: TabData, summaries: JourneySearchSummary[]): TabData => {
  const validSummaries = summaries.filter(summary => summary && summary.isComplete)
  if (validSummaries.length === 0) return tabData

  const summaryByStatus = new Map<JourneyMilestoneKey, JourneySearchSummary>()
  validSummaries.forEach(summary => {
    summaryByStatus.set(summary.status, summary)
  })

  const deliveredTotal = (summaryByStatus.get('AFTER_DESTINATION')?.total ?? 0)
    + (summaryByStatus.get('CLOSED')?.total ?? 0)
  const hasDeliveredTotal = summaryByStatus.has('AFTER_DESTINATION') || summaryByStatus.has('CLOSED')

  const updatedStages = tabData.lifecycleStages.map(stage => {
    const metrics = [...stage.metrics]
    const status = [...(stage.status ?? [])]

    const updateSummaryCount = (count: number, hasValue: boolean) => {
      const index = metrics.findIndex(item => item.groupKey === 'summary')
      if (index >= 0 && hasValue) {
        metrics[index] = { ...metrics[index], count, isMissing: false }
      }
    }

    if (stage.id === 'en-route-loading') {
      const summary = summaryByStatus.get('BEFORE_ORIGIN')
      if (summary) updateSummaryCount(summary.total, true)
    }
    if (stage.id === 'at-loading') {
      const summary = summaryByStatus.get('AT_ORIGIN')
      if (summary) updateSummaryCount(summary.total, true)
    }
    if (stage.id === 'in-transit') {
      const summary = summaryByStatus.get('IN_TRANSIT')
      if (summary) updateSummaryCount(summary.total, true)
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
    if (stage.id === 'at-destination') {
      const summary = summaryByStatus.get('AT_DESTINATION')
      if (summary) updateSummaryCount(summary.total, true)
    }
    if (stage.id === 'return-journey') {
      const summary = summaryByStatus.get('IN_RETURN')
      if (summary) updateSummaryCount(summary.total, true)
    }
    if (stage.id === 'delivered') {
      updateSummaryCount(deliveredTotal, hasDeliveredTotal)
    }

    return { ...stage, metrics, status }
  })

  return { ...tabData, lifecycleStages: updatedStages }
}

const createMissingJourneyTabData = (): TabData => {
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

const prefetchJourneyDetails = async (
  journeys: JourneySearchItem[],
  globalFilters: GlobalFilters
): Promise<void> => {
  const queue = journeys
    .map(journey => journey.journey_fteid)
    .filter((fteid): fteid is string => Boolean(fteid))

  if (queue.length === 0) return

  let index = 0
  const runWorker = async () => {
    while (index < queue.length) {
      const currentIndex = index
      index += 1
      const journeyFteid = queue[currentIndex]
      await Promise.allSettled([
        fetchJourneyTrackingDetails(journeyFteid, globalFilters),
        fetchJourneyAlerts(journeyFteid, globalFilters),
        fetchJourneyTrackingPath(journeyFteid, globalFilters),
        fetchJourneyPodSummary(journeyFteid)
      ])
    }
  }

  const workers = Array.from({ length: Math.min(JOURNEY_DETAILS_PREFETCH_CONCURRENCY, queue.length) }, runWorker)
  await Promise.all(workers)
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
      'API returned failure status',
      response.status,
      response.statusText,
      url
    )
  }

  return data
}

export const fetchJourneyTrackingDetails = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<any | null> => {
  if (journeyTrackingDetailsCache.has(journeyFteid)) {
    return journeyTrackingDetailsCache.get(journeyFteid)
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/tracking', globalFilters)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success) {
      journeyTrackingDetailsCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyTrackingDetails] Failed:', error)
    }
  }
  return null
}

export const fetchJourneyAlerts = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<any | null> => {
  if (journeyAlertsCache.has(journeyFteid)) {
    return journeyAlertsCache.get(journeyFteid)
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/alerts', globalFilters)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success) {
      journeyAlertsCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyAlerts] Failed:', error)
    }
  }
  return null
}

export const fetchJourneyTrackingPath = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<any[] | null> => {
  if (journeyTrackingPathCache.has(journeyFteid)) {
    return journeyTrackingPathCache.get(journeyFteid) || null
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/tracking/path', globalFilters)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success && Array.isArray(data.data)) {
      journeyTrackingPathCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyTrackingPath] Failed:', error)
    }
  }
  return null
}

export const fetchJourneyPodSummary = async (
  journeyFteid: string
): Promise<any | null> => {
  if (journeyPodSummaryCache.has(journeyFteid)) {
    return journeyPodSummaryCache.get(journeyFteid)
  }

  const url = buildJourneyPodSummaryUrl(journeyFteid)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success) {
      journeyPodSummaryCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyPodSummary] Failed:', error)
    }
  }
  return null
}

/**
 * Fetch base journey counts (no ePOD/indents) – used by multiple queries
 */
export const fetchJourneyCounts = async (globalFilters: GlobalFilters): Promise<TabData> => {
  const cacheKey = buildJourneyCountsKey(globalFilters)
  const now = Date.now()
  if (journeyCountsCache && journeyCountsCache.key === cacheKey && now - journeyCountsCache.timestamp < JOURNEY_COUNTS_CACHE_TTL) {
    return journeyCountsCache.data
  }

  try {
    const data = await fetchJourneyMetricsFromAPI(globalFilters)
    journeyCountsCache = { key: cacheKey, data, timestamp: now }
    return data
  } catch (error) {
    console.warn('Failed to load journey counts:', error)
    const fallback = createMissingJourneyTabData()
    journeyCountsCache = { key: cacheKey, data: fallback, timestamp: now }
    return fallback
  }
}

/**
 * Fetch journey metrics from the real API with enhanced error handling
 */
export const fetchJourneyMetrics = async (globalFilters: GlobalFilters): Promise<TabData> => {
  // Always fetch both journey data and indents data in parallel
  const [epodSummaryResult, journeyData, indentsData, searchSummaries] = await Promise.all([
    fetchJourneyEpodSummary(),
    fetchJourneyCounts(globalFilters),
    fetchIndentsCount(globalFilters),
    (async () => {
      const results: (JourneySearchSummary | null)[] = []
      await runWithConcurrency(JOURNEY_STATUSES_FOR_ALERTS, JOURNEY_SEARCH_STATUS_CONCURRENCY, async (status) => {
        const summary = await fetchJourneySearchSummary(globalFilters, status)
        results.push(summary)
      })
      return results
    })()
  ])

  // Combine indents data with journey data
  const withEpod = applyEpodSummaryToJourneys(journeyData, epodSummaryResult)
  const withSearch = applyJourneySearchSummaries(withEpod, searchSummaries.filter(Boolean) as JourneySearchSummary[])
  return combineJourneyAndIndentsData(withSearch, indentsData)
}

/**
 * Fetch journey counts (no search/list calls) to render counts quickly.
 */
export const fetchJourneyCountsOnly = async (globalFilters: GlobalFilters): Promise<TabData> => {
  const [epodResult, journeyResult, indentsResult] = await Promise.allSettled([
    fetchJourneyEpodSummary(),
    fetchJourneyCounts(globalFilters),
    fetchIndentsCount(globalFilters)
  ])

  const epodSummaryResult = epodResult.status === 'fulfilled'
    ? epodResult.value
    : {
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

  const journeyCounts = journeyResult.status === 'fulfilled'
    ? journeyResult.value
    : createMissingJourneyTabData()

  const indentsData = indentsResult.status === 'fulfilled' ? indentsResult.value : []

  const withEpod = applyEpodSummaryToJourneys(journeyCounts, epodSummaryResult)
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

async function fetchJourneyStatusTabData(globalFilters: GlobalFilters, sampleUrl: string): Promise<TabData> {
  const isLocalOnly = import.meta.env.DEV

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

  const alertOverrides: Partial<Record<JourneyMilestoneKey, { alerts?: JourneyApiMilestone['alerts']; analytics?: JourneyApiMilestone['analytics'] }>> = {}
  JOURNEY_STATUSES_FOR_ALERTS.forEach((status, index) => {
    const milestoneData = statusResponses[index].data.milestone[status]
    if (milestoneData) {
      alertOverrides[status] = {
        alerts: milestoneData.alerts,
        analytics: milestoneData.analytics
      }
    }
  })

  return transformApiDataToTabData(baseResponse, alertOverrides as Record<JourneyMilestoneKey, { alerts?: JourneyApiMilestone['alerts']; analytics?: JourneyApiMilestone['analytics'] }>)
}

/**
 * Real API call implementation - Now activated
 */
export const fetchJourneyMetricsFromAPI = async (globalFilters: GlobalFilters): Promise<TabData> => {
  const sampleUrl = buildJourneySnapshotUrl(globalFilters, 'IN_TRANSIT')

  try {
    return await fetchJourneyStatusTabData(globalFilters, sampleUrl)
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

// Map point interface for journey locations
export interface JourneyMapPoint {
  journey_fteid: string
  lat: number
  lng: number
  journey_status: string
  isDelayed?: boolean
  eta?: string
  sta?: string
  vehicle_number?: string
  tracking_health?: string
}

/**
 * Get map points for all journeys with valid coordinates
 * Encapsulates cache access and builds unified map points from cached journey data
 */
export function getJourneyMapPoints(_globalFilters: GlobalFilters): JourneyMapPoint[] {
  const mapPoints: JourneyMapPoint[] = []

  // Iterate through all journeys in search cache (all statuses)
  for (const [status, journeys] of journeySearchCache.entries()) {
    for (const journey of journeys) {
      const journeyFteid = journey.journey_fteid
      if (!journeyFteid) continue

      let lat: number | null = null
      let lng: number | null = null
      let eta: string | undefined
      let sta: string | undefined
      let vehicleNumber: string | undefined
      let trackingHealth: string | undefined
      let isDelayed = false

      // Primary source: Latest point in tracking path cache
      const trackingPath = journeyTrackingPathCache.get(journeyFteid)
      if (trackingPath && Array.isArray(trackingPath) && trackingPath.length > 0) {
        // Use first item (most recent) or item with highest device_time
        const latestPoint = trackingPath.reduce((latest, current) => {
          const latestTime = latest?.device_time || 0
          const currentTime = current?.device_time || 0
          return currentTime > latestTime ? current : latest
        }, trackingPath[0])

        if (latestPoint?.lat && latestPoint?.lng) {
          const parsedLat = parseFloat(String(latestPoint.lat))
          const parsedLng = parseFloat(String(latestPoint.lng))
          
          // Validate parsed coordinates
          if (!isNaN(parsedLat) && !isNaN(parsedLng) &&
              parsedLat >= -90 && parsedLat <= 90 &&
              parsedLng >= -180 && parsedLng <= 180 &&
              !(parsedLat === 0 && parsedLng === 0)) {
            lat = parsedLat
            lng = parsedLng
          }
        }
      }

      // Fallback: Try tracking details cache if no coordinates from path
      if (lat === null || lng === null) {
        const trackingDetails = journeyTrackingDetailsCache.get(journeyFteid)
        if (trackingDetails) {
          const detailsLat = trackingDetails.lat || trackingDetails.latitude
          const detailsLng = trackingDetails.lng || trackingDetails.longitude
          
          if (detailsLat && detailsLng) {
            const parsedLat = parseFloat(String(detailsLat))
            const parsedLng = parseFloat(String(detailsLng))
            
            // Validate parsed coordinates
            if (!isNaN(parsedLat) && !isNaN(parsedLng) &&
                parsedLat >= -90 && parsedLat <= 90 &&
                parsedLng >= -180 && parsedLng <= 180 &&
                !(parsedLat === 0 && parsedLng === 0)) {
              lat = parsedLat
              lng = parsedLng
            }
          }
        }
      }

      // Skip journeys with invalid coordinates
      if (lat === null || lng === null) {
        continue
      }

      // Extract additional data from journey or tracking details
      const trackingDetails = journeyTrackingDetailsCache.get(journeyFteid)
      if (trackingDetails) {
        eta = trackingDetails.eta || trackingDetails.expected_arrival
        sta = trackingDetails.sta || trackingDetails.scheduled_arrival
        vehicleNumber = trackingDetails.vehicle_number || trackingDetails.vehicleNumber
        trackingHealth = trackingDetails.tracking_health || trackingDetails.trackingHealth
      }

      // Also check journey data for ETA/STA/vehicle
      if (!eta && (journey as any).eta) eta = String((journey as any).eta)
      if (!sta && (journey as any).sta) sta = String((journey as any).sta)
      if (!vehicleNumber && (journey as any).vehicle_number) vehicleNumber = String((journey as any).vehicle_number)
      if (!vehicleNumber && (journey as any).vehicle_info?.vehicle_number) {
        vehicleNumber = String((journey as any).vehicle_info.vehicle_number)
      }

      const delayMinutesRaw =
        (journey as any).delay_in_minutes ??
        (journey as any).delayInMinutes ??
        trackingDetails?.delay_in_minutes ??
        trackingDetails?.delayInMinutes
      if (delayMinutesRaw !== undefined && delayMinutesRaw !== null && delayMinutesRaw !== '') {
        const parsedDelay = Number(delayMinutesRaw)
        if (!Number.isNaN(parsedDelay) && parsedDelay > 0) {
          isDelayed = true
        }
      }

      if (!isDelayed) {
        const slaStatus = (journey as any).sla?.status || (journey as any).sla_status
        if (typeof slaStatus === 'string' && slaStatus.toLowerCase().includes('delay')) {
          isDelayed = true
        }
      }

      mapPoints.push({
        journey_fteid: journeyFteid,
        lat,
        lng,
        journey_status: journey.journey_status || status,
        isDelayed,
        eta,
        sta,
        vehicle_number: vehicleNumber,
        tracking_health: trackingHealth
      })
    }
  }

  return mapPoints
}
