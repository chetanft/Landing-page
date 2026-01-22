import { TokenManager, type UserContext } from '../auth/tokenManager'
import { AuthenticationError } from '../auth/authApiService'

const DEFAULT_BASE_URL = '/__ft_tms'

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '')

const isMockUserContext = (context: UserContext | null) =>
  context?.userId === 'test-user-123' || context?.orgId === 'company-123'

const decodeTokenPayload = (tokenValue: string) => {
  try {
    const payload = tokenValue.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

export const resolveUserContext = (token?: string | null): UserContext | null => {
  if (token) {
    const decoded = decodeTokenPayload(token)
    if (decoded) {
      const ucv = decoded?.ucv || {}
      const firstName = ucv.firstName ?? ucv.firstname
      const lastName = ucv.lastName ?? ucv.lastname
      return {
        userId: String(ucv.id ?? decoded.sub ?? decoded.userId ?? 'unknown'),
        email: String(ucv.email ?? decoded.email ?? 'unknown'),
        name: firstName && lastName
          ? `${firstName} ${lastName}`
          : (ucv.name ?? decoded.name),
        orgId: String(ucv.companyId ?? decoded.companyId ?? decoded.orgId ?? ''),
        branchId: String(ucv.groupId ?? decoded.groupId ?? decoded.branchId ?? ''),
        userRole: String(ucv.role_fteid ?? decoded.role_fteid ?? decoded.role ?? 'user')
      }
    }
  }

  const stored = TokenManager.getUserContext()
  if (stored && !isMockUserContext(stored)) return stored
  return null
}

const getFtTmsBaseUrl = () => {
  const envBaseUrl = import.meta.env.VITE_FT_TMS_API_BASE_URL
  if (envBaseUrl && envBaseUrl.trim().length > 0) {
    return normalizeBaseUrl(envBaseUrl)
  }

  return DEFAULT_BASE_URL
}

export const buildFtTmsUrl = (pathOrUrl: string) => {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  if (pathOrUrl.startsWith(DEFAULT_BASE_URL)) {
    return pathOrUrl
  }

  const baseUrl = getFtTmsBaseUrl()
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${baseUrl}${normalizedPath}`
}

export const ftTmsFetch = async (pathOrUrl: string, options: RequestInit = {}): Promise<Response> => {
  const url = buildFtTmsUrl(pathOrUrl)
  
  // Get authentication token from storage (from login API)
  const token = TokenManager.getAccessToken()
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  
  // Most APIs use Authorization: Bearer <token> format
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    headers['token'] = token
    if (import.meta.env.DEV) {
      console.log(`[ftTmsFetch] Using token: ${token.substring(0, 30)}... (length: ${token.length})`)
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn(`[ftTmsFetch] No token available from storage`)
    }
  }
  
  // Add user context headers if available (derive from token if stored context is mock)
  const userContext = resolveUserContext(token)
  if (userContext) {
    headers['X-Org-Id'] = userContext.orgId
    headers['X-Branch-Id'] = userContext.branchId
    headers['X-User-Role'] = userContext.userRole
    headers['X-User-Id'] = userContext.userId
    headers['X-FT-ORGID'] = userContext.orgId
    headers['X-FT-USERID'] = userContext.userId
    if (import.meta.env.DEV) {
      console.log(`[ftTmsFetch] User context:`, { orgId: userContext.orgId, branchId: userContext.branchId, userId: userContext.userId, role: userContext.userRole })
    }
  } else if (import.meta.env.DEV) {
    console.warn(`[ftTmsFetch] No user context available`)
  }
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers
  })

  if (!response.ok) {
    let errorMessage = `FT TMS request failed (${response.status})`
    try {
      const errorBody = await response.clone().json()
      errorMessage = errorBody.message || errorBody.error || errorMessage
    } catch {
      // Ignore parse errors and keep the generic message.
    }

    console.error('FT TMS API error:', { url, status: response.status, message: errorMessage })
    
    // Throw AuthenticationError for 401 responses
    if (response.status === 401) {
      throw new AuthenticationError(errorMessage, response.status)
    }
    
    // Throw generic Error for other status codes
    throw new Error(errorMessage)
  }

  return response
}
