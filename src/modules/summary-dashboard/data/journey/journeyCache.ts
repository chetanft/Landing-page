import type {
  JourneyMilestoneKey,
  JourneySearchItem,
  JourneyLoadsResponse,
  GlobalFilters,
  TabData
} from './journeyTypes'

// Constants
export const JOURNEY_STATUSES_FOR_ALERTS: JourneyMilestoneKey[] = [
  'PLANNED',
  'BEFORE_ORIGIN',
  'AT_ORIGIN',
  'IN_TRANSIT',
  'AT_DESTINATION',
  'IN_RETURN',
  'AFTER_DESTINATION',
  'CLOSED'
]

export const JOURNEY_SEARCH_PAGE_SIZE = 20
export const JOURNEY_DETAILS_PREFETCH_CONCURRENCY = 5
export const JOURNEY_SEARCH_STATUS_CONCURRENCY = 2
export const JOURNEY_COUNTS_CACHE_TTL = 30 * 1000

// Cache variables
export const journeySearchCache = new Map<JourneyMilestoneKey, JourneySearchItem[]>()
export const journeySearchSubscribers = new Set<() => void>()
export const journeySearchAbortControllers = new Map<JourneyMilestoneKey, AbortController>()
export let journeySearchCacheKey: string | null = null
export const journeyLoadsCache = new Map<string, JourneyLoadsResponse>()
export const journeyTrackingDetailsCache = new Map<string, any>()
export const journeyAlertsCache = new Map<string, any>()
export const journeyTrackingPathCache = new Map<string, any[]>()
export const journeyPodSummaryCache = new Map<string, any>()

export let journeyCountsCache: { key: string; data: TabData; timestamp: number } | null = null

// Cache key builder
export const buildJourneyCountsKey = (globalFilters: GlobalFilters): string => {
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

// Subscriber notification
export const notifyJourneySearchUpdate = () => {
  journeySearchSubscribers.forEach((callback) => callback())
}

// Reset search cache
export const resetJourneySearchCache = () => {
  journeySearchCache.clear()
  notifyJourneySearchUpdate()
}

// Subscribe to cache updates
export const subscribeToJourneySearchUpdates = (callback: () => void): (() => void) => {
  journeySearchSubscribers.add(callback)
  return () => {
    journeySearchSubscribers.delete(callback)
  }
}

// Merge journeys into cache
export const mergeJourneysIntoCache = (journeyStatus: JourneyMilestoneKey, journeys: JourneySearchItem[]) => {
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

// Cache key setter (for journeySearchCacheKey)
export const setJourneySearchCacheKey = (key: string | null) => {
  journeySearchCacheKey = key
}

// Journey counts cache setter
export const setJourneyCountsCache = (cache: { key: string; data: TabData; timestamp: number } | null) => {
  journeyCountsCache = cache
}
