import { useQuery } from '@tanstack/react-query'
import type { TabId, TabData, GlobalFilters } from '../types/metrics'
import { fetchTabMetrics } from './metricsService'
import { isAuthError } from '../utils/apiUtils'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const REFETCH_INTERVAL = 0 // disabled to avoid periodic refetch
const GC_TIME = 10 * 60 * 1000 // keep cache 10 minutes

interface UseMetricsDataResult {
  tabData: TabData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  isAuthenticated: boolean
  requiresAuth: boolean
}

export const useMetricsData = (
  tab: TabId,
  globalFilters: GlobalFilters
): UseMetricsDataResult => {
  const isAuthenticated = true

  const query = useQuery({
    queryKey: [
      'metrics',
      tab,
      globalFilters.locationId,
      globalFilters.transporterId,
      globalFilters.priority?.slice().sort().join(',') ?? '',
      globalFilters.dateRange.start.toISOString(),
      globalFilters.dateRange.end.toISOString()
    ],
    queryFn: () => fetchTabMetrics(tab, globalFilters),
    enabled: true,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchInterval: REFETCH_INTERVAL || false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (isAuthError(error)) {
        return false
      }
      // Retry other errors up to 3 times
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    onError: (error) => {
      // Log specific error types
      if (isAuthError(error)) {
        console.warn('Authentication error in metrics query:', error)
      } else {
        console.error('Error fetching metrics data:', error)
      }
    }
  })

  return {
    tabData: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    isAuthenticated,
    requiresAuth: false
  }
}

/**
 * Hook for pre-fetching adjacent tabs
 */
export const usePrefetchTabs = (
  currentTab: TabId,
  globalFilters: GlobalFilters
) => {
  const tabs: TabId[] = ['orders', 'journeys', 'shipments', 'invoices']
  const adjacentTabs = tabs.filter((t) => t !== currentTab)

  // Pre-fetch adjacent tabs with lower priority
  adjacentTabs.forEach((tab) => {
    useQuery({
      queryKey: [
        'metrics',
        tab,
        globalFilters.locationId,
        globalFilters.priority?.slice().sort().join(',') ?? '',
        globalFilters.dateRange.start.toISOString(),
        globalFilters.dateRange.end.toISOString()
      ],
      queryFn: () => fetchTabMetrics(tab, globalFilters),
      staleTime: STALE_TIME * 2, // Longer stale time for prefetched data
      enabled: false, // Don't auto-fetch, just prepare the query
    })
  })
}
