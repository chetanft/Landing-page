import { TokenManager } from '../../auth/tokenManager'
import { realApiService } from '../realApiService'
import type {
  GlobalFilters,
  FilterId,
  OrdersMasterSearchPayload,
  CustomDataTemplateField
} from './ordersTypes'

// Cache for custom data template (session-scoped)
let customDataTemplateCache: CustomDataTemplateField[] | null = null
let customDataTemplatePromise: Promise<CustomDataTemplateField[]> | null = null

const isBranchFteid = (value?: string | null) =>
  Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))

/**
 * Resolve branch/location context for orders API
 * Falls back through: globalFilters.locationId -> user settings -> company hierarchy -> env var -> user context
 */
export async function resolveOrdersContext(globalFilters: GlobalFilters): Promise<string | undefined> {
  const isAllLocations =
    !globalFilters.locationId ||
    globalFilters.locationId === '' ||
    globalFilters.locationName === 'All Locations'
  if (isAllLocations) {
    return undefined
  }

  // 1. Check globalFilters.locationId
  if (globalFilters.locationId && isBranchFteid(globalFilters.locationId)) {
    return globalFilters.locationId
  }

  // 2. Check environment variable
  const envBranch = import.meta.env.VITE_FT_TMS_BRANCH_FTEID
  if (envBranch) {
    return envBranch
  }

  // 3. Check user context from token
  const userContext = TokenManager.getUserContext()
  if (userContext?.branchId) {
    return userContext.branchId
  }

  // 4. Try user settings API
  try {
    const userSettings = await realApiService.getUserSettings()
    const lastBranch = userSettings?.data?.lastSelectedBranch
    if (lastBranch) {
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
      branch.fteid
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
      customDataTemplateCache = []
      return []
    }
  })()

  return customDataTemplatePromise
}

/**
 * Clear custom data template cache (for logout/session reset)
 */
export function clearCustomDataTemplateCache(): void {
  customDataTemplateCache = null
  customDataTemplatePromise = null
}

/**
 * Build master search payload for orders API
 */
export function buildOrdersMasterSearchPayload(
  filters: Set<FilterId>,
  globalFilters: GlobalFilters,
  page: number,
  pageSize: number,
  branchFteid?: string
): OrdersMasterSearchPayload {
  const payload: OrdersMasterSearchPayload = {
    page,
    size: pageSize,
    group_fteid: null,
    branch_fteid: isBranchFteid(branchFteid) ? branchFteid! : null,
    sort: ['-updatedAt'],
    filters: [
      {
        field: 'STATUS',
        operator: 'in',
        value: ['UNPLANNED', 'PARTIALLY_PLANNED', 'PLANNED', 'DISPATCHED']
      }
    ],
    includeDeletedOnly: false
  }

  if (filters.size === 0 && !globalFilters.dateRange) {
    return payload
  }

  if (globalFilters.dateRange?.start && globalFilters.dateRange?.end) {
    payload.filters.push(
      {
        field: 'CREATED_AT',
        operator: '>=',
        value: globalFilters.dateRange.start.getTime()
      },
      {
        field: 'CREATED_AT',
        operator: '<=',
        value: globalFilters.dateRange.end.getTime()
      }
    )
  }

  return payload
}
