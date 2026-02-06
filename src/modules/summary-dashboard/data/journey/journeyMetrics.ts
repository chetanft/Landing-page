import type {
  TabData,
  GlobalFilters,
  JourneyMilestoneKey,
  JourneyApiMilestone,
  JourneySearchItem,
  JourneySearchSummary,
  EpodListApiResponse,
  EpodSummaryResult
} from './journeyTypes'
import {
  JOURNEY_STATUSES_FOR_ALERTS,
  JOURNEY_SEARCH_PAGE_SIZE,
  JOURNEY_SEARCH_STATUS_CONCURRENCY,
  JOURNEY_COUNTS_CACHE_TTL,
  buildJourneyCountsKey,
  journeyCountsCache,
  setJourneyCountsCache,
  resetJourneySearchCache,
  journeySearchCacheKey,
  setJourneySearchCacheKey,
  journeySearchAbortControllers,
  journeySearchCache,
  mergeJourneysIntoCache
} from './journeyCache'
import {
  fetchJourneySearchPage,
  fetchJourneyStatusCounts,
  buildJourneySnapshotUrl,
  fetchJourneyLoads
} from './journeyClient'
import {
  transformApiDataToTabData,
  applyEpodSummaryToJourneys,
  applyJourneySearchSummaries,
  combineJourneyAndIndentsData,
  createMissingJourneyTabData,
  getJourneySearchTotal,
  getEpodTotal
} from './journeyMapper'
import {
  fetchJourneyTrackingDetails,
  fetchJourneyAlerts,
  fetchJourneyTrackingPath,
  fetchJourneyPodSummary
} from './journeyDetails'
import { fetchIndentsCount } from '../indentsApiService'
import { buildFtTmsUrl, ftTmsFetch } from '../ftTmsClient'
import { ensureAuthReady } from '../../auth/authGate'
import { ApiError } from '../../utils/apiUtils'
import { AuthenticationError } from '../../auth/authApiService'

// Utility to run tasks with concurrency limit
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

// Prefetch journey details
const prefetchJourneyDetails = async (
  journeys: JourneySearchItem[],
  globalFilters: GlobalFilters
): Promise<void> => {
  const queue = journeys
    .map(journey => journey.journey_fteid)
    .filter((fteid): fteid is string => Boolean(fteid))

  if (queue.length === 0) return

  const JOURNEY_DETAILS_PREFETCH_CONCURRENCY = 5
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
        fetchJourneyPodSummary(journeyFteid),
        fetchJourneyLoads(journeyFteid, globalFilters)
      ])
    }
  }

  const workers = Array.from({ length: Math.min(JOURNEY_DETAILS_PREFETCH_CONCURRENCY, queue.length) }, runWorker)
  await Promise.all(workers)
}

// Fetch journey search summary
const fetchJourneySearchSummary = async (
  globalFilters: GlobalFilters,
  journeyStatus: JourneyMilestoneKey
): Promise<JourneySearchSummary | null> => {
  const searchKey = buildJourneyCountsKey(globalFilters)
  if (journeySearchCacheKey !== searchKey) {
    setJourneySearchCacheKey(searchKey)
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

// Fetch ePOD summary
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

// Fetch journey status tab data
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

// Ensure journey search data is loaded for all statuses
export const ensureJourneySearchData = async (globalFilters: GlobalFilters): Promise<void> => {
  await runWithConcurrency(JOURNEY_STATUSES_FOR_ALERTS, JOURNEY_SEARCH_STATUS_CONCURRENCY, async (status) => {
    await fetchJourneySearchSummary(globalFilters, status)
  })
}

// Get all journey search items from cache
export const getAllJourneySearchItems = (): JourneySearchItem[] => {
  const byId = new Map<string, JourneySearchItem>()
  for (const journeys of journeySearchCache.values()) {
    journeys.forEach((journey) => {
      const key = journey.journey_fteid ? String(journey.journey_fteid) : ''
      if (!key) return
      byId.set(key, journey)
    })
  }
  return Array.from(byId.values())
}

// Fetch base journey counts (no ePOD/indents) – used by multiple queries
export const fetchJourneyCounts = async (globalFilters: GlobalFilters): Promise<TabData> => {
  // Gate on auth readiness - journey API requires login token
  const authOk = await ensureAuthReady(false, 10000)
  if (!authOk) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyCounts] Auth not ready, returning missing data')
    }
    return createMissingJourneyTabData()
  }

  const cacheKey = buildJourneyCountsKey(globalFilters)
  const now = Date.now()
  if (journeyCountsCache && journeyCountsCache.key === cacheKey && now - journeyCountsCache.timestamp < JOURNEY_COUNTS_CACHE_TTL) {
    return journeyCountsCache.data
  }

  try {
    const data = await fetchJourneyMetricsFromAPI(globalFilters)
    setJourneyCountsCache({ key: cacheKey, data, timestamp: now })
    return data
  } catch (error) {
    console.warn('Failed to load journey counts:', error)
    const fallback = createMissingJourneyTabData()
    setJourneyCountsCache({ key: cacheKey, data: fallback, timestamp: now })
    return fallback
  }
}

// Fetch journey metrics from the real API with enhanced error handling
export const fetchJourneyMetrics = async (globalFilters: GlobalFilters): Promise<TabData> => {
  // Gate on auth readiness - journey API requires login token
  const authOk = await ensureAuthReady(false, 10000)
  if (!authOk) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyMetrics] Auth not ready, returning missing data')
    }
    return createMissingJourneyTabData()
  }

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

// Fetch journey counts (no search/list calls) to render counts quickly
export const fetchJourneyCountsOnly = async (globalFilters: GlobalFilters): Promise<TabData> => {
  // Gate on auth readiness - journey API requires login token
  const authOk = await ensureAuthReady(false, 10000)
  if (!authOk) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyCountsOnly] Auth not ready, returning missing data')
    }
    return createMissingJourneyTabData()
  }

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

// Real API call implementation
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
