import type { TabData } from '../../types/metrics'
import type {
  GlobalFilters,
  ShipmentSummaryApiResponse,
  ShipmentSpecificBucketSummary,
  OrdersBucketSummary
} from './shipmentsTypes'
import {
  fetchShipmentSpecificBucketSummary,
  fetchShipmentPodSummary,
  fetchShipmentBucketSummary
} from './shipmentsClient'
import {
  transformShipmentDataToTabData,
  createMissingShipmentTabData
} from './shipmentsMapper'
import { fetchOrdersBucketSummary } from '../orders'

/**
 * Fetch shipment metrics from the PTL v2 API
 */
export const fetchShipmentMetrics = async (globalFilters: GlobalFilters): Promise<TabData> => {
  if (import.meta.env.DEV) {
    console.log('[fetchShipmentMetrics] Calling real shipments API')
  }

  try {
    return await fetchShipmentMetricsFromAPI(globalFilters)
  } catch (error) {
    console.warn('[fetchShipmentMetrics] Failed to load shipments, returning missing data:', error)
    return createMissingShipmentTabData(globalFilters)
  }
}

/**
 * Real shipments API implementation
 */
export const fetchShipmentMetricsFromAPI = async (globalFilters: GlobalFilters): Promise<TabData> => {
  if (!globalFilters.dateRange || !globalFilters.dateRange.start || !globalFilters.dateRange.end) {
    throw new Error('Date range is required for shipments API')
  }

  try {
    const [responseResult, ordersResult] = await Promise.allSettled([
      fetchShipmentBucketSummary(globalFilters),
      fetchOrdersBucketSummary(globalFilters)
    ])

    if (responseResult.status === 'rejected') {
      throw responseResult.reason
    }

    const response = responseResult.value
    if (import.meta.env.DEV) {
      console.log('[fetchShipmentMetricsFromAPI] Response status:', response.status)
    }

    let ordersBucketData: OrdersBucketSummary | null = null
    let ordersBucketError: string | null = null

    if (ordersResult.status === 'fulfilled') {
      const value = ordersResult.value
      if (value && typeof value === 'object') {
        ordersBucketData = {
          SERVICEABLE: value.SERVICEABLE ?? 0,
          UNSERVICEABLE: value.UNSERVICEABLE ?? 0,
          PROCESSING: value.PROCESSING ?? 0,
          BOOKED: value.BOOKED ?? 0,
          FAILED: value.FAILED ?? 0,
          CANCELLED: value.CANCELLED ?? 0
        } as OrdersBucketSummary
      }
      if (import.meta.env.DEV) {
        console.log('[fetchShipmentMetricsFromAPI] Orders bucket data:', ordersBucketData)
      }
    } else {
      const ordersError = ordersResult.reason
      ordersBucketError = ordersError instanceof Error
        ? `Failed to load orders summary: ${ordersError.message}`
        : 'Failed to load orders summary'
      if (import.meta.env.DEV) {
        console.warn('[fetchShipmentMetricsFromAPI] Orders bucket summary failed', ordersError)
      }
    }

    const data: ShipmentSummaryApiResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    // Fetch detailed analytics for supported buckets
    const bucketNames = ['ACTIVE', 'DELIVERED']
    const detailedAnalytics = await Promise.all(
      bucketNames.map(async (bucketName) => {
        const analytics = await fetchShipmentSpecificBucketSummary(bucketName, globalFilters)
        return { bucketName, analytics }
      })
    )

    // Create analytics map - ACTIVE bucket maps to OUT_FOR_DELIVERY milestone
    const analyticsMap = new Map<string, ShipmentSpecificBucketSummary | null>()
    detailedAnalytics.forEach(({ bucketName, analytics }) => {
      if (bucketName === 'ACTIVE') {
        analyticsMap.set('OUT_FOR_DELIVERY', analytics)
      } else {
        analyticsMap.set(bucketName, analytics)
      }
    })

    // Fetch POD summary if not in delivered analytics
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

    const ordersData: OrdersBucketSummary | null = ordersBucketData ? {
      SERVICEABLE: ordersBucketData.SERVICEABLE ?? 0,
      UNSERVICEABLE: ordersBucketData.UNSERVICEABLE ?? 0,
      PROCESSING: ordersBucketData.PROCESSING ?? 0,
      BOOKED: ordersBucketData.BOOKED ?? 0,
      FAILED: ordersBucketData.FAILED ?? 0,
      CANCELLED: ordersBucketData.CANCELLED ?? 0,
    } : null

    return transformShipmentDataToTabData(data, analyticsMap, ordersData, ordersBucketError, globalFilters)
  } catch (error) {
    console.error('Error fetching shipment metrics from API:', error)
    throw error
  }
}
