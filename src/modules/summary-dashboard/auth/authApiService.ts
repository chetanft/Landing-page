/**
 * Authentication API service for FreightTiger
 */

import { TokenManager, AuthTokens, UserContext } from './tokenManager'
import CryptoJS from 'crypto-js'

// Helper to build API URL - avoids circular dependency with ftTmsClient
const buildAuthApiUrl = (path: string): string => {
  const envBaseUrl = import.meta.env.VITE_FT_TMS_API_BASE_URL
  // If proxy is configured (starts with /__ft_tms), use it
  if (envBaseUrl && envBaseUrl.startsWith('/__ft_tms')) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    // Path should be: /__ft_tms/api/authentication/v1/auth/login
    return `${envBaseUrl}${normalizedPath}`
  }
  // Otherwise use direct URL
  return path.startsWith('http') ? path : `https://api.freighttiger.com${path}`
}

// Helper for non-auth API URLs (e.g., desks)
const buildApiUrl = (path: string): string => {
  const envBaseUrl = import.meta.env.VITE_FT_TMS_API_BASE_URL
  if (envBaseUrl && envBaseUrl.startsWith('/__ft_tms')) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${envBaseUrl}${normalizedPath}`
  }
  return path.startsWith('http') ? path : `https://api.freighttiger.com${path}`
}

export interface LoginRequest {
  username?: string
  email?: string
  password: string
  uniqueId?: string
  appId?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  user: {
    id: string
    email: string
    name: string
    organizationId: string
    branchId: string
    role: string
    permissions: string[]
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn: number
  tokenType: string
  user?: {
    id: string
    email: string
    name: string
    organizationId: string
    branchId: string
    role: string
    permissions: string[]
  }
}

export interface Desk {
  fteid: string
  parent_fteid?: string
  name?: string
  role_fteid?: string
}

export interface DeskTokenResponse {
  auth_token?: string
  refresh_token?: string
}

export interface ValidateTokenResponse {
  valid: boolean
  user?: {
    id: string
    email: string
    name: string
    organizationId: string
    branchId: string
    role: string
    permissions: string[]
  }
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthApiService {
  // Use proxy path if available (when FT_TMS_API_BASE_URL is set), otherwise use direct URL
  // In development with proxy: /__ft_tms/api/authentication/v1/auth/login
  // Without proxy or production: https://api.freighttiger.com/api/authentication/v1/auth/login
  private static getBaseUrl(): string {
    const envBaseUrl = import.meta.env.VITE_FT_TMS_API_BASE_URL
    // If proxy is configured (starts with /__ft_tms), use it
    if (envBaseUrl && envBaseUrl.startsWith('/__ft_tms')) {
      return buildAuthApiUrl('/api/authentication/v1/auth/login')
    }
    // Otherwise use direct URL (may have CORS issues)
    return import.meta.env.VITE_FT_TMS_AUTH_URL || 'https://api.freighttiger.com/api/authentication/v1/auth/login'
  }
  private static readonly UNIQUE_ID = import.meta.env.VITE_FT_TMS_UNIQUE_ID || ''
  private static readonly APP_ID = import.meta.env.VITE_FT_TMS_APP_ID || 'web'

  /**
   * Common headers for auth API calls
   */
  private static getHeaders(includeAuth: boolean = false, contentType: string = 'application/json'): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': contentType,
    }

    // Add x-ft-unique-id header for login requests
    if (this.UNIQUE_ID && contentType === 'application/x-www-form-urlencoded') {
      headers['x-ft-unique-id'] = this.UNIQUE_ID
    }

    if (includeAuth) {
      const token = TokenManager.getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  /**
   * Handle API response errors
   */
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Request failed with status: ${response.status}`

      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If error response is not JSON, use status-based message
        switch (response.status) {
          case 401:
            errorMessage = 'Invalid credentials or session expired'
            break
          case 403:
            errorMessage = 'Access forbidden'
            break
          case 404:
            errorMessage = 'Service not found'
            break
          case 422:
            errorMessage = 'Invalid input data'
            break
          case 429:
            errorMessage = 'Too many requests. Please try again later'
            break
          case 500:
            errorMessage = 'Server error. Please try again later'
            break
        }
      }

      throw new AuthenticationError(errorMessage, response.status)
    }

    return response.json()
  }

  /**
   * Login user with username/email and password
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Use username or email (username takes precedence)
      const username = (credentials.username || credentials.email || '').trim()
      if (!username || !credentials.password) {
        throw new AuthenticationError('Username/email and password are required')
      }

      // Use provided uniqueId/appId or fall back to environment variables
      const appId = credentials.appId || this.APP_ID
      const dynamicId = `${Date.now()}${crypto.randomUUID()}`

      const encryptPassword = (userName: string, plainPassword: string, dynamicSeed: string) => {
        // FT app uses: SHA256(username + dynamicId) as key, AES encrypts password
        const key = CryptoJS.SHA256(`${userName}${dynamicSeed}`).toString(CryptoJS.enc.Hex)
        return CryptoJS.AES.encrypt(plainPassword, key).toString()
      }

      // Build JSON body (matches FT app)
      const bodyPayload = {
        username,
        password: encryptPassword(username, credentials.password, dynamicId),
        grant_type: 'password',
        app_id: appId
      }

      // Build headers - Origin/Referer will be set by browser/proxy
      // FT app sends x-ft-unique-id (dynamicId) for login
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-ft-unique-id': dynamicId
      }

      const response = await fetch(this.getBaseUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        credentials: 'include' // Include cookies for CORS
      })

      const data = await this.handleResponse<any>(response)

      // Extract token from various possible response formats
      const authToken = data.auth_token
        || data.data?.auth_token
      const accessToken = data.access_token
        || data.accessToken
        || data.token
        || data.data?.access_token
        || data.data?.token
        || authToken
      const chosenToken = authToken || accessToken
      const refreshToken = data.refresh_token
        || data.refreshToken
        || data.data?.refresh_token
        || data.data?.refreshToken
        || data.data?.refresh_token
      const expiresIn = data.expires_in
        || data.expiresIn
        || data.data?.expires_in
        || data.data?.expiresIn
        || 3600
      const tokenType = data.token_type || data.tokenType || data.data?.token_type || 'Bearer'

      if (!chosenToken) {
        throw new AuthenticationError('Invalid response from login API: missing access token')
      }
      if (import.meta.env.DEV) {
        const tokenInfo = {
          accessTokenLen: accessToken ? accessToken.length : 0,
          authTokenLen: authToken ? authToken.length : 0,
          chosen: authToken ? 'auth_token' : 'access_token'
        }
        console.log('[AuthApiService] login token lengths:', tokenInfo)
      }

      // Extract user info from JWT token (the API doesn't return user data separately)
      let userData: any = data.user || data.data?.user || data.userData || {}
      
      // Decode JWT to extract user context if not in response
      if (!userData.id && !userData.name) {
        try {
      const tokenParts = chosenToken.split('.')
          if (tokenParts.length === 3) {
            const payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(atob(payload))
            const ucv = decoded?.ucv || {}
            const firstName = ucv.firstname || ucv.firstName || ''
            const lastName = ucv.lastname || ucv.lastName || ''
            userData = {
              id: String(ucv.id || decoded.sub || ''),
              email: ucv.email || username,
              name: firstName && lastName ? `${firstName} ${lastName}` : (ucv.name || firstName || ''),
              organizationId: String(ucv.companyId || ucv.entity_guid?.replace('COM-', '') || ''),
              branchId: String(ucv.groupId || ucv.desk_parent_fteid?.replace('COM-', '') || ''),
              role: ucv.role_fteid || decoded.role || 'user',
              permissions: ucv.permissions || []
            }
          }
        } catch (e) {
          console.warn('Failed to decode JWT for user data:', e)
        }
      }
      
      // Build LoginResponse
      const loginResponse: LoginResponse = {
        accessToken: chosenToken,
        refreshToken: refreshToken || '',
        expiresIn: typeof expiresIn === 'number' ? expiresIn : parseInt(expiresIn, 10),
        tokenType,
        user: {
          id: userData.id || userData.userId || userData.user_id || '',
          email: userData.email || username,
          name: userData.name || userData.fullName || userData.full_name || '',
          organizationId: userData.organizationId || userData.orgId || userData.organization_id || '',
          branchId: userData.branchId || userData.branch_id || '',
          role: userData.role || userData.userRole || userData.user_role || '',
          permissions: userData.permissions || userData.permission || []
        }
      }

      return loginResponse
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError(`Network error during login: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const storedUserId = TokenManager.getUserContext()?.userId
      let userId = storedUserId
      if (!userId) {
        const accessToken = TokenManager.getAccessToken()
        if (accessToken) {
          try {
            const payload = accessToken.split('.')[1]
            if (payload) {
              const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
              const decoded = JSON.parse(atob(normalized))
              const ucv = decoded?.ucv || {}
              userId = String(ucv.id || decoded.sub || decoded.userId || '')
            }
          } catch {
            // Ignore decode errors; refresh will fail if userId is required.
          }
        }
      }

      const headers = this.getHeaders()
      if (userId) {
        headers['x-ft-userid'] = userId
      }

      const response = await fetch(`${this.getBaseUrl()}/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          refreshToken
        })
      })

      const data = await this.handleResponse<RefreshTokenResponse>(response)

      // Validate response structure
      if (!data.accessToken) {
        throw new AuthenticationError('Invalid response from refresh token API')
      }

      return data
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Network error during token refresh')
    }
  }

  /**
   * Fetch available desks for the logged-in user (FT app flow)
   */
  static async getDesks(): Promise<Desk[]> {
    const token = TokenManager.getAccessToken()
    if (!token) {
      throw new AuthenticationError('No login token available for desks')
    }

    const response = await fetch(buildApiUrl('/api/entity-service/v1/desk'), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'source': 'platform'
      }
    })

    const data = await this.handleResponse<any>(response)
    return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
  }

  /**
   * Fetch desk-specific token (FT app uses this for desk/indent flows)
   */
  static async getDeskToken(deskFteid: string): Promise<DeskTokenResponse> {
    const loginToken = TokenManager.getAccessToken()
    if (!loginToken) {
      throw new AuthenticationError('No login token available for desk token')
    }

    const response = await fetch(buildAuthApiUrl(`/api/authentication/v1/auth/token/desk/${deskFteid}`), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // FT app sends login token in `token` header for desk login
        'token': loginToken
      }
    })

    const data = await this.handleResponse<any>(response)
    if (import.meta.env.DEV) {
      const authTokenLen = data?.auth_token?.length || data?.data?.auth_token?.length || 0
      console.log('[AuthApiService] desk token length:', authTokenLen)
    }
    return {
      auth_token: data?.auth_token || data?.data?.auth_token,
      refresh_token: data?.refresh_token || data?.data?.refresh_token
    }
  }

  /**
   * Logout user (invalidate token on server)
   */
  static async logout(): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/logout`, {
        method: 'POST',
        headers: this.getHeaders(true)
      })

      // Don't throw on logout errors - just log them
      if (!response.ok) {
        console.warn('Server-side logout failed:', response.status)
      }
    } catch (error) {
      console.warn('Network error during logout:', error)
      // Don't throw - logout should always succeed locally
    }
  }

  /**
   * Validate current token
   */
  static async validateToken(): Promise<ValidateTokenResponse> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/validate`, {
        method: 'GET',
        headers: this.getHeaders(true)
      })

      return this.handleResponse<ValidateTokenResponse>(response)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Network error during token validation')
    }
  }

  /**
   * Request password reset
   */
  static async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/forgot-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      })

      await this.handleResponse<void>(response)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Network error during password reset request')
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/reset-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      })

      await this.handleResponse<void>(response)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Network error during password reset')
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(): Promise<UserContext> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/profile`, {
        method: 'GET',
        headers: this.getHeaders(true)
      })

      const data = await this.handleResponse<{
        id: string
        email: string
        name: string
        organizationId: string
        branchId: string
        role: string
        permissions: string[]
      }>(response)

      return {
        userId: data.id,
        email: data.email,
        name: data.name,
        orgId: data.organizationId,
        branchId: data.branchId,
        userRole: data.role
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Network error during profile fetch')
    }
  }
}

/**
 * Utility functions for auth integration
 */
export const authUtils = {
  /**
   * Convert API login response to tokens and user context
   */
  convertLoginResponse(response: LoginResponse): { tokens: AuthTokens, userContext: UserContext } {
    const tokens = TokenManager.createTokensFromResponse({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      tokenType: response.tokenType
    })

    const userContext: UserContext = {
      userId: response.user.id,
      email: response.user.email,
      name: response.user.name,
      orgId: response.user.organizationId,
      branchId: response.user.branchId,
      userRole: response.user.role
    }

    return { tokens, userContext }
  },

  /**
   * Convert API refresh response to tokens and optional user context
   */
  convertRefreshResponse(response: RefreshTokenResponse): { tokens: AuthTokens, userContext?: UserContext } {
    const tokens = TokenManager.createTokensFromResponse({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      tokenType: response.tokenType
    })

    let userContext: UserContext | undefined

    if (response.user) {
      userContext = {
        userId: response.user.id,
        email: response.user.email,
        name: response.user.name,
        orgId: response.user.organizationId,
        branchId: response.user.branchId,
        userRole: response.user.role
      }
    }

    return { tokens, userContext }
  }
}