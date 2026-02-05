import type { TabId, TabData, MetricData, LifecycleStage, GlobalFilters } from '../types/metrics'
import { fetchJourneyCounts, fetchJourneyMetrics } from './journeyApiService'
import { fetchShipmentMetrics } from './shipmentsApiService'
import { realApiService } from './realApiService'
import { fetchOrdersBucketSummary } from './ordersApiService'
import { JOURNEY_COUNT_ONLY_MODE } from '../config/apiMode'

const ordersLifecycleStageConfig = [
  { id: 'planning', title: 'Planning', stageId: 'planning' },
  { id: 'in-execution', title: 'In Execution', stageId: 'in_execution' },
  { id: 'delivered', title: 'Delivered', stageId: 'delivered' },
  { id: 'invoicing', title: 'Invoicing', stageId: 'invoicing' },
  { id: 'failed', title: 'Failed', stageId: 'failed' },
]

// Build lifecycle stages using real API data
const buildRealOrdersLifecycleStages = async (
  branchFteid: string,
  globalFilters: GlobalFilters
): Promise<LifecycleStage[]> => {
  try {
    const bucketSummaryPromise = fetchOrdersBucketSummary(globalFilters).catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('[buildRealOrdersLifecycleStages] Bucket summary failed, continuing with status counts only:', error)
      }
      return null
    })

    let counts: Record<string, number | undefined> = {}
    try {
      if (branchFteid === '__ALL__') {
        const statusResponse = await realApiService.getOrderStatusCounts()
        counts = statusResponse.data.counts
      } else {
        const statusResponse = await realApiService.getOrderStatusCounts(branchFteid)
        counts = statusResponse.data.counts
      }
    } catch (error) {
      console.warn('[buildRealOrdersLifecycleStages] Failed to fetch status counts, using missing counts:', error)
      counts = {}
    }

    const bucketSummary = await bucketSummaryPromise
    const getCountInfo = (value?: number) => ({
      count: typeof value === 'number' ? value : 0,
      isMissing: typeof value !== 'number'
    })

    if (import.meta.env.DEV && bucketSummary) {
      console.log('[buildRealOrdersLifecycleStages] Bucket summary:', bucketSummary)
    }

    // Helper to get bucket count
    const getBucketInfo = (bucketName: string): { count: number; isMissing: boolean } => {
      if (!bucketSummary) {
        return { count: 0, isMissing: true }
      }
      const value = bucketSummary[bucketName as keyof typeof bucketSummary]
      return { count: typeof value === 'number' ? value : 0, isMissing: typeof value !== 'number' }
    }

    // Build planning metrics with bucket data
    const planningMetrics: MetricData[] = []
    
    // Add bucket-based metrics first
    const serviceableInfo = getBucketInfo('SERVICEABLE')
    planningMetrics.push({
      metricId: 'orders.planning.serviceable',
      label: 'Serviceable',
      count: serviceableInfo.count,
      statusType: 'positive',
      target: { path: '/tms/orders', defaultFilters: { bucket: ['SERVICEABLE'] } },
      isMissing: serviceableInfo.isMissing
    })

    const unserviceableInfo = getBucketInfo('UNSERVICEABLE')
    planningMetrics.push({
      metricId: 'orders.planning.unserviceable',
      label: 'Unserviceable',
      count: unserviceableInfo.count,
      statusType: 'warning',
      target: { path: '/tms/orders', defaultFilters: { bucket: ['UNSERVICEABLE'] } },
      isMissing: unserviceableInfo.isMissing
    })

    const processingInfo = getBucketInfo('PROCESSING')
    planningMetrics.push({
      metricId: 'orders.planning.processing',
      label: 'Processing',
      count: processingInfo.count,
      statusType: 'neutral',
      target: { path: '/tms/orders', defaultFilters: { bucket: ['PROCESSING'] } },
      isMissing: processingInfo.isMissing
    })
    
    // Add traditional status-based metrics
    const unplannedInfo = getCountInfo(counts.UNPLANNED)
    planningMetrics.push({
      metricId: 'orders.planning.unplanned',
      label: 'Unplanned',
      count: unplannedInfo.count,
      statusType: 'warning',
      target: { path: '/tms/orders', defaultFilters: { status: ['UNPLANNED'] } },
      isMissing: unplannedInfo.isMissing
    })
    
    const plannedInfo = getCountInfo(counts.PLANNED)
    planningMetrics.push({
      metricId: 'orders.planning.planned',
      label: 'Planned',
      count: plannedInfo.count,
      statusType: 'positive',
      target: { path: '/tms/orders', defaultFilters: { status: ['PLANNED'] } },
      isMissing: plannedInfo.isMissing
    })
    
    const partiallyPlannedInfo = getCountInfo(counts.PARTIALLY_PLANNED)
    planningMetrics.push({
      metricId: 'orders.planning.partially_planned',
      label: 'Partially Planned',
      count: partiallyPlannedInfo.count,
      statusType: 'warning',
      target: { path: '/tms/orders', defaultFilters: { status: ['PARTIALLY_PLANNED'] } },
      isMissing: partiallyPlannedInfo.isMissing
    })
    
    const validationInProgressInfo = getCountInfo(counts.VALIDATION_IN_PROGRESS)
    planningMetrics.push({
      metricId: 'orders.planning.validation_in_progress',
      label: 'Validation In Progress',
      count: validationInProgressInfo.count,
      statusType: 'neutral',
      target: { path: '/tms/orders', defaultFilters: { status: ['VALIDATION_IN_PROGRESS'] } },
      isMissing: validationInProgressInfo.isMissing
    })
    
    const validationSuccessInfo = getCountInfo(counts.VALIDATION_SUCCESS)
    planningMetrics.push({
      metricId: 'orders.planning.validation_success',
      label: 'Validation Success',
      count: validationSuccessInfo.count,
      statusType: 'positive',
      target: { path: '/tms/orders', defaultFilters: { status: ['VALIDATION_SUCCESS'] } },
      isMissing: validationSuccessInfo.isMissing
    })
    
    const validationFailureInfo = getCountInfo(counts.VALIDATION_FAILURE)
    planningMetrics.push({
      metricId: 'orders.planning.validation_failure',
      label: 'Validation Failure',
      count: validationFailureInfo.count,
      statusType: 'warning',
      target: { path: '/tms/orders', defaultFilters: { status: ['VALIDATION_FAILURE'] } },
      isMissing: validationFailureInfo.isMissing
    })
    
    const planningCoreFailedInfo = getCountInfo(counts.PLANNING_CORE_FAILED)
    planningMetrics.push({
      metricId: 'orders.planning.core_failed',
      label: 'Planning Core Failed',
      count: planningCoreFailedInfo.count,
      statusType: 'critical',
      target: { path: '/tms/orders', defaultFilters: { status: ['PLANNING_CORE_FAILED'] } },
      isMissing: planningCoreFailedInfo.isMissing
    })

    // Build in-execution metrics with bucket data
    const inExecutionMetrics: MetricData[] = []
    
    const bookedInfo = getBucketInfo('BOOKED')
    inExecutionMetrics.push({
      metricId: 'orders.in_execution.booked',
      label: 'Booked',
      count: bookedInfo.count,
      statusType: 'neutral',
      target: { path: '/tms/orders', defaultFilters: { bucket: ['BOOKED'] } },
      isMissing: bookedInfo.isMissing
    })
    
    const inProgressInfo = getCountInfo(counts.IN_PROGRESS)
    inExecutionMetrics.push({
      metricId: 'orders.in_execution.in_progress',
      label: 'In Progress',
      count: inProgressInfo.count,
      statusType: 'neutral',
      target: { path: '/tms/orders', defaultFilters: { status: ['IN_PROGRESS'] } },
      isMissing: inProgressInfo.isMissing
    })
    
    const dispatchedInfo = getCountInfo(counts.DISPATCHED)
    inExecutionMetrics.push({
      metricId: 'orders.in_execution.dispatched',
      label: 'Dispatched',
      count: dispatchedInfo.count,
      statusType: 'neutral',
      target: { path: '/tms/orders', defaultFilters: { status: ['DISPATCHED'] } },
      isMissing: dispatchedInfo.isMissing
    })

    return [
      // Planning Column
      {
        id: 'planning',
        title: 'Planning',
        metrics: planningMetrics,
      },

      // In Execution Column
      {
        id: 'in-execution',
        title: 'In Execution',
        metrics: inExecutionMetrics,
      },

      // Delivered Column
      {
        id: 'delivered',
        title: 'Delivered',
        metrics: [
          {
            metricId: 'orders.delivered.delivered',
            label: 'Delivered',
            count: getCountInfo(counts.DELIVERED).count,
            statusType: 'positive',
            target: { path: '/tms/orders', defaultFilters: { status: ['DELIVERED'] } },
            isMissing: getCountInfo(counts.DELIVERED).isMissing
          },
          {
            metricId: 'orders.delivered.partially_delivered',
            label: 'Partially Delivered',
            count: getCountInfo(counts.PARTIALLY_DELIVERED).count,
            statusType: 'warning',
            target: { path: '/tms/orders', defaultFilters: { status: ['PARTIALLY_DELIVERED'] } },
            isMissing: getCountInfo(counts.PARTIALLY_DELIVERED).isMissing
          },
        ],
      },

      // Invoicing Column
      {
        id: 'invoicing',
        title: 'Invoicing',
        metrics: [
          {
            metricId: 'orders.invoicing.ready_for_invoicing',
            label: 'Ready for Invoicing',
            count: getCountInfo(counts.DELIVERED).count + getCountInfo(counts.PARTIALLY_DELIVERED).count,
            statusType: 'neutral',
            target: { path: '/tms/orders', defaultFilters: { status: ['DELIVERED', 'PARTIALLY_DELIVERED'] } },
            isMissing: getCountInfo(counts.DELIVERED).isMissing && getCountInfo(counts.PARTIALLY_DELIVERED).isMissing
          },
        ],
      },

      // Failed Column
      {
        id: 'failed',
        title: 'Failed',
        metrics: [
          {
            metricId: 'orders.failed.failed_bucket',
            label: 'Failed',
            count: getBucketInfo('FAILED').count,
            statusType: 'critical' as const,
            target: { path: '/tms/orders', defaultFilters: { bucket: ['FAILED'] } },
            isMissing: getBucketInfo('FAILED').isMissing
          },
          {
            metricId: 'orders.failed.cancelled_bucket',
            label: 'Cancelled',
            count: getBucketInfo('CANCELLED').count,
            statusType: 'critical' as const,
            target: { path: '/tms/orders', defaultFilters: { bucket: ['CANCELLED'] } },
            isMissing: getBucketInfo('CANCELLED').isMissing
          },
          {
            metricId: 'orders.failed.failed',
            label: 'Failed (Status)',
            count: getCountInfo(counts.FAILED).count,
            statusType: 'critical' as const,
            target: { path: '/tms/orders', defaultFilters: { status: ['FAILED'] } },
            isMissing: getCountInfo(counts.FAILED).isMissing
          },
        ],
        exceptions: [
          {
            metricId: 'orders.failed.deleted',
            label: 'Deleted',
            count: getCountInfo(counts.DELETED).count,
            statusType: 'critical',
            target: { path: '/tms/orders', defaultFilters: { status: ['DELETED'] } },
            isMissing: getCountInfo(counts.DELETED).isMissing
          },
        ],
      },
    ]
  } catch (error) {
    console.error('Failed to fetch real order status counts:', error)
    // Return empty lifecycle stages structure - let the dashboard handle error display
    return ordersLifecycleStageConfig.map((config) => ({
      id: config.id,
      title: config.title,
      metrics: [],
    }))
  }
}

/**
 * Fetch metrics data for a specific tab
 * Uses real API for journeys, shipments, and orders (when branch is selected)
 */
export const fetchTabMetrics = async (
  tab: TabId,
  globalFilters: GlobalFilters
): Promise<TabData> => {
  if (import.meta.env.DEV) {
    console.log('[fetchTabMetrics] Called for tab:', tab, 'JOURNEY_COUNT_ONLY_MODE:', JOURNEY_COUNT_ONLY_MODE)
  }
  // Use real API for journeys tab
  if (tab === 'journeys') {
    return fetchJourneyMetrics(globalFilters)
  }

  // For orders tab, try to use real API if we have a selected branch
  if (tab === 'orders') {
    try {
      const selectedBranch = globalFilters.locationId || undefined

      if (import.meta.env.DEV) {
        console.log('[fetchTabMetrics] Orders tab - selectedBranch:', selectedBranch, {
          locationId: globalFilters.locationId,
          envBranch: import.meta.env.VITE_FT_TMS_BRANCH_FTEID
        })
      }

      if (import.meta.env.DEV) {
        console.log('[fetchTabMetrics] Calling planning API with branch_fteid:', selectedBranch || 'ALL')
      }
      const lifecycleStages = await buildRealOrdersLifecycleStages(
        selectedBranch || '__ALL__',
        globalFilters
      )

      const quickKPIs: MetricData[] = []
      let totalOrders = 0
      lifecycleStages.forEach(stage => {
        stage.metrics.forEach(metric => {
          totalOrders += metric.count
        })
      })

      quickKPIs.push({
        metricId: 'orders.total',
        label: 'Total Orders',
        count: totalOrders,
        statusType: 'neutral',
        target: { path: '/tms/orders', defaultFilters: {} },
      })

      return {
        id: tab,
        label: 'Orders',
        quickKPIs,
        lifecycleStages,
      }
    } catch (error) {
      console.error('Failed to fetch real orders data:', error)
      throw error
    }
  }

  // Use real API for shipments tab
  if (tab === 'shipments') {
    if (import.meta.env.DEV) {
      console.log('[fetchTabMetrics] Calling shipments API for tab:', tab)
    }
    return fetchShipmentMetrics(globalFilters)
  }

  throw new Error(`No real API implementation for tab: ${tab}`)
}

/**
 * Fetch counts-only metrics for a tab (no journey search/list fetching).
 */
export const fetchTabCounts = async (
  tab: TabId,
  globalFilters: GlobalFilters
): Promise<TabData> => {
  if (tab === 'journeys') {
    return fetchJourneyCounts(globalFilters)
  }

  if (tab === 'orders') {
    const selectedBranch = globalFilters.locationId || undefined
    const lifecycleStages = await buildRealOrdersLifecycleStages(
      selectedBranch || '__ALL__',
      globalFilters
    )

    const quickKPIs: MetricData[] = []
    let totalOrders = 0
    lifecycleStages.forEach(stage => {
      stage.metrics.forEach(metric => {
        totalOrders += metric.count
      })
    })

    quickKPIs.push({
      metricId: 'orders.total',
      label: 'Total Orders',
      count: totalOrders,
      statusType: 'neutral',
      target: { path: '/tms/orders', defaultFilters: {} },
    })

    return {
      id: tab,
      label: 'Orders',
      quickKPIs,
      lifecycleStages,
    }
  }

  if (tab === 'shipments') {
    return fetchShipmentMetrics(globalFilters)
  }

  throw new Error(`No counts-only implementation for tab: ${tab}`)
}

/**
 * Refresh a specific metric (for webhook-triggered updates)
 */
export const refreshMetric = async (metricId: string): Promise<number> => {
  throw new Error(`No real API implementation for metric refresh: ${metricId}`)
}

/**
 * Fetch all tabs data (for pre-loading)
 */
export const fetchAllTabsMetrics = async (
  globalFilters: GlobalFilters
): Promise<Record<TabId, TabData>> => {
  const tabs: TabId[] = ['orders', 'journeys', 'shipments', 'invoices']
  const results = await Promise.all(
    tabs.map(async (tab) => {
      const data = await fetchTabMetrics(tab, globalFilters)
      return [tab, data] as const
    })
  )
  return Object.fromEntries(results) as Record<TabId, TabData>
}
