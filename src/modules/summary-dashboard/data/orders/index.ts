// Types
export type {
  OrdersBucketSummary,
  FilterId,
  OrdersMasterSearchPayload,
  ExtractedOrdersPayload,
  OrderRow,
  OrderSummary,
  PaginationMeta,
  OrderCustomData,
  CustomDataTemplateField,
  OrderComment,
  GlobalFilters,
  OrderDetailsResponse,
  OrderCommentsResponse,
  AddCommentRequest,
  AddCommentResponse
} from './ordersTypes'

// Client (HTTP calls)
export {
  fetchOrdersBucketSummary,
  fetchOrderDetails,
  fetchOrderComments,
  addOrderComment
} from './ordersClient'

// Mapper (data transformation)
export {
  normalizeOrderRow,
  normalizeTripType,
  resolveTripType,
  normalizeStatus,
  normalizeDeliveryStatus,
  extractRelatedId,
  resolveOrderId,
  buildRouteString
} from './ordersMapper'

// Merge (dedup/merge logic)
export {
  extractOrdersPayload,
  enrichOrdersFromTimeline,
  buildOrdersSummary,
  buildDefaultPagination
} from './ordersMerge'

// Summary (context resolution, custom data template)
export {
  resolveOrdersContext,
  getCustomDataTemplate,
  clearCustomDataTemplateCache,
  buildOrdersMasterSearchPayload
} from './ordersSummary'

// Main fetch function (orchestrates all modules)
import { realApiService } from '../realApiService'
import type { FilterId, GlobalFilters, OrderRow, OrderSummary, PaginationMeta } from './ordersTypes'
import { resolveOrdersContext, getCustomDataTemplate, buildOrdersMasterSearchPayload } from './ordersSummary'
import { normalizeOrderRow } from './ordersMapper'
import { extractOrdersPayload, enrichOrdersFromTimeline, buildOrdersSummary, buildDefaultPagination } from './ordersMerge'

/**
 * Fetch orders from master search API
 */
async function fetchOrdersFromMasterSearch(
  filters: Set<FilterId>,
  globalFilters: GlobalFilters,
  page: number,
  pageSize: number
): Promise<{ orders: OrderRow[]; summary: OrderSummary | null; pagination: PaginationMeta }> {
  const resolvedLocationId = await resolveOrdersContext(globalFilters)
  const effectiveFilters: GlobalFilters = {
    ...globalFilters,
    locationId: globalFilters.locationId || resolvedLocationId || undefined,
  }

  const branchFteid = effectiveFilters.locationId
  const payload = buildOrdersMasterSearchPayload(filters, effectiveFilters, page, pageSize, branchFteid)
  const response = await realApiService.searchOrdersMaster(payload)

  if (!response || response.success === false) {
    throw new Error('Orders master-search API returned failure status')
  }

  const { orders: extractedOrders, summary: extractedSummary, pagination: extractedPagination } =
    extractOrdersPayload(response)

  const customDataFields = await getCustomDataTemplate().catch(() => [])
  const normalizedOrders: OrderRow[] = []
  let skippedCount = 0

  for (const order of extractedOrders) {
    const normalized = normalizeOrderRow(order, customDataFields)
    if (normalized) {
      normalizedOrders.push(normalized)
    } else {
      skippedCount++
    }
  }

  if (skippedCount > 0 && import.meta.env.DEV) {
    console.warn(`[fetchOrdersFromMasterSearch] Skipped ${skippedCount} invalid orders out of ${extractedOrders.length} total`)
  }

  const enrichedOrders = await enrichOrdersFromTimeline(normalizedOrders)
  const summary = extractedSummary || buildOrdersSummary(enrichedOrders)

  return {
    orders: enrichedOrders,
    summary,
    pagination: extractedPagination || buildDefaultPagination(page, pageSize, enrichedOrders.length),
  }
}

/**
 * Fetch orders list with filters and summary
 * Uses real API with normalization
 */
export async function fetchOrders(
  filters: Set<FilterId>,
  _outboundOption: string | null,
  globalFilters: GlobalFilters,
  page: number = 1,
  pageSize: number = 1000
): Promise<{ orders: OrderRow[]; summary: OrderSummary | null; pagination: PaginationMeta }> {
  try {
    return await fetchOrdersFromMasterSearch(filters, globalFilters, page, pageSize)
  } catch (error) {
    console.error('Error fetching orders:', error)
    if (error instanceof Error && error.name === 'PermissionError') {
      console.warn('Orders API permissions denied - user may need additional permissions for PTL orders')
    }
    throw error
  }
}
