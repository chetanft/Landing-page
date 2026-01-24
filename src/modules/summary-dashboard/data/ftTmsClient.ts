import { TokenManager, type UserContext } from '../auth/tokenManager'
import { AuthApiService, AuthenticationError, PermissionError, authUtils } from '../auth/authApiService'

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
  const didRetry = (options as { __retried?: boolean }).__retried === true
  const isBranchFteid = (value?: string | null) =>
    Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))

  const applyAuthHeaders = (tokenValue: string | null) => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }

    if (tokenValue) {
      headers['Authorization'] = `Bearer ${tokenValue}`
      headers['token'] = tokenValue
      if (import.meta.env.DEV) {
        console.log(`[ftTmsFetch] Using token: ${tokenValue.substring(0, 30)}... (length: ${tokenValue.length})`)
      }
    } else if (import.meta.env.DEV) {
      console.warn(`[ftTmsFetch] No token available from storage`)
    }

    const userContext = resolveUserContext(tokenValue)
    if (userContext) {
      headers['X-Org-Id'] = userContext.orgId
      headers['X-User-Role'] = userContext.userRole
      headers['X-User-Id'] = userContext.userId
      headers['X-FT-ORGID'] = userContext.orgId
      headers['X-FT-USERID'] = userContext.userId
      if (isBranchFteid(userContext.branchId)) {
        headers['X-Branch-Id'] = userContext.branchId
      }
      if (import.meta.env.DEV) {
        console.log(`[ftTmsFetch] User context:`, { orgId: userContext.orgId, branchId: userContext.branchId, userId: userContext.userId, role: userContext.userRole })
      }
    } else if (import.meta.env.DEV) {
      console.warn(`[ftTmsFetch] No user context available`)
    }

    return headers
  }

  const isEqsRequest = url.includes('/api/eqs/')
  const deskToken = isEqsRequest ? TokenManager.getDeskToken() : null
  const usingDeskToken = Boolean(deskToken)

  // Prefer desk token for EQS requests; otherwise use login/access token.
  let token = deskToken || TokenManager.getAccessToken()
  if (import.meta.env.DEV) {
    try {
      const loginToken = localStorage.getItem('ft_login_token')
      const accessToken = localStorage.getItem('ft_access_token')
      const source = usingDeskToken
        ? 'ft_desk_token'
        : (token === loginToken
          ? 'ft_login_token'
          : (token === accessToken ? 'ft_access_token' : 'unknown'))
      const prefix = token ? `${token.substring(0, 10)}...` : 'none'
      console.log('[ftTmsFetch] Token source:', { source, prefix, isEqsRequest })
    } catch (error) {
      console.warn('[ftTmsFetch] Unable to read token source from localStorage', error)
    }
  }
  if (!usingDeskToken && token && TokenManager.isTokenExpired() && TokenManager.hasRefreshToken()) {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      if (refreshToken) {
        const refreshResponse = await AuthApiService.refreshToken(refreshToken)
        const { tokens, userContext } = authUtils.convertRefreshResponse(refreshResponse)
        TokenManager.setTokens(tokens)
        if (userContext) {
          TokenManager.setUserContext(userContext)
        }
        token = tokens.accessToken
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[ftTmsFetch] Token refresh failed; continuing with existing token')
      }
    }
  }

  let response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: applyAuthHeaders(token)
  })

  if (response.status === 401 && !didRetry && usingDeskToken && TokenManager.hasDeskRefreshToken()) {
    try {
      const refreshToken = TokenManager.getDeskRefreshToken()
      const currentDeskToken = TokenManager.getDeskToken()
      if (refreshToken && currentDeskToken) {
        const refreshResponse = await AuthApiService.refreshDeskToken(refreshToken, currentDeskToken)
        TokenManager.setDeskTokens({
          accessToken: refreshResponse.auth_token || currentDeskToken,
          refreshToken: refreshResponse.refresh_token || refreshToken,
          expiresAt: Date.now() + (12 * 60 * 60 * 1000)
        })
        response = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: applyAuthHeaders(refreshResponse.auth_token || currentDeskToken),
          ...( { __retried: true } as unknown as RequestInit )
        })
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[ftTmsFetch] Desk token refresh after 401 failed')
      }
    }
  }

  if (response.status === 401 && !didRetry && !usingDeskToken && TokenManager.hasRefreshToken()) {
    try {
      const refreshToken = TokenManager.getRefreshToken()
      if (refreshToken) {
        const refreshResponse = await AuthApiService.refreshToken(refreshToken)
        const { tokens, userContext } = authUtils.convertRefreshResponse(refreshResponse)
        TokenManager.setTokens(tokens)
        if (userContext) {
          TokenManager.setUserContext(userContext)
        }
        response = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: applyAuthHeaders(tokens.accessToken),
          ...( { __retried: true } as unknown as RequestInit )
        })
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[ftTmsFetch] Token refresh after 401 failed')
      }
    }
  }

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

    // Throw PermissionError for 403 responses
    if (response.status === 403) {
      throw new PermissionError(errorMessage, response.status)
    }

    // Throw generic Error for other status codes
    throw new Error(errorMessage)
  }

  return response
}
