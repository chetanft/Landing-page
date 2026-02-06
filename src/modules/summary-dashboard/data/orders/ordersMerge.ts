import type { OrderSummary, PaginationMeta, ExtractedOrdersPayload } from './ordersTypes'

/**
 * Extract orders payload from various response shapes
 * Handles different API response formats and normalizes to a common structure
 */
export function extractOrdersPayload(data: any): ExtractedOrdersPayload {
  const root = data || {}
  const nestedData = root.data || {}
  const orders = Array.isArray(nestedData)
    ? nestedData
    : Array.isArray(nestedData.orders)
      ? nestedData.orders
      : Array.isArray(nestedData.records)
        ? nestedData.records
      : Array.isArray(nestedData.data)
        ? nestedData.data
        : Array.isArray(root.orders)
          ? root.orders
          : []

  const summary = nestedData.summary || root.summary || null
  const pagination = extractPagination(nestedData, root, orders.length)

  return { orders, summary, pagination }
}

/**
 * Extract pagination from response data
 */
function extractPagination(
  nestedData: any,
  root: any,
  ordersLength: number
): PaginationMeta | null {
  const rawPagination = nestedData.pagination || root.pagination
  if (rawPagination) {
    const page = rawPagination.currentPage ?? rawPagination.page ?? 1
    const pageSize = rawPagination.pageSize ?? rawPagination.per_page ?? rawPagination.size ?? ordersLength
    const total = rawPagination.totalItems ?? rawPagination.total ?? ordersLength
    const totalPages = rawPagination.totalPages ?? rawPagination.last_page
      ?? (pageSize ? Math.ceil(total / pageSize) : 1)
    return {
      page,
      pageSize,
      total,
      totalPages,
    }
  }
  if (nestedData.current_page || nestedData.per_page) {
    return {
      page: nestedData.current_page ?? 1,
      pageSize: nestedData.per_page ?? ordersLength,
      total: nestedData.total ?? ordersLength,
      totalPages: nestedData.last_page ?? 1,
    }
  }
  return null
}

/**
 * Extract stage/milestone/dispatch date from timeline data
 * Currently a no-op, reserved for future timeline enrichment
 */
export async function enrichOrdersFromTimeline<T>(orders: T[]): Promise<T[]> {
  return orders
}

/**
 * Build summary from orders when API doesn't provide one
 */
export function buildOrdersSummary(
  orders: Array<{ tripType: string; deliveryStatus?: string }>
): OrderSummary {
  return {
    total: orders.length,
    inbound: orders.filter(o => o.tripType === 'Inbound').length,
    outbound: orders.filter(o => o.tripType === 'Outbound').length,
    ftl: orders.filter(o => o.tripType === 'FTL').length,
    ptl: orders.filter(o => o.tripType === 'PTL').length,
    deliveryDelayed: orders.filter(o => o.deliveryStatus === 'delayed').length,
  }
}

/**
 * Build default pagination when API doesn't provide one
 */
export function buildDefaultPagination(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}
