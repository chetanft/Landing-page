import { buildFtTmsUrl, ftTmsFetch } from '../ftTmsClient'
import type {
  OrdersBucketSummary,
  GlobalFilters,
  OrderDetailsResponse,
  OrderCommentsResponse,
  AddCommentRequest,
  AddCommentResponse,
  OrderComment
} from './ordersTypes'

/**
 * Fetch orders bucket summary
 * Returns aggregated counts by bucket/stage
 */
export async function fetchOrdersBucketSummary(
  globalFilters: GlobalFilters
): Promise<OrdersBucketSummary['data'] | null> {
  const baseUrl = buildFtTmsUrl('/api/ptl-booking/api/v1/order/myOrdersBucketSummary')

  const params = new URLSearchParams()
  if (globalFilters.dateRange) {
    const fromDate = globalFilters.dateRange.start.getTime()
    const toDate = globalFilters.dateRange.end.getTime()
    params.append('from_booking_date', String(fromDate))
    params.append('to_booking_date', String(toDate))
  }

  const queryString = params.toString()
  const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

  const response = await ftTmsFetch(url)
  if (!response.ok) {
    if (import.meta.env.DEV) {
      console.warn('[fetchOrdersBucketSummary] Request failed:', response.status, response.statusText)
    }
    return null
  }

  const data: OrdersBucketSummary = await response.json().catch(() => ({ success: false } as OrdersBucketSummary))

  if (!data.success) {
    if (import.meta.env.DEV) {
      console.warn('[fetchOrdersBucketSummary] API returned failure status')
    }
    return null
  }

  if (import.meta.env.DEV) {
    console.log('[fetchOrdersBucketSummary] Response:', data.data)
  }

  return data.data
}

/**
 * Fetch order details
 */
export async function fetchOrderDetails(orderId: string): Promise<OrderDetailsResponse['data']> {
  try {
    const baseUrl = buildFtTmsUrl(`/api/ptl-booking/api/v1/order/${orderId}/details`)
    const response = await ftTmsFetch(baseUrl)
    const data: OrderDetailsResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    return data.data
  } catch (error) {
    console.error(`Error fetching order details for ${orderId}:`, error)
    throw error
  }
}

/**
 * Fetch order comments
 */
export async function fetchOrderComments(orderId: string): Promise<OrderComment[]> {
  try {
    const baseUrl = buildFtTmsUrl(`/api/ptl-booking/api/v1/order/${orderId}/comments`)
    const response = await ftTmsFetch(baseUrl)
    const data: OrderCommentsResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    return data.data.comments || []
  } catch (error) {
    console.error(`Error fetching order comments for ${orderId}:`, error)
    throw error
  }
}

/**
 * Add a comment to an order
 */
export async function addOrderComment(
  orderId: string,
  comment: AddCommentRequest
): Promise<OrderComment> {
  try {
    const baseUrl = buildFtTmsUrl(`/api/ptl-booking/api/v1/order/${orderId}/comments`)
    const response = await ftTmsFetch(baseUrl, {
      method: 'POST',
      body: JSON.stringify(comment),
    })
    const data: AddCommentResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    return data.data
  } catch (error) {
    console.error(`Error adding comment to order ${orderId}:`, error)
    throw error
  }
}
