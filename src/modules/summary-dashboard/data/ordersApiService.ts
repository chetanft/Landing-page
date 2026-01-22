import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { realApiService } from './realApiService'
import { TokenManager } from '../auth/tokenManager'
import type {
  OrdersListResponse,
  OrderDetailsResponse,
  OrderTimelineResponse,
  OrderCommentsResponse,
  CommentTemplatesResponse,
  AddCommentRequest,
  AddCommentResponse,
  OrderRow,
  OrderSummary,
  PaginationMeta,
  OrderCustomData,
  CustomDataTemplateField,
} from '../types/orders'
import type { GlobalFilters } from '../types/metrics'

interface OrdersBucketSummary {
  success: boolean
  data: {
    SERVICEABLE?: number
    UNSERVICEABLE?: number
    PROCESSING?: number
    BOOKED?: number
    FAILED?: number
    CANCELLED?: number
    [key: string]: number | undefined
  }
}

type FilterId = 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'

const DEFAULT_MASTER_SEARCH_STATUSES = [
  'UNPLANNED',
  'PARTIALLY_PLANNED',
  'PLANNED',
  'DISPATCHED'
]

// Cache for custom data template (session-scoped)
let customDataTemplateCache: CustomDataTemplateField[] | null = null
let customDataTemplatePromise: Promise<CustomDataTemplateField[]> | null = null

/**
 * Resolve branch/location context for orders API
 * Falls back through: globalFilters.locationId -> user settings -> company hierarchy -> env var -> user context
 */
export async function resolveOrdersContext(globalFilters: GlobalFilters): Promise<string | undefined> {
  const isBranchFteid = (value?: string | null) =>
    Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))

  // 1. Check globalFilters.locationId
  if (globalFilters.locationId && isBranchFteid(globalFilters.locationId)) {
    return globalFilters.locationId
  }

  // 2. Check environment variable
  const envBranch = import.meta.env.VITE_FT_TMS_BRANCH_FTEID
  if (envBranch && isBranchFteid(envBranch)) {
    return envBranch
  }

  // 3. Check user context from token
  const userContext = TokenManager.getUserContext()
  if (userContext?.branchId && isBranchFteid(userContext.branchId)) {
    return userContext.branchId
  }

  // 4. Try user settings API
  try {
    const userSettings = await realApiService.getUserSettings()
    const lastBranch = userSettings?.data?.lastSelectedBranch
    if (lastBranch && isBranchFteid(lastBranch)) {
      if (import.meta.env.DEV) {
        console.log('[resolveOrdersContext] Using lastSelectedBranch from user settings:', lastBranch)
      }
      return lastBranch
    }
  } catch (settingsError) {
    if (import.meta.env.DEV) {
      console.warn('[resolveOrdersContext] Failed to fetch user settings:', settingsError)
    }
  }

  // 5. Try company hierarchy API
  try {
    const hierarchy = await realApiService.getCompanyHierarchy()
    const firstBranch = hierarchy?.data?.total_branches?.find(branch =>
      branch.fteid && isBranchFteid(branch.fteid)
    )
    if (firstBranch?.fteid) {
      if (import.meta.env.DEV) {
        console.log('[resolveOrdersContext] Using first branch from hierarchy:', firstBranch.fteid, firstBranch.name)
      }
      return firstBranch.fteid
    }
  } catch (hierarchyError) {
    if (import.meta.env.DEV) {
      console.warn('[resolveOrdersContext] Failed to fetch company hierarchy:', hierarchyError)
    }
  }

  return undefined
}

/**
 * Fetch custom data template for orders (cached per session)
 * Returns empty array on failure to ensure graceful degradation
 */
export async function getCustomDataTemplate(): Promise<CustomDataTemplateField[]> {
  if (customDataTemplateCache) {
    return customDataTemplateCache
  }

  if (customDataTemplatePromise) {
    return customDataTemplatePromise
  }

  customDataTemplatePromise = (async () => {
    try {
      const response = await realApiService.getCustomDataTemplate('order')
      
      // Validate response structure
      if (!response || !response.success) {
        throw new Error('Invalid response from custom data template API')
      }

      const templates = Array.isArray(response.data?.templates) 
        ? response.data.templates.filter((t: any) => t && typeof t.name === 'string')
        : []

      customDataTemplateCache = templates
      
      if (import.meta.env.DEV) {
        console.log(`[getCustomDataTemplate] Loaded ${templates.length} custom fields`)
      }
      
      return templates
    } catch (error) {
      console.warn('[getCustomDataTemplate] Failed to fetch custom data template:', error)
      // Cache empty array to prevent repeated failed requests
      customDataTemplateCache = []
      return []
    }
  })()

  return customDataTemplatePromise
}

/**
 * Normalize API response to OrderRow format
 * Handles field mapping, defaults, and type conversions
 * Returns null if order is invalid (missing critical fields)
 */
function normalizeOrderRow(
  apiOrder: any,
  customDataFields?: CustomDataTemplateField[]
): OrderRow | null {
  // Guard: ensure apiOrder is an object
  if (!apiOrder || typeof apiOrder !== 'object') {
    console.warn('[normalizeOrderRow] Invalid order data:', apiOrder)
    return null
  }

  try {
    // Extract custom data fields safely
    const customData: OrderCustomData = {}
    if (customDataFields && Array.isArray(customDataFields)) {
      for (const field of customDataFields) {
        if (field && field.name) {
          try {
            const value = apiOrder[field.name] ?? apiOrder.customData?.[field.name]
            if (value !== undefined && value !== null && value !== '') {
              // Type coercion based on field type
              if (field.type === 'number') {
                const numValue = Number(value)
                if (!isNaN(numValue)) {
                  customData[field.name] = numValue
                }
              } else {
                customData[field.name] = String(value)
              }
            }
          } catch (fieldError) {
            // Skip this field if extraction fails
            if (import.meta.env.DEV) {
              console.warn(`[normalizeOrderRow] Failed to extract custom field ${field.name}:`, fieldError)
            }
          }
        }
      }
    }

    // Resolve order identifiers (SO/DO)
    const resolvedOrderId = resolveOrderId(apiOrder)

    // Normalize trip type
    const tripType = resolveTripType(apiOrder)

    // Normalize status
    const status = normalizeStatus(apiOrder.status || apiOrder.orderStatus)

    // Normalize delivery status
    const delayValue = apiOrder.delayDays || apiOrder.delay_days || 
                      (apiOrder.delayMinutes ? Math.ceil(apiOrder.delayMinutes / (24 * 60)) : undefined)
    const deliveryStatus = normalizeDeliveryStatus(
      apiOrder.deliveryStatus || apiOrder.delivery_status,
      delayValue
    )

    // Extract related ID and type
    const { relatedId, relatedIdType } = extractRelatedId(apiOrder)

    // Build route string
    const route = buildRouteString(apiOrder)

    // Ensure required fields exist - at least one identifier must be present
    const possibleIds = [
      apiOrder.id,
      apiOrder.orderId,
      apiOrder.order_id,
      apiOrder.fteid,
      apiOrder.fte_id
    ].filter(Boolean)

    if (possibleIds.length === 0) {
      console.warn('[normalizeOrderRow] Order missing all id fields:', apiOrder)
      return null
    }

    const orderId =
      apiOrder.orderId ||
      apiOrder.order_id ||
      apiOrder.orderNumber ||
      apiOrder.order_number ||
      resolvedOrderId ||
      possibleIds[0] ||
      ''
    const id = apiOrder.id || apiOrder.fteid || apiOrder.fte_id || orderId

    // Validate that we have at least a valid string ID
    if (!String(id).trim() && !String(orderId).trim()) {
      console.warn('[normalizeOrderRow] Order has empty id fields:', apiOrder)
      return null
    }

    const consignorName = String(
      apiOrder.consignorName ||
      apiOrder.consignor_name ||
      apiOrder.senderName ||
      apiOrder.sender_name ||
      apiOrder.customData?.sellerName ||
      apiOrder.pickupAddress?.label ||
      '—'
    ).trim() || '—'
    const consigneeName = String(
      apiOrder.consigneeName ||
      apiOrder.consignee_name ||
      apiOrder.receiverName ||
      apiOrder.receiver_name ||
      apiOrder.customData?.buyerName ||
      apiOrder.dropAddress?.label ||
      '—'
    ).trim() || '—'
    const deliveryEta =
      apiOrder.deliveryEta ||
      apiOrder.delivery_eta ||
      apiOrder.eta ||
      apiOrder.customData?.committed_delivery_date ||
      undefined

    return {
      id: String(id).trim() || String(orderId).trim(),
      orderId: String(orderId).trim() || String(id).trim(),
      soNumber: resolvedOrderId || apiOrder.soNumber || apiOrder.SONumber || apiOrder.so_number || '—',
      consignorName,
      consigneeName,
      route: route || '—',
      tripType,
      stage: String(apiOrder.stage || apiOrder.orderStage || apiOrder.stage_name || '—').trim() || '—',
      milestone: String(apiOrder.milestone || apiOrder.milestone_name || apiOrder.milestoneLabel || '').trim() || undefined,
      status,
      relatedIdType,
      relatedId: String(relatedId || '—').trim() || '—',
      deliveryEta,
      deliveryStatus,
      delayDays: delayValue,
      dispatchDate: apiOrder.dispatchDate || apiOrder.dispatch_date || apiOrder.dispatched_at || undefined,
      customData: Object.keys(customData).length > 0 ? customData : undefined,
    }
  } catch (error) {
    console.error('[normalizeOrderRow] Error normalizing order:', error, apiOrder)
    return null
  }
}

/**
 * Normalize trip type to expected format
 */
function normalizeTripType(tripType: any): OrderRow['tripType'] {
  if (!tripType) return 'Unplanned'
  const normalized = String(tripType).trim()
  const upper = normalized.toUpperCase()
  if (upper === 'FTL' || upper === 'PTL' || upper === 'INBOUND' || upper === 'OUTBOUND') {
    return upper as OrderRow['tripType']
  }
  if (upper === 'UNPLANNED') {
    return 'Unplanned'
  }
  // Default fallback
  return 'Unplanned'
}

/**
 * Resolve trip type (FTL/PTL/Unplanned) from order data
 */
function resolveTripType(apiOrder: any): OrderRow['tripType'] {
  const explicit = normalizeTripType(apiOrder.tripType || apiOrder.trip_type || apiOrder.orderType)
  if (explicit !== 'Unplanned') return explicit

  const status = String(apiOrder.status || apiOrder.orderStatus || '').toUpperCase()
  if (status.includes('UNPLANNED')) return 'Unplanned'

  // Infer from related IDs
  if (apiOrder.journeyId || apiOrder.journey_id || apiOrder.tripId || apiOrder.trip_id) return 'FTL'
  if (apiOrder.shipmentId || apiOrder.shipment_id) return 'PTL'

  return 'Unplanned'
}

/**
 * Normalize status to expected format
 */
function normalizeStatus(status: any): OrderRow['status'] {
  if (!status) return 'Pending'
  const normalized = String(status).trim()
  const statusMap: Record<string, OrderRow['status']> = {
    'PLANNED': 'In Process',
    'PARTIALLY_PLANNED': 'In Process',
    'UNPLANNED': 'Pending',
    'DISPATCHED': 'In Transit',
    'IN_PROCESS': 'In Process',
    'IN_ASSIGNMENT': 'In Assignment',
    'IN_TRANSIT': 'In Transit',
    'PENDING': 'Pending',
    'PENDING_APPROVAL': 'Pending Approval',
    'RECONCILIATION_PENDING': 'Reconciliation Pending',
    'CANCELLED': 'Cancelled',
    'FAILED': 'Failed',
    'RTO': 'RTO',
  }
  const upper = normalized.toUpperCase().replace(/\s+/g, '_')
  return statusMap[upper] || (normalized as OrderRow['status'])
}

/**
 * Normalize delivery status
 */
function normalizeDeliveryStatus(deliveryStatus: any, delayValue?: number): OrderRow['deliveryStatus'] {
  if (delayValue && delayValue > 0) return 'delayed'
  const normalized = String(deliveryStatus || '').trim().toLowerCase()
  if (normalized === 'delayed' || normalized === 'delay') return 'delayed'
  return 'on_time'
}

/**
 * Extract related ID and type from order data
 */
function extractRelatedId(apiOrder: any): { relatedId: string; relatedIdType: OrderRow['relatedIdType'] } {
  // Check various possible fields
  const indentId = apiOrder.indentId || apiOrder.indent_id
  const tripId = apiOrder.tripId || apiOrder.trip_id || apiOrder.journeyId || apiOrder.journey_id
  const epodId = apiOrder.epodId || apiOrder.epod_id
  const invoiceNumber = apiOrder.invoiceNumber || apiOrder.invoice_number
  const batchFteid = apiOrder.batchFteid || apiOrder.batch_fteid
  const refId = apiOrder.referenceId || apiOrder.reference_id || apiOrder.refId || apiOrder.ref_id
  const awbId = apiOrder.awbId || apiOrder.awb_id || apiOrder.awbNumber || apiOrder.awb_number

  if (indentId) return { relatedId: String(indentId), relatedIdType: 'Indent' }
  if (tripId) return { relatedId: String(tripId), relatedIdType: 'Trip' }
  if (epodId) return { relatedId: String(epodId), relatedIdType: 'EPOD' }
  if (invoiceNumber) return { relatedId: String(invoiceNumber), relatedIdType: 'INV' }
  if (awbId) return { relatedId: String(awbId), relatedIdType: 'AWB' }
  if (batchFteid) return { relatedId: String(batchFteid), relatedIdType: 'Ref' }
  if (refId) return { relatedId: String(refId), relatedIdType: 'Ref' }

  return { relatedId: '', relatedIdType: 'Ref' }
}

/**
 * Resolve order identifier (SO/DO) for display
 */
function resolveOrderId(apiOrder: any): string | undefined {
  const soNumber =
    apiOrder.soNumber ||
    apiOrder.SONumber ||
    apiOrder.so_number ||
    apiOrder.salesOrderNumber ||
    apiOrder.sales_order_number ||
    apiOrder.so_id ||
    apiOrder.soId
  if (soNumber) return String(soNumber)

  const doNumber =
    apiOrder.doNumber ||
    apiOrder.do_number ||
    apiOrder.deliveryOrderNumber ||
    apiOrder.delivery_order_number ||
    apiOrder.do_id ||
    apiOrder.doId
  if (doNumber) return String(doNumber)

  return undefined
}

/**
 * Extract stage/milestone/dispatch date from timeline data
 */
function extractTimelineSignals(timeline: OrderTimelineResponse['data'] | null): {
  stage?: string
  milestone?: string
  dispatchDate?: string
} {
  if (!timeline || !Array.isArray(timeline.events)) return {}

  const events = timeline.events
    .map((event) => ({
      ...event,
      timestampMs: event.timestamp ? new Date(event.timestamp).getTime() : 0
    }))
    .sort((a, b) => a.timestampMs - b.timestampMs)

  const lastEvent = events[events.length - 1]
  const dispatchEvent = events.find((event) => {
    const label = String(event.label || '').toLowerCase()
    return label.includes('dispatch')
  })

  return {
    stage: lastEvent?.label || lastEvent?.type || undefined,
    milestone: lastEvent?.subLabel || lastEvent?.label || undefined,
    dispatchDate: dispatchEvent?.timestamp || undefined,
  }
}

/**
 * Enrich orders with timeline-derived stage/milestone/dispatchDate
 * Limits concurrency to avoid overloading APIs.
 */
async function enrichOrdersFromTimeline(orders: OrderRow[]): Promise<OrderRow[]> {
  const candidates = orders
    .filter(order => !order.milestone || !order.dispatchDate || !order.stage || order.stage === '—')
    .slice(0, 25)

  if (candidates.length === 0) return orders

  const concurrency = 5
  const results: OrderRow[] = [...orders]

  const queue = [...candidates]
  const workers = Array.from({ length: concurrency }).map(async () => {
    while (queue.length > 0) {
      const order = queue.shift()
      if (!order) return
      try {
        const timeline = await fetchOrderTimeline(order.id)
        const signals = extractTimelineSignals(timeline)
        const index = results.findIndex(o => o.id === order.id)
        if (index >= 0) {
          results[index] = {
            ...results[index],
            stage: signals.stage || results[index].stage,
            milestone: signals.milestone || results[index].milestone,
            dispatchDate: signals.dispatchDate || results[index].dispatchDate,
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[enrichOrdersFromTimeline] Failed to enrich order:', order.id, error)
        }
      }
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * Build route string from order data
 */
function buildRouteString(apiOrder: any): string {
  const origin =
    apiOrder.origin ||
    apiOrder.originCity ||
    apiOrder.origin_city ||
    apiOrder.pickupLocation ||
    apiOrder.pickup_location ||
    apiOrder.pickupAddress?.label ||
    apiOrder.pickupAddress?.city ||
    apiOrder.pickupAddress?.address
  const destination =
    apiOrder.destination ||
    apiOrder.destinationCity ||
    apiOrder.destination_city ||
    apiOrder.deliveryLocation ||
    apiOrder.delivery_location ||
    apiOrder.dropAddress?.label ||
    apiOrder.dropAddress?.city ||
    apiOrder.dropAddress?.address

  if (origin && destination) {
    return `${origin} → ${destination}`
  }
  if (origin) return origin
  if (destination) return destination
  return ''
}

interface OrdersListParams {
  page?: number
  size?: number
  'sort[sort_by]'?: string
  'sort[sort_by_order]'?: string
}

/**
 * Extract orders payload from various response shapes
 */
function extractOrdersPayload(data: any): {
  orders: any[]
  summary: OrderSummary | null
  pagination: PaginationMeta | null
} {
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
  const pagination = (() => {
    const rawPagination = nestedData.pagination || root.pagination
    if (rawPagination) {
      const page = rawPagination.currentPage ?? rawPagination.page ?? 1
      const pageSize = rawPagination.pageSize ?? rawPagination.per_page ?? rawPagination.size ?? orders.length
      const total = rawPagination.totalItems ?? rawPagination.total ?? orders.length
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
        pageSize: nestedData.per_page ?? orders.length,
        total: nestedData.total ?? orders.length,
        totalPages: nestedData.last_page ?? 1,
      }
    }
    return null
  })()

  return { orders, summary, pagination }
}

/**
 * Build query parameters for orders list API
 */
function buildOrdersListParams(
  filters: Set<FilterId>,
  outboundOption: string | null,
  globalFilters: GlobalFilters,
  page: number = 1,
  pageSize: number = 50
): OrdersListParams {
  const params: OrdersListParams = {
    page,
    size: pageSize,
    'sort[sort_by]': 'created_at',
    'sort[sort_by_order]': 'DESC',
  }

  return params
}

function buildOrdersMasterSearchPayload(
  filters: Set<FilterId>,
  globalFilters: GlobalFilters,
  page: number,
  pageSize: number,
  branchFteid?: string
) {
  const payload = {
    page,
    size: pageSize,
    group_fteid: null as string | null,
    branch_fteid: branchFteid ?? null,
    sort: ['-updatedAt'],
    filters: [
      {
        field: 'STATUS',
        operator: 'in',
        value: DEFAULT_MASTER_SEARCH_STATUSES
      }
    ],
    includeDeletedOnly: false
  }

  if (filters.size === 0 && !globalFilters.dateRange) {
    return payload
  }

  return payload
}

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

  const payload = buildOrdersMasterSearchPayload(filters, effectiveFilters, page, pageSize, effectiveFilters.locationId)
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
  let summary = extractedSummary || null
  if (!summary) {
    summary = {
      total: enrichedOrders.length,
      inbound: enrichedOrders.filter(o => o.tripType === 'Inbound').length,
      outbound: enrichedOrders.filter(o => o.tripType === 'Outbound').length,
      ftl: enrichedOrders.filter(o => o.tripType === 'FTL').length,
      ptl: enrichedOrders.filter(o => o.tripType === 'PTL').length,
      deliveryDelayed: enrichedOrders.filter(o => o.deliveryStatus === 'delayed').length,
    }
  }

  return {
    orders: enrichedOrders,
    summary,
    pagination: extractedPagination || {
      page,
      pageSize,
      total: enrichedOrders.length,
      totalPages: Math.ceil(enrichedOrders.length / pageSize),
    },
  }
}

/**
 * Fetch orders bucket summary
 * Returns aggregated counts by bucket/stage
 */
export async function fetchOrdersBucketSummary(
  globalFilters: GlobalFilters
): Promise<OrdersBucketSummary['data'] | null> {
  try {
    const baseUrl = buildFtTmsUrl('/ptl-booking/api/v1/order/myOrdersBucketSummary')
    
    // Build query parameters for date range if provided
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
    const data: OrdersBucketSummary = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    if (import.meta.env.DEV) {
      console.log('[fetchOrdersBucketSummary] Response:', data.data)
    }

    return data.data
  } catch (error) {
    console.error('Error fetching orders bucket summary:', error)
    return null
  }
}

/**
 * Fetch orders list with filters and summary
 * Uses real API with normalization and fallback support
 */
export async function fetchOrders(
  filters: Set<FilterId>,
  outboundOption: string | null,
  globalFilters: GlobalFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<{ orders: OrderRow[]; summary: OrderSummary | null; pagination: PaginationMeta }> {
  try {
    try {
      return await fetchOrdersFromMasterSearch(filters, globalFilters, page, pageSize)
    } catch (masterSearchError) {
      if (import.meta.env.DEV) {
        console.warn('[fetchOrders] Master-search failed, falling back to PTL orders API:', masterSearchError)
      }
    }

    // Resolve branch context if not provided
    const resolvedLocationId = await resolveOrdersContext(globalFilters)
    const effectiveFilters: GlobalFilters = {
      ...globalFilters,
      locationId: globalFilters.locationId || resolvedLocationId || undefined,
    }

    // Fetch custom data template in parallel (non-blocking)
    const customDataTemplatePromise = getCustomDataTemplate().catch(() => [])

    const params = buildOrdersListParams(filters, outboundOption, effectiveFilters, page, pageSize)
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value)
        }
        return acc
      }, {} as Record<string, string>)
    ).toString()

    const baseUrl = buildFtTmsUrl('/ptl-booking/api/v1/order/myOrders')
    const response = await ftTmsFetch(`${baseUrl}?${queryString}`)
    const data: OrdersListResponse = await response.json()

    if (!data || data.success === false) {
      throw new Error('API returned failure status')
    }

    const { orders: extractedOrders, summary: extractedSummary, pagination: extractedPagination } =
      extractOrdersPayload(data)

    // Get custom data template (may be empty array if fetch failed)
    const customDataFields = await customDataTemplatePromise

    // Normalize orders array with error handling
    const rawOrders = extractedOrders
    const normalizedOrders: OrderRow[] = []
    let skippedCount = 0

    for (const order of rawOrders) {
      const normalized = normalizeOrderRow(order, customDataFields)
      if (normalized) {
        normalizedOrders.push(normalized)
      } else {
        skippedCount++
      }
    }

    if (skippedCount > 0 && import.meta.env.DEV) {
      console.warn(`[fetchOrders] Skipped ${skippedCount} invalid orders out of ${rawOrders.length} total`)
    }

    // Enrich orders with timeline data (stage/milestone/dispatchDate) when missing
    const enrichedOrders = await enrichOrdersFromTimeline(normalizedOrders)

    // Build summary if not provided
    let summary = extractedSummary || null
    if (!summary && enrichedOrders.length > 0) {
      summary = {
        total: enrichedOrders.length,
        inbound: enrichedOrders.filter(o => o.tripType === 'Inbound').length,
        outbound: enrichedOrders.filter(o => o.tripType === 'Outbound').length,
        ftl: enrichedOrders.filter(o => o.tripType === 'FTL').length,
        ptl: enrichedOrders.filter(o => o.tripType === 'PTL').length,
        deliveryDelayed: enrichedOrders.filter(o => o.deliveryStatus === 'delayed').length,
      }
    }

    return {
      orders: enrichedOrders,
      summary,
      pagination: extractedPagination || {
        page: 1,
        pageSize: 50,
        total: enrichedOrders.length,
        totalPages: Math.ceil(enrichedOrders.length / pageSize),
      },
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

/**
 * Fetch order details
 */
export async function fetchOrderDetails(orderId: string): Promise<OrderDetailsResponse['data']> {
  try {
    const baseUrl = buildFtTmsUrl(`/ptl-booking/api/v1/order/${orderId}/details`)
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
 * Fetch order timeline
 */
export async function fetchOrderTimeline(orderId: string): Promise<OrderTimelineResponse['data']> {
  try {
    const baseUrl = buildFtTmsUrl(`/ptl-booking/api/v1/order/${orderId}/timeline`)
    const response = await ftTmsFetch(baseUrl)
    const data: OrderTimelineResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    return data.data
  } catch (error) {
    console.error(`Error fetching order timeline for ${orderId}:`, error)
    throw error
  }
}

/**
 * Fetch order comments
 */
export async function fetchOrderComments(orderId: string): Promise<OrderComment[]> {
  try {
    const baseUrl = buildFtTmsUrl(`/ptl-booking/api/v1/order/${orderId}/comments`)
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
 * Fetch comment templates
 */
export async function fetchCommentTemplates(): Promise<CommentTemplate[]> {
  try {
    const baseUrl = buildFtTmsUrl('/ptl-booking/api/v1/order/comments/templates')
    const response = await ftTmsFetch(baseUrl)
    const data: CommentTemplatesResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    return data.data.templates || []
  } catch (error) {
    console.error('Error fetching comment templates:', error)
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
    const baseUrl = buildFtTmsUrl(`/ptl-booking/api/v1/order/${orderId}/comments`)
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

// Re-export types for convenience
export type { OrderComment, CommentTemplate } from '../types/orders'
export type { OrdersBucketSummary }
