import { useQuery } from '@tanstack/react-query'
import { realApiService, computeMetricsFromApiData } from '../data/realApiService'
import { JOURNEY_COUNT_ONLY_MODE } from '../config/apiMode'
import { useAuth } from '../auth/AuthContext'

// Hook for user settings
export const useUserSettings = () => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['userSettings', user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: realApiService.getUserSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: isAuthenticated && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for order status counts
export const useOrderStatusCounts = (branchFteid: string) => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['orderStatusCounts', branchFteid, user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: () => realApiService.getOrderStatusCounts(branchFteid),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 2,
    enabled: isAuthenticated && !!branchFteid && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for computed metrics from order status data
export const useOrderMetrics = (branchFteid: string) => {
  const { data: statusData, ...rest } = useOrderStatusCounts(branchFteid)

  return {
    ...rest,
    data: statusData?.data?.counts ? computeMetricsFromApiData(statusData.data.counts) : null,
    rawData: statusData?.data?.counts || null
  }
}

// Hook for custom data template
export const useCustomDataTemplate = (entity: string = 'order') => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['customDataTemplate', entity, user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: () => realApiService.getCustomDataTemplate(entity),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    enabled: isAuthenticated && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for batch data
export const useBatchData = (page: number = 1, pageSize: number = 10) => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['batchData', page, pageSize, user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: () => realApiService.searchBatches({
      page,
      size: pageSize,
      group_fteid: null,
      filters: []
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    enabled: isAuthenticated && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for company hierarchy
export const useCompanyHierarchy = () => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['companyHierarchy', user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: realApiService.getCompanyHierarchy,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    enabled: isAuthenticated && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for permissions
export const useAccessPermissions = () => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['accessPermissions', user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: realApiService.getPermissions,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    enabled: isAuthenticated && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for selected orders views
export const useSelectedOrdersViews = () => {
  const { isAuthenticated, user } = useAuth()
  return useQuery({
    queryKey: ['selectedOrdersViews', user?.orgId ?? 'anon', user?.userId ?? 'anon'],
    queryFn: realApiService.getSelectedOrdersViews,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: isAuthenticated && !JOURNEY_COUNT_ONLY_MODE
  })
}

// Combined hook for dashboard overview data
export const useDashboardOverview = (branchFteid: string) => {
  const userSettings = useUserSettings()
  const orderMetrics = useOrderMetrics(branchFteid)
  const batchData = useBatchData(1, 5) // First 5 batches for overview
  const hierarchy = useCompanyHierarchy()

  return {
    userSettings,
    orderMetrics,
    batchData,
    hierarchy,
    isLoading: userSettings.isLoading || orderMetrics.isLoading || batchData.isLoading || hierarchy.isLoading,
    error: userSettings.error || orderMetrics.error || batchData.error || hierarchy.error
  }
}
