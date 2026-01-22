/**
 * Order-related types for API responses and UI state
 */

export type TripType = 'FTL' | 'PTL' | 'Inbound' | 'Outbound' | 'Unplanned'
export type OrderStatus = 'In Process' | 'In Assignment' | 'In Transit' | 'Pending' | 'Pending Approval' | 'Reconciliation Pending' | 'Cancelled' | 'Failed' | 'RTO'
export type DeliveryStatus = 'delayed' | 'on_time'
export type RelatedIdType = 'Indent' | 'Trip' | 'EPOD' | 'INV' | 'Ref' | 'AWB'

/**
 * Custom data fields from API (dynamic fields from custom-data-template)
 */
export interface OrderCustomData {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Order row data for table display
 */
export interface OrderRow {
  id: string
  orderId: string
  soNumber: string
  consignorName: string
  consigneeName: string
  route: string
  tripType: TripType
  stage: string
  milestone?: string
  status: OrderStatus
  relatedIdType: RelatedIdType
  relatedId: string
  deliveryEta?: string
  deliveryStatus: DeliveryStatus
  delayDays?: number
  dispatchDate?: string
  // Custom data fields from API
  customData?: OrderCustomData
}

/**
 * Order summary counts for quick filters
 */
export interface OrderSummary {
  total: number
  inbound: number
  outbound: number
  ftl: number
  ptl: number
  deliveryDelayed: number
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Orders list API response
 */
export interface OrdersListResponse {
  success: boolean
  data: OrderRow[]
  summary?: OrderSummary
  pagination: PaginationMeta
}

/**
 * Party information (Sender, Ship To, Bill To)
 */
export interface PartyInfo {
  name: string
  address: string
  gstin: string
  email: string
  phone: string
}

/**
 * Order details summary
 */
export interface OrderDetailsSummary {
  soNumber: string
  totalWeight: number
  totalWeightUom: string
  doCount: number
  skuCount: number
  totalCost: number
  currency: string
  createdAt: string
  stage: string
  status: OrderStatus
  deliveryStatus: DeliveryStatus
  delayMinutes?: number
  eta?: string
  sta?: string
  nextMilestoneLabel?: string
  nextMilestoneEta?: string
}

/**
 * Order identifiers
 */
export interface OrderIdentifiers {
  planningId?: string
  indentId?: string
  journeyId?: string
  epodId?: string
  invoiceNumber?: string
}

/**
 * Order details API response
 */
export interface OrderDetailsResponse {
  success: boolean
  data: {
    summary: OrderDetailsSummary
    parties: {
      sender: PartyInfo
      shipTo: PartyInfo
      billTo: PartyInfo
    }
    identifiers: OrderIdentifiers
  }
}

/**
 * Timeline event type
 */
export type TimelineEventType = 'so_generated' | 'planning' | 'indent' | 'assignment' | 'reporting' | 'transit' | 'epod' | 'invoicing' | 'other'

/**
 * Timeline event status
 */
export type TimelineEventStatus = 'completed' | 'in_progress' | 'pending' | 'delayed'

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string
  timestamp: string
  label: string
  subLabel?: string
  status: TimelineEventStatus
  durationMinutes?: number
  delayMinutes?: number
  location?: string
  type: TimelineEventType
  children?: TimelineEvent[]
}

/**
 * Order timeline API response
 */
export interface OrderTimelineResponse {
  success: boolean
  data: {
    events: TimelineEvent[]
    timelineStart: string
    timelineEnd: string
  }
}

/**
 * Order comment
 */
export interface OrderComment {
  id: string
  authorName: string
  authorInitials: string
  createdAt: string
  message: string
  source?: string
}

/**
 * Order comments API response
 */
export interface OrderCommentsResponse {
  success: boolean
  data: {
    comments: OrderComment[]
  }
}

/**
 * Comment template
 */
export interface CommentTemplate {
  id: string
  label: string
  message: string
}

/**
 * Comment templates API response
 */
export interface CommentTemplatesResponse {
  success: boolean
  data: {
    templates: CommentTemplate[]
  }
}

/**
 * Add comment request
 */
export interface AddCommentRequest {
  type: 'template' | 'custom'
  templateId?: string
  message?: string
}

/**
 * Add comment response
 */
export interface AddCommentResponse {
  success: boolean
  data: OrderComment
}

/**
 * Custom data template field definition
 */
export interface CustomDataTemplateField {
  name: string
  type: string
  possibleValues: string[]
  isRequired: boolean
  isFilter: boolean
}
