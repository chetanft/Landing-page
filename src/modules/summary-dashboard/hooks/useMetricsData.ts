import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { TabId, TabData, GlobalFilters } from '../types/metrics'
import { fetchTabCounts, fetchTabMetrics } from '../data/metricsService'
import { isAuthError } from '../utils/apiUtils'
import { useAuth } from '../auth/AuthContext'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const REFETCH_INTERVAL = 0 // disabled to avoid periodic refetch
const GC_TIME = 10 * 60 * 1000 // keep cache 10 minutes

interface UseMetricsDataResult {
  tabData: TabData | null
  countsData: TabData | null
  countsLoading: boolean
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
  const { isAuthenticated } = useAuth()

  const countsQuery = useQuery({
    queryKey: [
      'metrics-counts',
      tab,
      globalFilters.locationId,
      globalFilters.transporterId,
      globalFilters.priority?.slice().sort().join(',') ?? '',
      globalFilters.dateRange.start.toISOString(),
      globalFilters.dateRange.end.toISOString()
    ],
    queryFn: async () => {
      try {
        return await fetchTabCounts(tab, globalFilters)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[useMetricsData] Counts fetch failed, returning null:', error)
        }
        return null
      }
    },
    enabled: isAuthenticated,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchInterval: REFETCH_INTERVAL || false,
    refetchOnWindowFocus: false,
    retry: false
  })

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
    enabled: isAuthenticated,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchInterval: REFETCH_INTERVAL || false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (isAuthError(error)) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Handle errors separately using useEffect
  useEffect(() => {
    const logError = (error: unknown, label: string) => {
      if (!error) return
      const err = error as Error
      if (isAuthError(err)) {
        console.warn(`${label} (auth):`, err)
      } else {
        console.error(`${label}:`, err)
      }
    }

    logError(countsQuery.error, 'Error fetching metrics counts')
    logError(query.error, 'Error fetching metrics data')
  }, [countsQuery.error, query.error])

  const refetchAll = () => {
    countsQuery.refetch()
    query.refetch()
  }

  return {
    tabData: (query.data as TabData) ?? (countsQuery.data as TabData) ?? null,
    countsData: (countsQuery.data as TabData) ?? null,
    countsLoading: countsQuery.isLoading,
    isLoading: !countsQuery.data && countsQuery.isLoading,
    error: query.error
      ? (query.error as Error).message
      : null,
    refetch: refetchAll,
    isAuthenticated,
    requiresAuth: !isAuthenticated
  }
}

