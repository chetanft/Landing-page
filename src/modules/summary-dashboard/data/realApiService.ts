import { buildFtTmsUrl, ftTmsFetch, resolveUserContext } from './ftTmsClient'
import { TokenManager } from '../auth/tokenManager'

// Real API integration for FreightTiger TMS
const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '')

const getPlanningBaseUrl = () => {
  const override = import.meta.env.VITE_PLANNING_API_BASE_URL
  if (override && override.trim().length > 0) {
    return normalizeBaseUrl(override)
  }
  if (import.meta.env.DEV) {
    return '/__planning/planning-engine-service/v1/api'
  }
  return 'https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api'
}

const planningFetch = async (path: string, options: RequestInit = {}) => {
  const deskToken = TokenManager.getDeskToken()
  const accessToken = TokenManager.getAccessToken()
  const token = deskToken || accessToken
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
    if (import.meta.env.DEV) {
      const source = deskToken ? 'desk' : 'login'
      console.log(`[planningFetch] Using ${source} token (len=${token.length})`)
    }
  } else if (import.meta.env.DEV) {
    console.warn('[planningFetch] No token available for planning API request')
  }

  const userContext = resolveUserContext(token) ?? TokenManager.getUserContext()
  if (userContext?.orgId) {
    headers['X-FT-ORGID'] = userContext.orgId
  }
  if (userContext?.userId) {
    headers['X-FT-USERID'] = userContext.userId
  }
  const branchCode = userContext?.branchId || import.meta.env.VITE_FT_TMS_BRANCH_FTEID || ''
  if (branchCode) {
    headers['branch-code'] = branchCode
  }

  const url = `${getPlanningBaseUrl()}${path}`
  if (import.meta.env.DEV) {
    console.log('[planningFetch] Calling planning API:', url)
  }

  return fetch(url, {
    ...options,
    method: options.method ?? 'GET',
    headers,
    credentials: 'include'
  })
}

const BASE_URL = buildFtTmsUrl('/planning-engine-service/v1/api')
const ACCESS_CONTROL_BASE_URL = buildFtTmsUrl('/access-control/v1')

// Types for API responses
export interface UserSettingsResponse {
  success: boolean
  statusCode: number
  data: {
    branchMandatory: boolean
    lastSelectedBranch: string
    lastSelectedGroup: string | null
  }
  message: string
  timestamp: string
}

export interface OrderStatusCountsResponse {
  success: boolean
  statusCode: number
  data: {
    counts: {
      UNPLANNED: number
      IN_PROGRESS: number
      PLANNED: number
      PARTIALLY_PLANNED: number
      DISPATCHED: number
      DELIVERED: number
      PARTIALLY_DELIVERED: number
      FAILED: number
      VALIDATION_IN_PROGRESS?: number
      VALIDATION_SUCCESS?: number
      VALIDATION_FAILURE?: number
      PLANNING_CORE_FAILED?: number
      DELETED: number
    }
  }
  message: string
  timestamp: string
}

export interface CustomDataTemplateResponse {
  success: boolean
  statusCode: number
  data: {
    entity: string
    templates: Array<{
      name: string
      type: string
      possibleValues: string[]
      isRequired: boolean
      isFilter: boolean
    }>
  }
  message: string
  timestamp: string
}

export interface BatchSearchResponse {
  success: boolean
  statusCode: number
  data: {
    data: Array<{
      fteid: string
      sourceType: string
      numberOfOrders: number
      name: string
      branchFteid: string
      companyFteid: string
      createdAt: string
      updatedAt: string
    }>
    pagination: {
      totalItems: number
      totalPages: number
      currentPage: number
      pageSize: number
    }
  }
  message: string
  timestamp: string
}

export interface OrdersMasterSearchRequest {
  page: number
  size: number
  group_fteid?: string | null
  branch_fteid?: string | null
  sort?: string[]
  filters?: Array<{
    field: string
    operator: string
    value: string[] | number[] | string | number | null
  }>
  includeDeletedOnly?: boolean
}

export interface OrdersMasterSearchResponse {
  success: boolean
  statusCode: number
  data: {
    data: Array<Record<string, unknown>>
    pagination: {
      totalItems: number
      totalPages: number
      currentPage: number
      pageSize: number
    }
  }
  message: string
  timestamp: string
}

export interface CompanyHierarchyResponse {
  success: boolean
  statusCode: number
  data: {
    total_branches: Array<{
      fteid: string
      name: string
      short_code?: string
      old_branch_id?: number
    }>
    groups: any[]
  }
  message: string
  timestamp: string
}

export interface PermissionsResponse {
  success: boolean
  data: Array<{
    permission_id: string
    name: string
  }>
}

// API Service functions
export const realApiService = {
  // User Settings
  async getUserSettings(): Promise<UserSettingsResponse> {
    const response = await planningFetch('/configurations/user-settings')
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[getUserSettings] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch user settings: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Order Status Counts
  async getOrderStatusCounts(branchFteid: string): Promise<OrderStatusCountsResponse> {
    const response = await planningFetch(`/orders/status-counts?branch_fteid=${branchFteid}`)
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[getOrderStatusCounts] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          branchFteid,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch order status counts: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Custom Data Template
  async getCustomDataTemplate(entity: string = 'order'): Promise<CustomDataTemplateResponse> {
    const response = await planningFetch(`/custom-data-template/${entity}`)
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[getCustomDataTemplate] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          entity,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch custom data template: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Batch Search
  async searchBatches(page: number = 1, pageSize: number = 10): Promise<BatchSearchResponse> {
    const response = await planningFetch(`/batches/master-search?page=${page}&pageSize=${pageSize}`)
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[searchBatches] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch batches: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Orders Master Search
  async searchOrdersMaster(payload: OrdersMasterSearchRequest): Promise<OrdersMasterSearchResponse> {
    const response = await planningFetch('/orders/master-search', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[searchOrdersMaster] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch orders master search: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Company Hierarchy
  async getCompanyHierarchy(): Promise<CompanyHierarchyResponse> {
    const response = await planningFetch('/external-services/eqs/company/child')
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[getCompanyHierarchy] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch company hierarchy: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Selected Orders Views
  async getSelectedOrdersViews(): Promise<any> {
    const response = await planningFetch('/views/selected/orders')
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[getSelectedOrdersViews] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch selected orders views: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Access Control Permissions
  async getPermissions(): Promise<PermissionsResponse> {
    const response = await ftTmsFetch(`${ACCESS_CONTROL_BASE_URL}/accessControl/permissions`)
    if (!response.ok) throw new Error('Failed to fetch permissions')
    return response.json()
  }
}

// Computed metrics from API data
export const computeMetricsFromApiData = (orderCounts: OrderStatusCountsResponse['data']['counts']) => {
  const total = Object.values(orderCounts).reduce((sum, count) => sum + (count ?? 0), 0)
  const validationCount = (orderCounts.VALIDATION_IN_PROGRESS ?? 0)
    + (orderCounts.VALIDATION_SUCCESS ?? 0)
    + (orderCounts.VALIDATION_FAILURE ?? 0)
  const active = orderCounts.UNPLANNED
    + orderCounts.IN_PROGRESS
    + orderCounts.PLANNED
    + orderCounts.PARTIALLY_PLANNED
    + validationCount
  const completed = orderCounts.DELIVERED + orderCounts.PARTIALLY_DELIVERED
  const inTransit = orderCounts.DISPATCHED
  const issues = orderCounts.FAILED + orderCounts.DELETED + (orderCounts.PLANNING_CORE_FAILED ?? 0)

  return {
    totalOrders: total,
    activeOrders: active,
    completedOrders: completed,
    inTransitOrders: inTransit,
    issueOrders: issues,
    plannedOrders: orderCounts.PLANNED,
    unplannedOrders: orderCounts.UNPLANNED,
    inProgressOrders: orderCounts.IN_PROGRESS,
    partiallyPlannedOrders: orderCounts.PARTIALLY_PLANNED,
    dispatchedOrders: orderCounts.DISPATCHED,
    deliveredOrders: orderCounts.DELIVERED,
    partiallyDeliveredOrders: orderCounts.PARTIALLY_DELIVERED,
    failedOrders: orderCounts.FAILED,
    deletedOrders: orderCounts.DELETED
  }
}
