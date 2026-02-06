import { ftTmsFetch } from '../ftTmsClient'
import { TokenManager } from '../../auth/tokenManager'
import { ensureAuthReady } from '../../auth/authGate'
import {
  planningFetch,
  accessControlFetch,
  isBranchFteid,
  ENTITY_SERVICE_BASE_URL,
  EQS_BASE_URL,
  ORDERS_MASTER_SEARCH_PATH
} from './realClient'
import type {
  UserSettingsResponse,
  OrderStatusCountsResponse,
  CustomDataTemplateResponse,
  BatchSearchRequest,
  BatchSearchResponse,
  OrdersMasterSearchRequest,
  OrdersMasterSearchResponse,
  CompanyHierarchyResponse,
  PermissionsResponse,
  CompanyDetailsResponse,
  AccessRoleResponse
} from './realTypes'

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
    const authOk = await ensureAuthReady(true, 10000)
    if (!authOk) {
      if (import.meta.env.DEV) {
        console.warn('[searchOrdersMaster] Auth not ready (desk token required), returning empty result')
      }
      return {
        success: true,
        statusCode: 200,
        data: {
          data: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: payload.page,
            pageSize: payload.size
          }
        },
        message: 'Auth not ready',
        timestamp: new Date().toISOString()
      }
    }

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
