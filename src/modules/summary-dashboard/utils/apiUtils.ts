/**
 * Utility functions for API calls with authentication support
 */

import { TokenManager } from '../auth/tokenManager'
import { AuthApiService, AuthenticationError } from '../auth/authApiService'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public url: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Get standard headers for FreightTiger API calls
 */
export const getStandardHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  // Add authentication headers
  const token = TokenManager.getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Add organization and branch context headers
  const userContext = TokenManager.getUserContext()
  if (userContext) {
    headers['X-Org-Id'] = userContext.orgId
    headers['X-Branch-Id'] = userContext.branchId
    headers['X-User-Role'] = userContext.userRole
    headers['X-User-Id'] = userContext.userId
  }

  return headers
}

/**
 * Check if token needs refresh and handle it
 */
const handleTokenRefresh = async (): Promise<void> => {
  if (!TokenManager.isTokenExpired()) {
    return
  }

  const refreshToken = TokenManager.getRefreshToken()
  if (!refreshToken) {
    throw new AuthenticationError('No refresh token available')
  }

  try {
    const response = await AuthApiService.refreshToken(refreshToken)
    const tokens = TokenManager.createTokensFromResponse({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || refreshToken,
      expiresIn: response.expiresIn,
      tokenType: response.tokenType
    })

    TokenManager.setTokens(tokens)

    if (response.user) {
      const userContext = {
        userId: response.user.id,
        email: response.user.email,
        name: response.user.name,
        orgId: response.user.organizationId,
        branchId: response.user.branchId,
        userRole: response.user.role
      }
      TokenManager.setUserContext(userContext)
    }
  } catch (error) {
    TokenManager.clearAuth()
    throw new AuthenticationError('Token refresh failed')
  }
}

/**
 * Handle authentication errors and trigger auth flow
 */
const handleAuthenticationError = (url: string, status: number): void => {
  TokenManager.clearAuth()

  // Dispatch custom event for auth error handling
  window.dispatchEvent(new CustomEvent('auth:required', {
    detail: { url, status }
  }))

  throw new AuthenticationError('Authentication required')
}

/**
 * Enhanced fetch wrapper with authentication and retry logic
 */
export const apiFetch = async (
  url: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> => {
  const maxRetries = 3

  try {
    // Check and refresh token if needed (only for authenticated requests)
    const requiresAuth = !url.includes('/auth/')
    if (requiresAuth) {
      await handleTokenRefresh()
    }

    const standardHeaders = getStandardHeaders()
    const response = await fetch(url, {
      ...options,
      headers: {
        ...standardHeaders,
        ...(options.headers || {})
      }
    })

    // Handle authentication errors
    if (response.status === 401) {
      if (requiresAuth) {
        handleAuthenticationError(url, response.status)
      } else {
        // Auth endpoint returned 401 - invalid credentials
        throw new ApiError('Authentication failed', response.status, response.statusText, url)
      }
    }

    // Handle other client errors
    if (response.status >= 400 && response.status < 500) {
      let errorMessage = `Request failed with status: ${response.status}`

      try {
        const errorData = await response.clone().json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If response is not JSON, use status-based message
      }

      throw new ApiError(errorMessage, response.status, response.statusText, url)
    }

    // Handle server errors with retry logic
    if (response.status >= 500) {
      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))

        console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        return apiFetch(url, options, retryCount + 1)
      }

      throw new ApiError(
        `Server error after ${maxRetries} retries`,
        response.status,
        response.statusText,
        url
      )
    }

    return response
  } catch (error) {
    // Handle network errors with retry
    if (error instanceof TypeError && error.message.includes('fetch')) {
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))

        console.warn(`Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`)
        return apiFetch(url, options, retryCount + 1)
      }

      throw new ApiError(
        'Network error after retries',
        0,
        'Network Error',
        url
      )
    }

    // Re-throw other errors
    throw error
  }
}

/**
 * Utility function to check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return TokenManager.isAuthenticated()
}

/**
 * Utility function to get current user context
 */
export const getCurrentUser = () => {
  return TokenManager.getUserContext()
}

/**
 * Utility function to check if API error is authentication related
 */
export const isAuthError = (error: unknown): boolean => {
  if (error instanceof AuthenticationError) {
    return true
  }
  if (error instanceof ApiError && error.status === 401) {
    return true
  }
  return false
}