// Types for Real API responses

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

export type PlanningAuthPreference = 'auto' | 'desk' | 'login'
