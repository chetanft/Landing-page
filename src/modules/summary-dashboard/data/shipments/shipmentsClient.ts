import { buildFtTmsUrl, ftTmsFetch } from '../ftTmsClient'
import type {
  GlobalFilters,
  ShipmentSpecificBucketSummary,
  ShipmentSpecificSummaryApiResponse,
  ShipmentListApiResponse
} from './shipmentsTypes'

/**
 * Build common query params for shipment API calls
 */
function buildShipmentQueryParams(globalFilters: GlobalFilters): URLSearchParams {
  const params = new URLSearchParams({
    from_booking_date: globalFilters.dateRange.start.getTime().toString(),
    to_booking_date: globalFilters.dateRange.end.getTime().toString()
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
  if (globalFilters.priority && globalFilters.priority.length > 0) {
    globalFilters.priority.forEach((priority) => {
      params.append('priority', priority)
    })
  }

  return params
}

/**
 * Fetch specific bucket summary for a shipment milestone
 */
export const fetchShipmentSpecificBucketSummary = async (
  bucketName: string,
  globalFilters: GlobalFilters
): Promise<ShipmentSpecificBucketSummary | null> => {
  try {
    const baseUrl = buildFtTmsUrl('/api/ptl-v2/api/v1/shipment/myShipmentSpecificBucketSummary')
    const params = buildShipmentQueryParams(globalFilters)
    params.set('bucket_name', bucketName)

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
 * Extract total count from shipment list response
 */
export const getTotalFromShipmentList = (response: ShipmentListApiResponse): number => {
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

/**
 * Fetch POD summary for delivered shipments
 */
export const fetchShipmentPodSummary = async (
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
 * Fetch main shipment bucket summary
 */
export const fetchShipmentBucketSummary = async (
  globalFilters: GlobalFilters
): Promise<Response> => {
  const baseUrl = buildFtTmsUrl('/api/ptl-v2/api/v1/shipment/myShipmentBucketSummary')
  const params = buildShipmentQueryParams(globalFilters)

  const url = `${baseUrl}?${params.toString()}`
  if (import.meta.env.DEV) {
    console.log('[fetchShipmentBucketSummary] Calling shipments API:', url)
  }

  return ftTmsFetch(url)
}
