import type { TabId, TabData, MetricData, LifecycleStage, GlobalFilters } from '../types/metrics'
import { getMetricsByTab } from './metricsRegistry'
import { mockMetricCounts, lifecycleStagesConfig, simulateApiDelay } from './mockData'
import { fetchJourneyMetrics } from './journeyApiService'
import { fetchShipmentMetrics } from './shipmentsApiService'
import { realApiService } from './realApiService'
import { fetchOrdersBucketSummary } from './ordersApiService'
import { TokenManager } from '../auth/tokenManager'
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
    // Fetch both order status counts and bucket summary in parallel
    const [statusResponse, bucketSummary] = await Promise.all([
      realApiService.getOrderStatusCounts(branchFteid),
      fetchOrdersBucketSummary(globalFilters)
    ])
    
    const counts = statusResponse.data.counts
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
  const isBranchFteid = (value?: string | null) =>
    Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))
  // Use real API for journeys tab
  if (tab === 'journeys') {
    return fetchJourneyMetrics(globalFilters)
  }

  // For orders tab, try to use real API if we have a selected branch
  if (tab === 'orders') {
    try {
      let selectedBranch = isBranchFteid(globalFilters.locationId) ? globalFilters.locationId : undefined

      if (!selectedBranch) {
        const envBranch = import.meta.env.VITE_FT_TMS_BRANCH_FTEID
        selectedBranch = isBranchFteid(envBranch) ? envBranch : undefined
      }

      if (!selectedBranch) {
        const userContext = TokenManager.getUserContext()
        selectedBranch = isBranchFteid(userContext?.branchId) ? userContext?.branchId : undefined
      }

      // If still no branch, try user settings for lastSelectedBranch
      if (!selectedBranch) {
        try {
          const userSettings = await realApiService.getUserSettings()
          const lastBranch = userSettings?.data?.lastSelectedBranch
          if (lastBranch && isBranchFteid(lastBranch)) {
            selectedBranch = lastBranch
            if (import.meta.env.DEV) {
              console.log('[fetchTabMetrics] Using lastSelectedBranch from user settings:', selectedBranch)
            }
          }
        } catch (settingsError) {
          if (import.meta.env.DEV) {
            console.warn('[fetchTabMetrics] Failed to fetch user settings:', settingsError)
          }
        }
      }

      // If still no branch, try fetching company hierarchy to get first branch
      if (!selectedBranch) {
        try {
          const hierarchy = await realApiService.getCompanyHierarchy()
          // Find first branch with BRH- prefix (skip COM- entries)
          const firstBranch = hierarchy?.data?.total_branches?.find(branch => 
            branch.fteid && isBranchFteid(branch.fteid)
          )
          if (firstBranch?.fteid) {
            selectedBranch = firstBranch.fteid
            if (import.meta.env.DEV) {
              console.log('[fetchTabMetrics] Using first branch from hierarchy:', selectedBranch, firstBranch.name)
            }
          }
        } catch (hierarchyError) {
          if (import.meta.env.DEV) {
            console.warn('[fetchTabMetrics] Failed to fetch company hierarchy:', hierarchyError)
          }
        }
      }

      if (import.meta.env.DEV) {
        console.log('[fetchTabMetrics] Orders tab - selectedBranch:', selectedBranch, {
          locationId: globalFilters.locationId,
          envBranch: import.meta.env.VITE_FT_TMS_BRANCH_FTEID,
          userBranchId: TokenManager.getUserContext()?.branchId
        })
      }

      if (selectedBranch) {
        if (import.meta.env.DEV) {
          console.log('[fetchTabMetrics] Calling planning API with branch_fteid:', selectedBranch)
        }
        const lifecycleStages = await buildRealOrdersLifecycleStages(selectedBranch, globalFilters)

        // Build quick KPIs from real data
        const quickKPIs: MetricData[] = []

        // Calculate total orders from all stages
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
      
      // No branch selected - return empty structure
      return {
        id: tab,
        label: 'Orders',
        quickKPIs: [],
        lifecycleStages: ordersLifecycleStageConfig.map((config) => ({
          id: config.id,
          title: config.title,
          metrics: [],
        })),
      }
    } catch (error) {
      console.error('Failed to fetch real orders data:', error)
      // Return empty structure on error - let dashboard handle error display
      return {
        id: tab,
        label: 'Orders',
        quickKPIs: [],
        lifecycleStages: ordersLifecycleStageConfig.map((config) => ({
          id: config.id,
          title: config.title,
          metrics: [],
        })),
      }
    }
  }

  // Use real API for shipments tab
  if (tab === 'shipments') {
    if (import.meta.env.DEV) {
      console.log('[fetchTabMetrics] Calling shipments API for tab:', tab)
    }
    return fetchShipmentMetrics(globalFilters)
  }

  // Fallback to mock data for other tabs or when real API fails
  await simulateApiDelay()
  const metrics = getMetricsByTab(tab)

  // Build quick KPIs
  const quickKPIs: MetricData[] = metrics
    .filter((m) => m.group === 'quickKPI')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((m) => ({
      metricId: m.metricId,
      label: m.title,
      count: mockMetricCounts[m.metricId] || 0,
      statusType: m.statusType || 'neutral',
      target: m.target,
    }))

  const lifecycleStages: LifecycleStage[] = (lifecycleStagesConfig[tab] || []).map((stageConfig) => {
      // Get main metrics for this stage
      const stageMetrics: MetricData[] = metrics
        .filter((m) => m.group === stageConfig.groupPrefix)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((m) => ({
          metricId: m.metricId,
          label: m.title,
          count: mockMetricCounts[m.metricId] || 0,
          statusType: m.statusType || 'neutral',
          target: m.target,
        }))

      // Get exceptions for this stage
      const exceptions: MetricData[] = metrics
        .filter((m) => m.group === `${stageConfig.groupPrefix}.exceptions`)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((m) => ({
          metricId: m.metricId,
          label: m.title,
          count: mockMetricCounts[m.metricId] || 0,
          statusType: m.statusType || 'warning',
          target: m.target,
        }))

      // Get status metrics for this stage (on time, delay)
      const status: MetricData[] = metrics
        .filter((m) => m.group === `${stageConfig.groupPrefix}.status`)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((m) => ({
          metricId: m.metricId,
          label: m.title,
          count: mockMetricCounts[m.metricId] || 0,
          statusType: m.statusType || 'neutral',
          target: m.target,
        }))

      return {
        id: stageConfig.id,
        title: stageConfig.title,
        metrics: stageMetrics.length > 0 ? stageMetrics : [], // Ensure metrics is always an array
        exceptions: exceptions.length > 0 ? exceptions : undefined,
        status: status.length > 0 ? status : undefined,
      }
    })

  return {
    id: tab,
    label: tab.charAt(0).toUpperCase() + tab.slice(1),
    quickKPIs,
    lifecycleStages,
  }
}

/**
 * Refresh a specific metric (for webhook-triggered updates)
 */
export const refreshMetric = async (metricId: string): Promise<number> => {
  await simulateApiDelay(100, 300)
  return mockMetricCounts[metricId] || 0
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
