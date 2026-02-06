import { buildFtTmsUrl, resolveUserContext } from '../ftTmsClient'
import { TokenManager } from '../../auth/tokenManager'
import { AuthApiService } from '../../auth/authApiService'
import type { PlanningAuthPreference } from './realTypes'

// URL helpers
const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '')

export const isBranchFteid = (value?: string | null) =>
  Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))

export const getPlanningBaseUrl = () => {
  const override = import.meta.env.VITE_PLANNING_API_BASE_URL
  if (override && override.trim().length > 0) {
    return normalizeBaseUrl(override)
  }
  if (import.meta.env.DEV) {
    return '/__planning/planning-engine-service/v1/api'
  }
  return 'https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api'
}

export const ACCESS_CONTROL_BASE_URL = buildFtTmsUrl('/api/access-control/v1')
export const ENTITY_SERVICE_BASE_URL = buildFtTmsUrl('/api/entity-service/v1')
export const EQS_BASE_URL = buildFtTmsUrl('/api/eqs/v1')

export const ORDERS_MASTER_SEARCH_PATH = '/orders/master-search'

// Desk token management
let deskTokenPromise: Promise<void> | null = null

export const ensureDeskTokenForPlanning = async (): Promise<void> => {
  if (TokenManager.getDeskToken()) return
  if (deskTokenPromise) return deskTokenPromise

  deskTokenPromise = (async () => {
    const loginToken = TokenManager.getAccessToken()
    if (!loginToken) {
      if (import.meta.env.DEV) {
        console.warn('[ensureDeskTokenForPlanning] No login token available')
      }
      return
    }

    const desks = await AuthApiService.getDesks()
    const firstDesk = desks?.[0]
    if (!firstDesk?.fteid) {
      if (import.meta.env.DEV) {
        console.warn('[ensureDeskTokenForPlanning] No desks available for desk token')
      }
      return
    }

    const deskBranchCandidate =
      (firstDesk as any).branch_fteid ||
      (firstDesk as any).branchFteid ||
      (firstDesk as any).branch_id ||
      (firstDesk as any).branchId ||
      firstDesk.parent_fteid ||
      (firstDesk as any).parentFteid
    const userContext = TokenManager.getUserContext()
    if (userContext && isBranchFteid(deskBranchCandidate)) {
      TokenManager.setUserContext({ ...userContext, branchId: String(deskBranchCandidate) })
    }

    const deskTokenResponse = await AuthApiService.getDeskToken(firstDesk.fteid)
    if (deskTokenResponse?.auth_token) {
      TokenManager.setDeskTokens({
        accessToken: deskTokenResponse.auth_token,
        refreshToken: deskTokenResponse.refresh_token,
        expiresAt: Date.now() + (12 * 60 * 60 * 1000),
        tokenType: 'Bearer'
      })
      if (import.meta.env.DEV) {
        console.log('[ensureDeskTokenForPlanning] Stored desk token length:', deskTokenResponse.auth_token.length)
      }
    } else if (import.meta.env.DEV) {
      console.warn('[ensureDeskTokenForPlanning] Desk token missing in response')
    }
  })()
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.warn('[ensureDeskTokenForPlanning] Failed to fetch desk token:', error)
      }
    })
    .finally(() => {
      deskTokenPromise = null
    })

  return deskTokenPromise
}

export const selectPlanningToken = (path: string, preference: PlanningAuthPreference) => {
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

export const planningFetch = async (
  path: string,
  options: RequestInit = {},
  preference: PlanningAuthPreference = 'auto'
) => {
  const baseUrl = getPlanningBaseUrl()
  const requiresDeskToken = preference === 'desk' || path.includes(ORDERS_MASTER_SEARCH_PATH)
  if (requiresDeskToken && !TokenManager.getDeskToken()) {
    await ensureDeskTokenForPlanning()
  }

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

export const accessControlFetch = async (path: string, options: RequestInit = {}) => {
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
