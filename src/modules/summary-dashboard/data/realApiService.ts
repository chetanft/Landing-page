import { buildFtTmsUrl, ftTmsFetch, resolveUserContext } from './ftTmsClient'
import { TokenManager } from '../auth/tokenManager'

// Real API integration for FreightTiger TMS
const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '')
const isBranchFteid = (value?: string | null) =>
  Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))

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

type PlanningAuthPreference = 'auto' | 'desk' | 'login'

const ORDERS_MASTER_SEARCH_PATH = '/orders/master-search'

const selectPlanningToken = (path: string, preference: PlanningAuthPreference) => {
  const deskToken = TokenManager.getDeskToken()
  const loginToken = TokenManager.getAccessToken()

  if (preference === 'desk') {
    return {
      token: deskToken || loginToken || null,
      source: deskToken ? 'desk' : (loginToken ? 'login' : 'none')
    }
  }
  if (preference === 'login') {
    return {
      token: loginToken || deskToken || null,
      source: loginToken ? 'login' : (deskToken ? 'desk' : 'none')
    }
  }

  // Orders master search requires desk token with permissions
  const requiresDeskToken = path.includes(ORDERS_MASTER_SEARCH_PATH)
  if (requiresDeskToken) {
    return {
      token: deskToken || loginToken || null,
      source: deskToken ? 'desk' : (loginToken ? 'login' : 'none')
    }
  }

  const preferDesk = path.startsWith('/orders/')
  if (preferDesk && deskToken) return { token: deskToken, source: 'desk' }
  if (loginToken) return { token: loginToken, source: 'login' }
  if (deskToken) return { token: deskToken, source: 'desk' }
  return { token: null, source: 'none' }
}

const planningFetch = async (
  path: string,
  options: RequestInit = {},
  preference: PlanningAuthPreference = 'auto'
) => {
  const baseUrl = getPlanningBaseUrl()

  const doFetch = async (baseUrl: string, token: string | null, source: string) => {
    const url = `${baseUrl}${path}`
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
      if (import.meta.env.DEV) {
        console.log(`[planningFetch] Using ${source} token (len=${token.length})`)
      }
    } else if (import.meta.env.DEV) {
      console.warn('[planningFetch] No token available for planning API request')
    }

    const userContext = resolveUserContext(token || undefined) ?? TokenManager.getUserContext()
    if (userContext?.orgId) {
      headers['X-FT-ORGID'] = userContext.orgId
    }
    if (userContext?.userId) {
      headers['X-FT-USERID'] = userContext.userId
    }
    if (!path.includes(ORDERS_MASTER_SEARCH_PATH)) {
      const existingBranchHeader = Object.prototype.hasOwnProperty.call(headers, 'branch-code')
      if (!existingBranchHeader) {
        const branchCode = userContext?.branchId || import.meta.env.VITE_FT_TMS_BRANCH_FTEID || ''
        if (isBranchFteid(branchCode)) {
          headers['branch-code'] = branchCode
        }
      }
    }

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

  const primary = selectPlanningToken(path, preference)
  return doFetch(baseUrl, primary.token, primary.source)
}

const BASE_URL = buildFtTmsUrl('/planning-engine-service/v1/api')
const ACCESS_CONTROL_BASE_URL = buildFtTmsUrl('/api/access-control/v1')
const ENTITY_SERVICE_BASE_URL = buildFtTmsUrl('/api/entity-service/v1')
const EQS_BASE_URL = buildFtTmsUrl('/api/eqs/v1')

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

export interface BatchSearchRequest {
  page: number
  size: number
  group_fteid?: string | null
  branch_fteid?: string | null
  filters?: Array<{
    field: string
    operator: string
    value: string[] | number[] | string | number | null
  }>
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
      company_fteid?: string
      company_name?: string
      company_code?: string
      company_status?: string
      short_code?: string
      old_branch_id?: number
    }>
    groups: any[]
    company?: {
      fteid?: string
      name?: string
      company_code?: string
      status?: string
    }
    parent_company?: {
      fteid?: string
      name?: string
      company_code?: string
      status?: string
    }
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

export interface CompanyDetailsResponse {
  success: boolean
  data: Array<{
    fteid: string
    name?: string
    company_code?: string
    status?: string
    is_active?: boolean
  }>
}

export interface AccessRoleResponse {
  success: boolean
  data: {
    role_id: string
    name: string
    description?: string
    entity_type?: string[]
    permissions?: string[]
    organization_id?: string
    group_id?: string
    verified?: boolean
  }
}

const accessControlFetch = async (path: string, options: RequestInit = {}) => {
  const deskToken = TokenManager.getDeskToken() || TokenManager.getAccessToken()
  if (!deskToken) {
    throw new Error('No token available for access-control request')
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }
  headers.Authorization = `Bearer ${deskToken}`
  headers.token = deskToken

  const userContext = resolveUserContext(deskToken) ?? TokenManager.getUserContext()
  if (userContext?.orgId) {
    headers['X-FT-ORGID'] = userContext.orgId
  }
  if (userContext?.userId) {
    headers['X-FT-USERID'] = userContext.userId
  }

  const response = await fetch(`${ACCESS_CONTROL_BASE_URL}${path}`, {
    ...options,
    method: options.method ?? 'GET',
    headers,
    credentials: 'include'
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Access-control request failed: ${response.status} ${response.statusText} ${errorText}`)
  }

  return response
}

// API Service functions
export const realApiService = {
  // User Settings
  async getUserSettings(): Promise<UserSettingsResponse> {
    const response = await planningFetch('/configurations/user-settings', {}, 'login')
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
    const data: UserSettingsResponse = await response.json()
    const branchFteid = data?.data?.lastSelectedBranch
    if (branchFteid && isBranchFteid(branchFteid)) {
      const currentContext = TokenManager.getUserContext()
      if (currentContext && currentContext.branchId !== branchFteid) {
        const updatedContext = { ...currentContext, branchId: branchFteid }
        TokenManager.setUserContext(updatedContext)
        if (import.meta.env.DEV) {
          console.log('[getUserSettings] Cached branchId from user settings:', branchFteid)
        }
      }
    }
    return data
  },

  // Order Status Counts
  async getOrderStatusCounts(branchFteid?: string): Promise<OrderStatusCountsResponse> {
    const candidateBranch = branchFteid
      || TokenManager.getUserContext()?.branchId
      || import.meta.env.VITE_FT_TMS_BRANCH_FTEID
      || ''
    const resolvedBranch = isBranchFteid(candidateBranch) ? candidateBranch : ''

    const path = resolvedBranch
      ? `/orders/status-counts?branch_fteid=${encodeURIComponent(resolvedBranch)}`
      : '/orders/status-counts'

    const response = await planningFetch(
      path,
      resolvedBranch ? {} : { headers: { 'branch-code': '' } }
    )
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[getOrderStatusCounts] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
      throw new Error(`Failed to fetch order status counts: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Custom Data Template
  async getCustomDataTemplate(entity: string = 'order'): Promise<CustomDataTemplateResponse> {
    const response = await planningFetch(`/custom-data-template/${entity}`, {}, 'login')
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
  async searchBatches(payload: BatchSearchRequest): Promise<BatchSearchResponse> {
    const response = await planningFetch('/batches/master-search', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, 'login')
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (import.meta.env.DEV) {
        console.error('[searchBatches] Planning API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          payload
        })
      }
      throw new Error(`Failed to fetch batches: ${response.status} ${response.statusText}`)
    }
    return response.json()
  },

  // Orders Master Search
  async searchOrdersMaster(payload: OrdersMasterSearchRequest): Promise<OrdersMasterSearchResponse> {
    const response = await planningFetch(ORDERS_MASTER_SEARCH_PATH, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, 'desk')
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
    let branchFteid = TokenManager.getUserContext()?.branchId
      || import.meta.env.VITE_FT_TMS_BRANCH_FTEID
      || ''
    if (!isBranchFteid(branchFteid)) {
      try {
        const userSettings = await realApiService.getUserSettings()
        const lastBranch = userSettings?.data?.lastSelectedBranch
        if (isBranchFteid(lastBranch)) {
          branchFteid = lastBranch
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[getCompanyHierarchy] Failed to resolve branch from user settings:', error)
        }
      }
    }
    if (!isBranchFteid(branchFteid)) {
      throw new Error('No valid branch selected for company hierarchy request')
    }

    const response = await planningFetch(
      `/external-services/eqs/company/child?branch_fteid=${encodeURIComponent(branchFteid)}`,
      {},
      'desk'
    )
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
    const response = await planningFetch('/views/selected/orders', {}, 'login')
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
    const response = await accessControlFetch('/accessControl/permissions')
    return response.json()
  },

  // Access Control Role Details
  async getRoleDetails(roleFteid: string): Promise<AccessRoleResponse> {
    const response = await accessControlFetch(`/accessControl/roles/fteid/${encodeURIComponent(roleFteid)}`)
    return response.json()
  },

  // Company Details (Entity Service, login token)
  async getCompanyDetailsEntityService(companyFteid: string): Promise<CompanyDetailsResponse> {
    const response = await ftTmsFetch(`${ENTITY_SERVICE_BASE_URL}/company/${encodeURIComponent(companyFteid)}`)
    return response.json()
  },

  // Company Details (EQS, desk token)
  async getCompanyDetailsEqs(companyFteid: string): Promise<CompanyDetailsResponse> {
    const response = await ftTmsFetch(`${EQS_BASE_URL}/company/${encodeURIComponent(companyFteid)}`)
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
