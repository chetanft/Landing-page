import type { OrderRow, OrderCustomData, CustomDataTemplateField } from './ordersTypes'

/**
 * Normalize trip type to expected format
 */
export function normalizeTripType(tripType: any): OrderRow['tripType'] {
  if (!tripType) return 'Unplanned'
  const normalized = String(tripType).trim()
  const upper = normalized.toUpperCase()
  if (upper === 'FTL' || upper === 'PTL' || upper === 'INBOUND' || upper === 'OUTBOUND') {
    return upper as OrderRow['tripType']
  }
  if (upper === 'UNPLANNED') {
    return 'Unplanned'
  }
  return 'Unplanned'
}

/**
 * Resolve trip type (FTL/PTL/Unplanned) from order data
 */
export function resolveTripType(apiOrder: any): OrderRow['tripType'] {
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
export function normalizeStatus(status: any): OrderRow['status'] {
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

const STATUS_MILESTONE_MAP: Record<string, string> = {
  UNPLANNED: 'Unplanned',
  PLANNED: 'Planned',
  PARTIALLY_PLANNED: 'Partially Planned',
  IN_PROGRESS: 'In Progress',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
}

const BUCKET_MILESTONE_MAP: Record<string, string> = {
  SERVICEABLE: 'Serviceable',
  UNSERVICEABLE: 'Unserviceable',
  PROCESSING: 'Processing',
  BOOKED: 'Booked',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
}

function resolveStageAndMilestone(
  apiOrder: any,
  tripType: OrderRow['tripType'],
  statusCode: string
): { stage: string; milestone?: string } {
  const stageFromApi = String(apiOrder.stage || apiOrder.orderStage || apiOrder.stage_name || '').trim()
  const milestoneFromApi = String(apiOrder.milestone || apiOrder.milestone_name || apiOrder.milestoneLabel || '').trim()
  const bucketCode = String(apiOrder.bucket || apiOrder.bucket_name || apiOrder.bucketName || '').trim().toUpperCase()
  const journeyStatusCode = String(apiOrder.journey_status || apiOrder.journeyStatus || '').trim().toUpperCase()

  const inferredStage =
    tripType === 'FTL'
      ? 'FTL'
      : tripType === 'PTL'
        ? 'PTL'
        : statusCode.includes('DELIVERED')
          ? 'Invoicing'
          : 'Planning'

  const stage = stageFromApi || inferredStage

  const milestoneFromStatus = STATUS_MILESTONE_MAP[statusCode]
  const milestoneFromBucket = BUCKET_MILESTONE_MAP[bucketCode]
  const milestoneFromJourney = STATUS_MILESTONE_MAP[journeyStatusCode]
  const milestone =
    milestoneFromApi && milestoneFromApi.toLowerCase() !== String(normalizeStatus(statusCode)).toLowerCase()
      ? milestoneFromApi
      : milestoneFromBucket || milestoneFromJourney || milestoneFromStatus

  return { stage, milestone }
}

/**
 * Normalize delivery status
 */
export function normalizeDeliveryStatus(deliveryStatus: any, delayValue?: number): OrderRow['deliveryStatus'] {
  if (delayValue && delayValue > 0) return 'delayed'
  const normalized = String(deliveryStatus || '').trim().toLowerCase()
  if (normalized === 'delayed' || normalized === 'delay') return 'delayed'
  return 'on_time'
}

/**
 * Extract related ID and type from order data
 */
export function extractRelatedId(apiOrder: any): { relatedId: string; relatedIdType: OrderRow['relatedIdType'] } {
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
export function resolveOrderId(apiOrder: any): string | undefined {
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
 * Build route string from order data
 */
export function buildRouteString(apiOrder: any): string {
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

/**
 * Normalize API response to OrderRow format
 * Handles field mapping, defaults, and type conversions
 * Returns null if order is invalid (missing critical fields)
 */
export function normalizeOrderRow(
  apiOrder: any,
  customDataFields?: CustomDataTemplateField[]
): OrderRow | null {
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
              if (field.type === 'number') {
                const numValue = Number(value)
                if (!isNaN(numValue)) {
                  customData[field.name] = numValue
                }
              } else {
                customData[field.name] = String(value)
              }
            }
          } catch {
            // Skip this field if extraction fails
          }
        }
      }
    }

    const resolvedId = resolveOrderId(apiOrder)
    const tripType = resolveTripType(apiOrder)
    const status = normalizeStatus(apiOrder.status || apiOrder.orderStatus)
    const statusCode = String(apiOrder.status || apiOrder.orderStatus || '').trim().toUpperCase().replace(/\s+/g, '_')

    const delayValue = apiOrder.delayDays || apiOrder.delay_days ||
                      (apiOrder.delayMinutes ? Math.ceil(apiOrder.delayMinutes / (24 * 60)) : undefined)
    const deliveryStatus = normalizeDeliveryStatus(
      apiOrder.deliveryStatus || apiOrder.delivery_status,
      delayValue
    )

    const { relatedId, relatedIdType } = extractRelatedId(apiOrder)
    const route = buildRouteString(apiOrder)
    const { stage, milestone } = resolveStageAndMilestone(apiOrder, tripType, statusCode)

    // Ensure required fields exist
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
      resolvedId ||
      possibleIds[0] ||
      ''
    const id = apiOrder.id || apiOrder.fteid || apiOrder.fte_id || orderId

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
      soNumber: resolvedId || apiOrder.soNumber || apiOrder.SONumber || apiOrder.so_number || '—',
      consignorName,
      consigneeName,
      route: route || '—',
      tripType,
      stage: stage || '—',
      milestone,
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
