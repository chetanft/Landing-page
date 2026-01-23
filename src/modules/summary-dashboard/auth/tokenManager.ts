/**
 * Token and user context management for FreightTiger API authentication
 */

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  tokenType?: string
}

export interface UserContext {
  orgId: string
  branchId: string
  userRole: string
  userId: string
  email: string
  name?: string
  permissions?: string[]
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'ft_access_token'
  private static readonly REFRESH_TOKEN_KEY = 'ft_refresh_token'
  private static readonly USER_CONTEXT_KEY = 'ft_user_context'
  private static readonly TOKEN_EXPIRY_KEY = 'ft_token_expiry'
  private static readonly DESK_TOKEN_KEY = 'ft_desk_token'
  private static readonly DESK_REFRESH_TOKEN_KEY = 'ft_desk_refresh_token'

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    try {
      return (
        localStorage.getItem('ft_login_token') ||
        localStorage.getItem(this.ACCESS_TOKEN_KEY)
      )
    } catch (error) {
      console.warn('Error accessing localStorage for token:', error)
      return null
    }
  }

  /**
   * Get stored desk access token (used for indent API in FT app)
   */
  static getDeskToken(): string | null {
    try {
      return localStorage.getItem(this.DESK_TOKEN_KEY)
    } catch (error) {
      console.warn('Error accessing localStorage for desk token:', error)
      return null
    }
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY)
    } catch (error) {
      console.warn('Error accessing localStorage for refresh token:', error)
      return null
    }
  }

  /**
   * Store authentication tokens
   */
  static setTokens(tokens: AuthTokens): void {
    try {
      // Store in standard keys
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken)
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, tokens.expiresAt.toString())

      // Also store in ft_login_token for compatibility with existing code
      localStorage.setItem('ft_login_token', tokens.accessToken)
      
      // Store expiry timestamp for ft_login_token compatibility
      localStorage.setItem('ft_token_expiry', tokens.expiresAt.toString())

      if (tokens.refreshToken) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken)
      }
    } catch (error) {
      console.error('Error storing tokens in localStorage:', error)
      throw new Error('Failed to store authentication tokens')
    }
  }

  /**
   * Store desk tokens (used for indent API in FT app)
   */
  static setDeskTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem(this.DESK_TOKEN_KEY, tokens.accessToken)
      if (tokens.refreshToken) {
        localStorage.setItem(this.DESK_REFRESH_TOKEN_KEY, tokens.refreshToken)
      }
    } catch (error) {
      console.error('Error storing desk tokens in localStorage:', error)
      throw new Error('Failed to store desk authentication tokens')
    }
  }

  /**
   * Get stored user context
   */
  static getUserContext(): UserContext | null {
    try {
      const contextStr = localStorage.getItem(this.USER_CONTEXT_KEY)
      return contextStr ? JSON.parse(contextStr) : null
    } catch (error) {
      console.warn('Error parsing user context from localStorage:', error)
      return null
    }
  }

  /**
   * Store user context
   */
  static setUserContext(context: UserContext): void {
    try {
      localStorage.setItem(this.USER_CONTEXT_KEY, JSON.stringify(context))
    } catch (error) {
      console.error('Error storing user context in localStorage:', error)
      throw new Error('Failed to store user context')
    }
  }

  /**
   * Check if current token is expired
   */
  static isTokenExpired(): boolean {
    try {
      const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
      if (!expiryStr) {
        const token = this.getAccessToken()
        if (!token) return true
        const payloadPart = token.split('.')[1]
        if (!payloadPart) return true
        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(normalized))
        if (!decoded?.exp) return true
        const expMs = decoded.exp * 1000
        const bufferTime = 5 * 60 * 1000
        return Date.now() >= (expMs - bufferTime)
      }

      const expiry = parseInt(expiryStr, 10)
      const now = Date.now()

      // Consider token expired if it expires within the next 5 minutes
      const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
      return now >= (expiry - bufferTime)
    } catch (error) {
      console.warn('Error checking token expiry:', error)
      return true
    }
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(): number | null {
    try {
      const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
      return expiryStr ? parseInt(expiryStr, 10) : null
    } catch (error) {
      console.warn('Error getting token expiry:', error)
      return null
    }
  }

  /**
   * Check if user is authenticated (has valid token and context)
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken()
    const context = this.getUserContext()
    return !!(token && context && !this.isTokenExpired())
  }

  /**
   * Clear all authentication data
   */
  static clearAuth(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY)
      localStorage.removeItem(this.REFRESH_TOKEN_KEY)
      localStorage.removeItem(this.USER_CONTEXT_KEY)
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
      localStorage.removeItem(this.DESK_TOKEN_KEY)
      localStorage.removeItem(this.DESK_REFRESH_TOKEN_KEY)
      // Also clear compatibility keys
      localStorage.removeItem('ft_login_token')
      localStorage.removeItem('ft_desk_token')
      localStorage.removeItem('ft_token_expiry')
    } catch (error) {
      console.error('Error clearing authentication data:', error)
    }
  }

  /**
   * Create auth tokens from API response
   */
  static createTokensFromResponse(response: {
    accessToken: string
    refreshToken?: string
    expiresIn: number
    tokenType?: string
  }): AuthTokens {
    const expiresAt = Date.now() + (response.expiresIn * 1000)

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt,
      tokenType: response.tokenType || 'Bearer'
    }
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  static getTimeUntilExpiry(): number {
    const expiry = this.getTokenExpiry()
    if (!expiry) return 0

    return Math.max(0, expiry - Date.now())
  }

  /**
   * Check if refresh token is available
   */
  static hasRefreshToken(): boolean {
    return !!this.getRefreshToken()
  }
}
