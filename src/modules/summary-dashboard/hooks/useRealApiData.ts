import { useQuery } from '@tanstack/react-query'
import { realApiService, computeMetricsFromApiData } from '../data/realApiService'
import { JOURNEY_COUNT_ONLY_MODE } from '../config/apiMode'

// Hook for user settings
export const useUserSettings = () => {
  return useQuery({
    queryKey: ['userSettings'],
    queryFn: realApiService.getUserSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for order status counts
export const useOrderStatusCounts = (branchFteid: string) => {
  return useQuery({
    queryKey: ['orderStatusCounts', branchFteid],
    queryFn: () => realApiService.getOrderStatusCounts(branchFteid),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 2,
    enabled: !!branchFteid && !JOURNEY_COUNT_ONLY_MODE
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
  return useQuery({
    queryKey: ['customDataTemplate', entity],
    queryFn: () => realApiService.getCustomDataTemplate(entity),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    enabled: !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for batch data
export const useBatchData = (page: number = 1, pageSize: number = 10) => {
  return useQuery({
    queryKey: ['batchData', page, pageSize],
    queryFn: () => realApiService.searchBatches(page, pageSize),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    enabled: !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for company hierarchy
export const useCompanyHierarchy = () => {
  return useQuery({
    queryKey: ['companyHierarchy'],
    queryFn: realApiService.getCompanyHierarchy,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    enabled: !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for permissions
export const useAccessPermissions = () => {
  return useQuery({
    queryKey: ['accessPermissions'],
    queryFn: realApiService.getPermissions,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    enabled: !JOURNEY_COUNT_ONLY_MODE
  })
}

// Hook for selected orders views
export const useSelectedOrdersViews = () => {
  return useQuery({
    queryKey: ['selectedOrdersViews'],
    queryFn: realApiService.getSelectedOrdersViews,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    enabled: !JOURNEY_COUNT_ONLY_MODE
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
