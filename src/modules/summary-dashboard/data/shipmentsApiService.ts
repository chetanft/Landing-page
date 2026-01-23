import type { TabData, MetricData, LifecycleStage, GlobalFilters } from '../types/metrics'
import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { fetchOrdersBucketSummary } from './ordersApiService'

// Shipments API response types
interface ShipmentMilestoneSummary {
  REGISTERED?: number
  BOOKED?: number
  PICKED_UP?: number
  IN_TRANSIT?: number
  OUT_FOR_DELIVERY?: number
  DELIVERED?: number
  UNDELIVERED?: number
  RTO?: number
  EXCEPTIONS?: number
  AWAITING_UPDATES?: number
  NO_UPDATES?: number
}

interface ShipmentSummaryApiResponse {
  success: boolean
  data: {
    bucket_summary: Record<string, any>
    milestone_summary: ShipmentMilestoneSummary
  }
}


interface ShipmentSpecificBucketSummary {
  // For ACTIVE bucket
  ofd_summary?: {
    today: string
    tomorrow: string
  }
  delayed_summary?: {
    '1 day': string
    '2-4 days': string
    '4+ days': string
  }
  // For other buckets (legacy structure)
  transit_status_summary?: {
    indeterminate: number
    delayed: number
    on_time: number
  }
  pod_summary?: {
    pod_available: string
    pod_pending: string
  }
  priority_summary?: {
    high: number
    standard: number
    low: number
  }
}

interface ShipmentListApiResponse {
  success: boolean
  data: {
    shipments: Array<{
      fteid: string
    }>
    pagination?: {
      totalItems?: number
      total?: number
      total_count?: number
    }
  }
}

interface ShipmentSpecificSummaryApiResponse {
  success: boolean
  data: ShipmentSpecificBucketSummary
}

interface ShipmentApiResponse {
  success: boolean
  data: Array<{
    shipment_id: string
    milestone: string
    booking_date: string
    status: string
    // Add other fields as needed
  }>
  pagination: {
    current: number
    last: number
    size: number
    total: number
  }
}

interface OrdersBucketSummary {
  SERVICEABLE: number
  UNSERVICEABLE: number
  PROCESSING: number
  BOOKED: number
  FAILED: number
  CANCELLED: number
}

// Map shipment milestones to lifecycle stages
const SHIPMENT_MILESTONE_MAPPING = {
  REGISTERED: {
    title: 'Registered',
    id: 'shipment-registered'
  },
  BOOKED: {
    title: 'Booked',
    id: 'shipment-booked'
  },
  PICKED_UP: {
    title: 'Picked Up',
    id: 'shipment-picked-up'
  },
  IN_TRANSIT: {
    title: 'In Transit',
    id: 'shipment-in-transit'
  },
  OUT_FOR_DELIVERY: {
    title: 'Out for Delivery',
    id: 'shipment-out-for-delivery'
  },
  DELIVERED: {
    title: 'Delivered',
    id: 'shipment-delivered'
  },
  UNDELIVERED: {
    title: 'Undelivered',
    id: 'shipment-undelivered'
  },
  RTO: {
    title: 'RTO',
    id: 'shipment-rto'
  },
  EXCEPTIONS: {
    title: 'Exceptions',
    id: 'shipment-exceptions'
  },
  AWAITING_UPDATES: {
    title: 'Awaiting Updates',
    id: 'shipment-awaiting-updates'
  },
  NO_UPDATES: {
    title: 'No Updates',
    id: 'shipment-no-updates'
  }
} as const

/**
 * Fetch shipment metrics from the PTL v2 API
 */
export const fetchShipmentMetrics = async (globalFilters: GlobalFilters): Promise<TabData> => {
  if (import.meta.env.DEV) {
    console.log('[fetchShipmentMetrics] Calling real shipments API')
  }

  return fetchShipmentMetricsFromAPI(globalFilters)
}

/**
 * Fetch specific bucket summary for a shipment milestone
 */
const fetchShipmentSpecificBucketSummary = async (
  bucketName: string,
  globalFilters: GlobalFilters
): Promise<ShipmentSpecificBucketSummary | null> => {
  try {
    const baseUrl = buildFtTmsUrl('/api/ptl-v2/api/v1/shipment/myShipmentSpecificBucketSummary')

    const fromBookingDate = globalFilters.dateRange.start.getTime()
    const toBookingDate = globalFilters.dateRange.end.getTime()

    const params = new URLSearchParams({
      bucket_name: bucketName,
      from_booking_date: fromBookingDate.toString(),
      to_booking_date: toBookingDate.toString()
    })

    // Add location filter if specified
    if (globalFilters.locationId) {
      params.append('consignor_fteid', globalFilters.locationId)
    }

    // Add transporter filter if specified
    if (globalFilters.transporterId) {
      params.append('transporter_fteid', globalFilters.transporterId)
    }

    if (globalFilters.consigneeId) {
      params.append('consignee_fteid', globalFilters.consigneeId)
    }

    // Add priority filter if specified
    if (globalFilters.priority && globalFilters.priority.length > 0) {
      globalFilters.priority.forEach((priority) => {
        params.append('priority', priority)
      })
    }

    const response = await ftTmsFetch(`${baseUrl}?${params.toString()}`)
    const data: ShipmentSpecificSummaryApiResponse = await response.json()

    if (!data.success) {
      return null
    }

    return data.data
  } catch (error) {
    console.error(`Error fetching specific bucket summary for ${bucketName}:`, error)
    return null
  }
}

/**
 * Orders bucket summary endpoint is not used for shipments metrics.
 * It returns 500 in current environment; keep integration simple.
 */

const getTotalFromShipmentList = (response: ShipmentListApiResponse): number => {
  const pagination = response.data.pagination
  if (pagination) {
    return (
      pagination.totalItems ??
      pagination.total ??
      pagination.total_count ??
      response.data.shipments.length
    )
  }
  return response.data.shipments.length
}

const fetchShipmentPodSummary = async (
  globalFilters: GlobalFilters
): Promise<{ pod_available: string; pod_pending: string } | null> => {
  try {
    const baseUrl = buildFtTmsUrl('/api/ptl-v2/api/v1/shipment/myShipments')
    const fromBookingDate = globalFilters.dateRange.start.getTime()
    const toBookingDate = globalFilters.dateRange.end.getTime()

    const makeUrl = (podStatus: 'AVAILABLE' | 'PENDING') => {
      const params = new URLSearchParams({
        page: '1',
        size: '1',
        from_booking_date: fromBookingDate.toString(),
        to_booking_date: toBookingDate.toString(),
        milestone: 'DELIVERED',
        pod_status: podStatus,
        sort_by: 'created_at',
        sort_by_order: 'DESC'
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

    const [availableResponse, pendingResponse] = await Promise.all([
      ftTmsFetch(makeUrl('AVAILABLE')),
      ftTmsFetch(makeUrl('PENDING'))
    ])

    const [availableData, pendingData] = await Promise.all([
      availableResponse.json() as Promise<ShipmentListApiResponse>,
      pendingResponse.json() as Promise<ShipmentListApiResponse>
    ])

    if (!availableData.success || !pendingData.success) {
      return null
    }

    return {
      pod_available: String(getTotalFromShipmentList(availableData)),
      pod_pending: String(getTotalFromShipmentList(pendingData))
    }
  } catch (error) {
    console.error('Error fetching shipment POD summary:', error)
    return null
  }
}

/**
 * Real shipments API implementation
 */
export const fetchShipmentMetricsFromAPI = async (globalFilters: GlobalFilters): Promise<TabData> => {
  if (!globalFilters.dateRange || !globalFilters.dateRange.start || !globalFilters.dateRange.end) {
    throw new Error('Date range is required for shipments API')
  }

  const baseUrl = buildFtTmsUrl('/api/ptl-v2/api/v1/shipment/myShipmentBucketSummary')

  // Convert dates to timestamp format (milliseconds)
  const fromBookingDate = globalFilters.dateRange.start.getTime()
  const toBookingDate = globalFilters.dateRange.end.getTime()

  const params = new URLSearchParams({
    from_booking_date: fromBookingDate.toString(),
    to_booking_date: toBookingDate.toString()
  })

  // Add location filter if specified
  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }

  // Add transporter filter if specified (PTL transporters)
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }

  if (globalFilters.consigneeId) {
    params.append('consignee_fteid', globalFilters.consigneeId)
  }

  // Add priority filter if specified
  if (globalFilters.priority && globalFilters.priority.length > 0) {
    globalFilters.priority.forEach((priority) => {
      params.append('priority', priority)
    })
  }

  const url = `${baseUrl}?${params.toString()}`
  if (import.meta.env.DEV) {
    console.log('[fetchShipmentMetricsFromAPI] Calling shipments API:', url)
  }

  try {
    // Fetch main shipment bucket summary and PTL orders bucket summary in parallel
    const [response, ordersBucketData] = await Promise.all([
      ftTmsFetch(url),
      fetchOrdersBucketSummary(globalFilters)
    ])
    
    if (import.meta.env.DEV) {
      console.log('[fetchShipmentMetricsFromAPI] Response status:', response.status)
      console.log('[fetchShipmentMetricsFromAPI] Orders bucket data:', ordersBucketData)
    }
    const data: ShipmentSummaryApiResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    // Fetch detailed analytics for supported buckets only
    // API accepts bucket_name: ACTIVE, DELIVERED
    const bucketNames = ['ACTIVE', 'DELIVERED']
    const detailedAnalytics = await Promise.all(
      bucketNames.map(async (bucketName) => {
        const analytics = await fetchShipmentSpecificBucketSummary(bucketName, globalFilters)
        return { bucketName, analytics }
      })
    )

    // Create a map for easy lookup
    // ACTIVE bucket maps to OUT_FOR_DELIVERY milestone
    const analyticsMap = new Map<string, ShipmentSpecificBucketSummary | null>()
    detailedAnalytics.forEach(({ bucketName, analytics }) => {
      if (bucketName === 'ACTIVE') {
        // Map ACTIVE bucket to OUT_FOR_DELIVERY milestone
        analyticsMap.set('OUT_FOR_DELIVERY', analytics)
      } else {
        analyticsMap.set(bucketName, analytics)
      }
    })

    const deliveredAnalytics = analyticsMap.get('DELIVERED')
    const deliveredPod = deliveredAnalytics?.pod_summary
    if (!deliveredPod) {
      const podSummary = await fetchShipmentPodSummary(globalFilters)
      if (podSummary) {
        const existing = deliveredAnalytics ?? {}
        analyticsMap.set('DELIVERED', {
          ...existing,
          pod_summary: podSummary
        })
      }
    }

    // Convert orders bucket data to OrdersBucketSummary format
    const ordersData: OrdersBucketSummary | null = ordersBucketData ? {
      SERVICEABLE: ordersBucketData.SERVICEABLE ?? 0,
      UNSERVICEABLE: ordersBucketData.UNSERVICEABLE ?? 0,
      PROCESSING: ordersBucketData.PROCESSING ?? 0,
      BOOKED: ordersBucketData.BOOKED ?? 0,
      FAILED: ordersBucketData.FAILED ?? 0,
      CANCELLED: ordersBucketData.CANCELLED ?? 0,
    } : null

    return transformShipmentDataToTabData(data, analyticsMap, ordersData, globalFilters)
  } catch (error) {
    console.error('Error fetching shipment metrics from API:', error)
    throw error
  }
}

/**
 * Create lifecycle stage for orders data
 */
function createOrdersLifecycleStage(ordersData: OrdersBucketSummary): LifecycleStage {
  const metrics: MetricData[] = []
  const exceptions: MetricData[] = []

  // Calculate total orders
  const totalOrders = Object.values(ordersData).reduce((sum, count) => sum + count, 0)

  // Add main count metric
  metrics.push({
    metricId: 'orders-total',
    label: 'Orders',
    count: totalOrders,
    statusType: 'neutral',
    target: { path: '/orders', defaultFilters: {} }
  })

  // Add metrics for different order statuses
  if (ordersData.SERVICEABLE > 0) {
    metrics.push({
      metricId: 'orders-serviceable',
      label: 'Serviceable',
      count: ordersData.SERVICEABLE,
      statusType: 'positive',
      target: { path: '/orders', defaultFilters: { status: 'serviceable' } }
    })
  }

  if (ordersData.PROCESSING > 0) {
    metrics.push({
      metricId: 'orders-processing',
      label: 'Processing',
      count: ordersData.PROCESSING,
      statusType: 'warning',
      target: { path: '/orders', defaultFilters: { status: 'processing' } }
    })
  }

  if (ordersData.BOOKED > 0) {
    metrics.push({
      metricId: 'orders-booked',
      label: 'Ready to Ship',
      count: ordersData.BOOKED,
      statusType: 'positive',
      target: { path: '/orders', defaultFilters: { status: 'booked' } }
    })
  }

  // Add problematic statuses as exceptions
  if (ordersData.UNSERVICEABLE > 0) {
    exceptions.push({
      metricId: 'orders-unserviceable',
      label: 'Unserviceable',
      count: ordersData.UNSERVICEABLE,
      statusType: 'critical',
      target: { path: '/orders', defaultFilters: { status: 'unserviceable' } }
    })
  }

  if (ordersData.FAILED > 0) {
    exceptions.push({
      metricId: 'orders-failed',
      label: 'Failed',
      count: ordersData.FAILED,
      statusType: 'critical',
      target: { path: '/orders', defaultFilters: { status: 'failed' } }
    })
  }

  if (ordersData.CANCELLED > 0) {
    exceptions.push({
      metricId: 'orders-cancelled',
      label: 'Cancelled',
      count: ordersData.CANCELLED,
      statusType: 'critical',
      target: { path: '/orders', defaultFilters: { status: 'cancelled' } }
    })
  }

  return {
    id: 'orders',
    title: 'Orders',
    metrics,
    exceptions: exceptions.length > 0 ? exceptions : undefined
  }
}

/**
 * Transform API response to TabData format
 */
function transformShipmentDataToTabData(
  apiResponse: ShipmentSummaryApiResponse,
  analyticsMap?: Map<string, ShipmentSpecificBucketSummary | null>,
  ordersData?: OrdersBucketSummary | null,
  globalFilters?: GlobalFilters
): TabData {
  const milestoneData = apiResponse.data.milestone_summary
  const priorityFilter = globalFilters?.priority
  const selectedPriorities = priorityFilter && priorityFilter.length > 0 ? priorityFilter : null

  const getMilestoneCount = (milestoneKey: keyof ShipmentMilestoneSummary): number => {
    return milestoneData[milestoneKey] ?? 0
  }

  const getPriorityCountForBucket = (bucketKey: string): number | null => {
    if (!selectedPriorities) {
      return null
    }

    const analytics = analyticsMap?.get(bucketKey)
    const prioritySummary = analytics?.priority_summary
    if (!prioritySummary) {
      return null
    }

    return selectedPriorities.reduce((sum, priority) => sum + (prioritySummary[priority] ?? 0), 0)
  }

  // Calculate quick KPIs from shipment data
  const totalShipments = Object.values(milestoneData).reduce((sum, count) => sum + (count ?? 0), 0)

  const activeShipments = getMilestoneCount('BOOKED') + 
    getMilestoneCount('PICKED_UP') + 
    getMilestoneCount('IN_TRANSIT') + 
    getMilestoneCount('OUT_FOR_DELIVERY')

  const deliveredShipments = getMilestoneCount('DELIVERED')

  const quickKPIs: MetricData[] = [
    {
      metricId: 'total-shipments',
      label: 'Total Shipments',
      count: totalShipments,
      statusType: 'neutral',
      target: { path: '/shipments', defaultFilters: {} }
    },
    {
      metricId: 'active-shipments',
      label: 'Active Shipments',
      count: activeShipments,
      statusType: 'positive',
      target: { path: '/shipments', defaultFilters: { status: 'active' } }
    },
    {
      metricId: 'delivered-shipments',
      label: 'Delivered Shipments',
      count: deliveredShipments,
      statusType: 'positive',
      target: { path: '/shipments', defaultFilters: { status: 'delivered' } }
    }
  ]

  // Transform milestones to lifecycle stages
  const exceptionRollupKeys = ['UNDELIVERED', 'RTO', 'AWAITING_UPDATES', 'NO_UPDATES'] as const

  const lifecycleStages: LifecycleStage[] = Object.entries(SHIPMENT_MILESTONE_MAPPING)
    .filter(([milestoneKey]) => milestoneData[milestoneKey as keyof ShipmentMilestoneSummary] !== undefined)
    .filter(([milestoneKey]) => !exceptionRollupKeys.includes(milestoneKey as typeof exceptionRollupKeys[number]))
    .map(([milestoneKey, stageInfo]) => {
      const milestoneCount = getMilestoneCount(milestoneKey as keyof ShipmentMilestoneSummary)

      // Create main metrics for each stage
      const metrics: MetricData[] = []

      // Create status metrics array
      const status: MetricData[] = []

      // Add detailed analytics if available
      const bucketAnalytics = analyticsMap?.get(milestoneKey)

      // Always add the main milestone count as a metric
      if (milestoneCount > 0) {
        metrics.push({
          metricId: `${stageInfo.id}-total`,
          label: 'Total',
          count: milestoneCount,
          statusType: milestoneKey === 'EXCEPTIONS' || milestoneKey === 'UNDELIVERED' ? 'critical' : 'neutral',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: {} },
          groupKey: 'summary',
          groupLabel: null,
          groupOrder: 0
        })
      }

      // Add priority metrics as milestone breakdown if available
      if (bucketAnalytics?.priority_summary) {
        const prioritySummary = bucketAnalytics.priority_summary
        const prioritiesToShow = selectedPriorities ?? ['high', 'standard', 'low']

        prioritiesToShow.forEach((priority) => {
          const count = prioritySummary[priority] ?? 0
          if (count > 0) {
            const label = `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`
            metrics.push({
              metricId: `${stageInfo.id}-priority-${priority}`,
              label,
              count,
              statusType: priority === 'high' ? 'critical' : 'neutral',
              target: {
                path: `/shipments/${stageInfo.id}`,
                defaultFilters: { priority }
              },
              groupKey: 'priority',
              groupLabel: 'Priority',
              groupOrder: 1
            })
          }
        })
      }

      if (bucketAnalytics?.pod_summary && (milestoneKey === 'DELIVERED' || milestoneKey === 'OUT_FOR_DELIVERY')) {
        // Use POD breakdown as milestone for delivered/out_for_delivery stages
        const podSummary = bucketAnalytics.pod_summary

        if (parseInt(podSummary.pod_available) > 0) {
          metrics.push({
            metricId: `${stageInfo.id}-pod-available`,
            label: 'POD Available',
            count: parseInt(podSummary.pod_available),
            statusType: 'positive',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { pod_status: 'available' } },
            groupKey: 'epod',
            groupLabel: 'ePOD',
            groupOrder: 2
          })
        }

        if (parseInt(podSummary.pod_pending) > 0) {
          metrics.push({
            metricId: `${stageInfo.id}-pod-pending`,
            label: 'POD Pending',
            count: parseInt(podSummary.pod_pending),
            statusType: 'warning',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { pod_status: 'pending' } },
            groupKey: 'epod',
            groupLabel: 'ePOD',
            groupOrder: 2
          })
        }
      }

      // Handle ACTIVE bucket analytics (for OUT_FOR_DELIVERY milestone)
      if (milestoneKey === 'OUT_FOR_DELIVERY' && bucketAnalytics?.ofd_summary) {
        const ofdSummary = bucketAnalytics.ofd_summary
        if (parseInt(ofdSummary.today) > 0) {
          status.push({
            metricId: `${stageInfo.id}-ofd-today`,
            label: 'Today',
            count: parseInt(ofdSummary.today),
            statusType: 'positive',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { ofd_date: 'today' } }
          })
        }
        if (parseInt(ofdSummary.tomorrow) > 0) {
          status.push({
            metricId: `${stageInfo.id}-ofd-tomorrow`,
            label: 'Tomorrow',
            count: parseInt(ofdSummary.tomorrow),
            statusType: 'neutral',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { ofd_date: 'tomorrow' } }
          })
        }
      }

      // Handle delayed summary for ACTIVE bucket
      if (bucketAnalytics?.delayed_summary) {
        const delayedSummary = bucketAnalytics.delayed_summary
        if (parseInt(delayedSummary['1 day']) > 0) {
          status.push({
            metricId: `${stageInfo.id}-delayed-1day`,
            label: '1 Day',
            count: parseInt(delayedSummary['1 day']),
            statusType: 'warning',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { delayed_days: '1' } }
          })
        }
        if (parseInt(delayedSummary['2-4 days']) > 0) {
          status.push({
            metricId: `${stageInfo.id}-delayed-2-4days`,
            label: '2-4 Days',
            count: parseInt(delayedSummary['2-4 days']),
            statusType: 'warning',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { delayed_days: '2-4' } }
          })
        }
        if (parseInt(delayedSummary['4+ days']) > 0) {
          status.push({
            metricId: `${stageInfo.id}-delayed-4plusdays`,
            label: '4+ Days',
            count: parseInt(delayedSummary['4+ days']),
            statusType: 'critical',
            target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { delayed_days: '4+' } }
          })
        }
      }

      if (bucketAnalytics) {
        // Add transit status metrics to status array
        if (bucketAnalytics.transit_status_summary) {
          const transitStatus = bucketAnalytics.transit_status_summary

          if (transitStatus.on_time > 0) {
            status.push({
              metricId: `${stageInfo.id}-on-time`,
              label: 'On Time',
              count: transitStatus.on_time,
              statusType: 'positive',
              target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { transit_status: 'on_time' } }
            })
          }

          if (transitStatus.delayed > 0) {
            status.push({
              metricId: `${stageInfo.id}-delayed`,
              label: 'Delayed',
              count: transitStatus.delayed,
              statusType: 'warning',
              target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { transit_status: 'delayed' } }
            })
          }

        }
      }

      // Add exceptions for the EXCEPTIONS milestone
      const exceptions: MetricData[] = []
      if (milestoneKey === 'EXCEPTIONS' && milestoneCount > 0) {
        exceptions.push({
          metricId: `${stageInfo.id}-exceptions`,
          label: 'Exception Shipments',
          count: milestoneCount,
          statusType: 'critical',
          target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { type: 'exception' } }
        })
      }

      if (milestoneKey === 'EXCEPTIONS') {
        exceptionRollupKeys.forEach((rollupKey) => {
          const rollupCount = getMilestoneCount(rollupKey)
          if (rollupCount > 0) {
            exceptions.push({
              metricId: `${stageInfo.id}-${rollupKey.toLowerCase()}`,
              label: rollupKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
              count: rollupCount,
              statusType: rollupKey === 'RTO' ? 'critical' : 'warning',
              target: { path: `/shipments/${stageInfo.id}`, defaultFilters: { milestone: rollupKey } }
            })
          }
        })
      }

      return {
        id: stageInfo.id,
        title: stageInfo.title,
        metrics,
        exceptions: exceptions.length > 0 ? exceptions : undefined,
        status: status.length > 0 ? status : undefined
      }
    }
  )

  // Create Orders lifecycle stage if orders data is available
  const finalLifecycleStages: LifecycleStage[] = []
  if (ordersData) {
    const ordersStage = createOrdersLifecycleStage(ordersData)
    finalLifecycleStages.push(ordersStage)
  }
  finalLifecycleStages.push(...lifecycleStages)

  return {
    id: 'shipments',
    label: 'Shipments',
    quickKPIs,
    lifecycleStages: finalLifecycleStages
  }
}
