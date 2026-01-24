import type { TabId, TabData, MetricData, LifecycleStage, GlobalFilters } from '../types/metrics'
import { fetchJourneyMetrics } from './journeyApiService'
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

// Journey milestones for FTL orders (In Execution stage)
const journeyMilestones = [
  { key: 'PLANNED', label: 'Planned' },
  { key: 'BEFORE_ORIGIN', label: 'Before Origin' },
  { key: 'AT_ORIGIN', label: 'At Origin' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'AT_DESTINATION', label: 'At Destination' },
  { key: 'AFTER_DESTINATION', label: 'After Destination' },
]

// Shipment milestones for PTL orders (In Execution stage)
const shipmentMilestones = [
  { key: 'BOOKED', label: 'Booked' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { key: 'DELIVERED', label: 'Delivered' },
]

// Exception milestones separated by type
const ftlExceptionMilestones = [
  { key: 'CANCELLED', label: 'Journey Cancelled' },
  { key: 'ROUTE_DEVIATION', label: 'Route Deviation' },
  { key: 'VEHICLE_BREAKDOWN', label: 'Vehicle Breakdown' },
  { key: 'OTHER_FTL', label: 'Other FTL Exceptions' },
]

const ptlExceptionMilestones = [
  { key: 'DELIVERY_FAILED', label: 'Failed to Delivery' },
  { key: 'RTO', label: 'RTO' },
  { key: 'DAMAGED', label: 'Damaged' },
  { key: 'OTHER_PTL', label: 'Other PTL Exceptions' },
]

const normalizeLabel = (value: string) => value.trim().toLowerCase()

const getOrderType = (tripType: string): 'ftl' | 'ptl' | null => {
  if (tripType === 'FTL') return 'ftl'
  if (tripType === 'PTL') return 'ptl'
  if (tripType === 'Outbound') return 'ftl' // Assuming Outbound is FTL
  if (tripType === 'Inbound') return 'ptl' // Assuming Inbound is PTL
  return null
}

const resolveOrderStageId = (stage: string, status: string): string => {
  const normalizedStage = normalizeLabel(stage)
  const normalizedStatus = normalizeLabel(status)
  const lookup = `${normalizedStage} ${normalizedStatus}`

  // Exception stages (priority check first)
  if (lookup.includes('cancelled') || lookup.includes('failed') || lookup.includes('rto') || lookup.includes('return')) {
    return 'exception'
  }

  // Invoicing stage
  if (lookup.includes('reconciliation') || lookup.includes('invoice') || lookup.includes('billing') || lookup.includes('closed')) {
    return 'invoicing'
  }

  // In Execution stage (active transport/delivery)
  if (lookup.includes('transit') || lookup.includes('journey') || lookup.includes('picked') ||
      lookup.includes('delivery') || lookup.includes('unloading') || lookup.includes('assignment') ||
      lookup.includes('indent') || lookup.includes('vehicle') || lookup.includes('process') ||
      lookup.includes('delivered')) {
    return 'in_execution'
  }

  // Default to planning for new/pending orders
  return 'planning'
}

const resolveMilestoneForOrder = (orderType: 'ftl' | 'ptl', stage: string, status: string): string => {
  const normalizedStage = normalizeLabel(stage)
  const normalizedStatus = normalizeLabel(status)
  const lookup = `${normalizedStage} ${normalizedStatus}`

  if (orderType === 'ftl') {
    // Map to journey milestones
    if (lookup.includes('destination') && lookup.includes('after')) return 'AFTER_DESTINATION'
    if (lookup.includes('destination')) return 'AT_DESTINATION'
    if (lookup.includes('transit')) return 'IN_TRANSIT'
    if (lookup.includes('origin') && lookup.includes('at')) return 'AT_ORIGIN'
    if (lookup.includes('origin') || lookup.includes('assignment')) return 'BEFORE_ORIGIN'
    return 'PLANNED'
  } else {
    // Map to shipment milestones
    if (lookup.includes('delivered')) return 'DELIVERED'
    if (lookup.includes('delivery') || lookup.includes('unloading')) return 'OUT_FOR_DELIVERY'
    if (lookup.includes('transit')) return 'IN_TRANSIT'
    if (lookup.includes('picked')) return 'PICKED_UP'
    return 'BOOKED'
  }
}

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
    if (branchFteid === '__ALL__') {
      const statusResponse = await realApiService.getOrderStatusCounts()
      counts = statusResponse.data.counts
    } else {
      const statusResponse = await realApiService.getOrderStatusCounts(branchFteid)
      counts = statusResponse.data.counts
    }

    const bucketSummary = await bucketSummaryPromise
    const getCount = (value?: number) => (typeof value === 'number' ? value : 0)

    if (import.meta.env.DEV && bucketSummary) {
      console.log('[buildRealOrdersLifecycleStages] Bucket summary:', bucketSummary)
    }

    // Helper to get bucket count
    const getBucketCount = (bucketName: string): number => {
      return bucketSummary?.[bucketName] ?? 0
    }

    // Build planning metrics with bucket data
    const planningMetrics: MetricData[] = []
    
    // Add bucket-based metrics first
    if (getBucketCount('SERVICEABLE') > 0 || getBucketCount('UNSERVICEABLE') > 0 || getBucketCount('PROCESSING') > 0) {
      if (getBucketCount('SERVICEABLE') > 0) {
        planningMetrics.push({
          metricId: 'orders.planning.serviceable',
          label: 'Serviceable',
          count: getBucketCount('SERVICEABLE'),
          statusType: 'positive',
          target: { path: '/tms/orders', defaultFilters: { bucket: ['SERVICEABLE'] } },
        })
      }
      
      if (getBucketCount('UNSERVICEABLE') > 0) {
        planningMetrics.push({
          metricId: 'orders.planning.unserviceable',
          label: 'Unserviceable',
          count: getBucketCount('UNSERVICEABLE'),
          statusType: 'warning',
          target: { path: '/tms/orders', defaultFilters: { bucket: ['UNSERVICEABLE'] } },
        })
      }
      
      if (getBucketCount('PROCESSING') > 0) {
        planningMetrics.push({
          metricId: 'orders.planning.processing',
          label: 'Processing',
          count: getBucketCount('PROCESSING'),
          statusType: 'neutral',
          target: { path: '/tms/orders', defaultFilters: { bucket: ['PROCESSING'] } },
        })
      }
    }
    
    // Add traditional status-based metrics
    if (getCount(counts.UNPLANNED) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.unplanned',
        label: 'Unplanned',
        count: getCount(counts.UNPLANNED),
        statusType: 'warning',
        target: { path: '/tms/orders', defaultFilters: { status: ['UNPLANNED'] } },
      })
    }
    
    if (getCount(counts.PLANNED) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.planned',
        label: 'Planned',
        count: getCount(counts.PLANNED),
        statusType: 'positive',
        target: { path: '/tms/orders', defaultFilters: { status: ['PLANNED'] } },
      })
    }
    
    if (getCount(counts.PARTIALLY_PLANNED) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.partially_planned',
        label: 'Partially Planned',
        count: getCount(counts.PARTIALLY_PLANNED),
        statusType: 'warning',
        target: { path: '/tms/orders', defaultFilters: { status: ['PARTIALLY_PLANNED'] } },
      })
    }
    
    if (getCount(counts.VALIDATION_IN_PROGRESS) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.validation_in_progress',
        label: 'Validation In Progress',
        count: getCount(counts.VALIDATION_IN_PROGRESS),
        statusType: 'neutral',
        target: { path: '/tms/orders', defaultFilters: { status: ['VALIDATION_IN_PROGRESS'] } },
      })
    }
    
    if (getCount(counts.VALIDATION_SUCCESS) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.validation_success',
        label: 'Validation Success',
        count: getCount(counts.VALIDATION_SUCCESS),
        statusType: 'positive',
        target: { path: '/tms/orders', defaultFilters: { status: ['VALIDATION_SUCCESS'] } },
      })
    }
    
    if (getCount(counts.VALIDATION_FAILURE) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.validation_failure',
        label: 'Validation Failure',
        count: getCount(counts.VALIDATION_FAILURE),
        statusType: 'warning',
        target: { path: '/tms/orders', defaultFilters: { status: ['VALIDATION_FAILURE'] } },
      })
    }
    
    if (getCount(counts.PLANNING_CORE_FAILED) > 0) {
      planningMetrics.push({
        metricId: 'orders.planning.core_failed',
        label: 'Planning Core Failed',
        count: getCount(counts.PLANNING_CORE_FAILED),
        statusType: 'critical',
        target: { path: '/tms/orders', defaultFilters: { status: ['PLANNING_CORE_FAILED'] } },
      })
    }

    // Build in-execution metrics with bucket data
    const inExecutionMetrics: MetricData[] = []
    
    if (getBucketCount('BOOKED') > 0) {
      inExecutionMetrics.push({
        metricId: 'orders.in_execution.booked',
        label: 'Booked',
        count: getBucketCount('BOOKED'),
        statusType: 'neutral',
        target: { path: '/tms/orders', defaultFilters: { bucket: ['BOOKED'] } },
      })
    }
    
    if (getCount(counts.IN_PROGRESS) > 0) {
      inExecutionMetrics.push({
        metricId: 'orders.in_execution.in_progress',
        label: 'In Progress',
        count: getCount(counts.IN_PROGRESS),
        statusType: 'neutral',
        target: { path: '/tms/orders', defaultFilters: { status: ['IN_PROGRESS'] } },
      })
    }
    
    if (getCount(counts.DISPATCHED) > 0) {
      inExecutionMetrics.push({
        metricId: 'orders.in_execution.dispatched',
        label: 'Dispatched',
        count: getCount(counts.DISPATCHED),
        statusType: 'neutral',
        target: { path: '/tms/orders', defaultFilters: { status: ['DISPATCHED'] } },
      })
    }

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
            count: getCount(counts.DELIVERED),
            statusType: 'positive',
            target: { path: '/tms/orders', defaultFilters: { status: ['DELIVERED'] } },
          },
          {
            metricId: 'orders.delivered.partially_delivered',
            label: 'Partially Delivered',
            count: getCount(counts.PARTIALLY_DELIVERED),
            statusType: 'warning',
            target: { path: '/tms/orders', defaultFilters: { status: ['PARTIALLY_DELIVERED'] } },
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
            count: getCount(counts.DELIVERED) + getCount(counts.PARTIALLY_DELIVERED),
            statusType: 'neutral',
            target: { path: '/tms/orders', defaultFilters: { status: ['DELIVERED', 'PARTIALLY_DELIVERED'] } },
          },
        ],
      },

      // Failed Column
      {
        id: 'failed',
        title: 'Failed',
        metrics: [
          ...(getBucketCount('FAILED') > 0 ? [{
            metricId: 'orders.failed.failed_bucket',
            label: 'Failed',
            count: getBucketCount('FAILED'),
            statusType: 'critical' as const,
            target: { path: '/tms/orders', defaultFilters: { bucket: ['FAILED'] } },
          }] : []),
          ...(getBucketCount('CANCELLED') > 0 ? [{
            metricId: 'orders.failed.cancelled_bucket',
            label: 'Cancelled',
            count: getBucketCount('CANCELLED'),
            statusType: 'critical' as const,
            target: { path: '/tms/orders', defaultFilters: { bucket: ['CANCELLED'] } },
          }] : []),
          ...(getCount(counts.FAILED) > 0 ? [{
            metricId: 'orders.failed.failed',
            label: 'Failed (Status)',
            count: getCount(counts.FAILED),
            statusType: 'critical' as const,
            target: { path: '/tms/orders', defaultFilters: { status: ['FAILED'] } },
          }] : []),
        ],
        exceptions: getCount(counts.DELETED) > 0 ? [
          {
            metricId: 'orders.failed.deleted',
            label: 'Deleted',
            count: getCount(counts.DELETED),
            statusType: 'critical',
            target: { path: '/tms/orders', defaultFilters: { status: ['DELETED'] } },
          },
        ] : undefined,
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
