import type {
  OrderDetailsResponse,
  OrderCommentsResponse,
  AddCommentRequest,
  AddCommentResponse,
  OrderRow,
  OrderSummary,
  PaginationMeta,
  OrderCustomData,
  CustomDataTemplateField,
  OrderComment,
} from '../../types/orders'
import type { GlobalFilters } from '../../types/metrics'

// Re-export types for convenience
export type {
  OrderDetailsResponse,
  OrderCommentsResponse,
  AddCommentRequest,
  AddCommentResponse,
  OrderRow,
  OrderSummary,
  PaginationMeta,
  OrderCustomData,
  CustomDataTemplateField,
  OrderComment,
  GlobalFilters
}

export interface OrdersBucketSummary {
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

export type FilterId = 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'

export interface OrdersMasterSearchPayload {
  page: number
  size: number
  group_fteid: string | null
  branch_fteid: string | null
  sort: string[]
  filters: Array<{
    field: string
    operator: string
    value: string[] | number[] | string | number | null
  }>
  includeDeletedOnly: boolean
}

export interface ExtractedOrdersPayload {
  orders: any[]
  summary: OrderSummary | null
  pagination: PaginationMeta | null
}
