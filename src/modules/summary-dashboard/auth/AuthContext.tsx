import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { TokenManager, UserContext } from './tokenManager'
import { AuthApiService, authUtils } from './authApiService'
import { realApiService } from '../data/realApiService'
import { clearCompanyCache } from '../data/companyApiService'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthContextType {
  user: UserContext | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserContext | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize auth state from stored tokens
   */
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = TokenManager.getAccessToken()
        const storedUser = TokenManager.getUserContext()
        
        // Clear any mock or invalid tokens
        const isMockToken = storedToken === 'mock-jwt-token-for-testing'
        const isMockUser = storedUser?.userId === 'test-user-123' || storedUser?.orgId === 'company-123'
        
        // Validate token format - must be a JWT (3 parts separated by dots)
        const isValidJWTFormat = storedToken && storedToken.split('.').length === 3
        
        if (isMockToken || isMockUser || !isValidJWTFormat) {
          // Clear mock or invalid authentication data
          TokenManager.clearAuth()
          setIsLoading(false)
          return
        }
        
        // If we have a valid token and user context, restore auth state
        if (storedToken && storedUser && !TokenManager.isTokenExpired() && isValidJWTFormat) {
          setToken(storedToken)
          setUser(storedUser)
        } else if (storedToken && !TokenManager.isTokenExpired() && isValidJWTFormat) {
          // If we have a token but no user context, decode token to get user context
          const decodeJwt = (tokenValue: string) => {
            try {
              const payload = tokenValue.split('.')[1]
              if (!payload) return null
              const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
              return JSON.parse(atob(normalized))
            } catch {
              return null
            }
          }
          
          const decoded = decodeJwt(storedToken)
          if (decoded) {
            const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + (60 * 60 * 1000)
            // Extract user context from token payload
            // Note: Token uses lowercase firstname/lastname
            const ucv = decoded?.ucv || {}
            const firstName = ucv.firstname || ucv.firstName || ''
            const lastName = ucv.lastname || ucv.lastName || ''
            const userFteid = ucv.fteid ?? ucv.user_fteid ?? decoded?.user_fteid ?? decoded?.fteid
            const realUser = {
              userId: String(ucv.id ?? decoded?.sub ?? decoded?.userId ?? 'unknown'),
              userFteid: userFteid ? String(userFteid) : undefined,
              email: ucv.email ?? decoded?.email ?? 'unknown',
              name: firstName && lastName 
                ? `${firstName} ${lastName}` 
                : (ucv.name ?? decoded?.name ?? firstName) || undefined,
              orgId: String(ucv.companyId ?? ucv.entity_guid?.replace('COM-', '') ?? decoded?.orgId ?? ''),
              branchId: String(ucv.groupId ?? ucv.desk_parent_fteid?.replace('COM-', '') ?? decoded?.branchId ?? ''),
              userRole: String(ucv.role_fteid ?? decoded?.role ?? 'user')
            }
            TokenManager.setTokens({
              accessToken: storedToken,
              expiresAt,
              tokenType: 'Bearer'
            })
            TokenManager.setUserContext(realUser)
            setToken(storedToken)
            setUser(realUser)
          } else {
            // Invalid token - clear it
            TokenManager.clearAuth()
          }
        } else if (TokenManager.hasRefreshToken()) {
          // Try to refresh token on app load
          refreshToken().catch(() => {
            // If refresh fails, clear auth state
            TokenManager.clearAuth()
          })
        } else {
          // No valid auth data - ensure clean state
          TokenManager.clearAuth()
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        TokenManager.clearAuth()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  /**
   * Set up token refresh timer
   */
  useEffect(() => {
    if (!token || !user) return

    const timeUntilExpiry = TokenManager.getTimeUntilExpiry()

    // Set up refresh timer 5 minutes before expiry
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000)

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshToken().catch((err) => {
          console.error('Automatic token refresh failed:', err)
          logout()
        })
      }, refreshTime)

      return () => clearTimeout(timeoutId)
    }
  }, [token, user])

  /**
   * Login function
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear any stale tokens before starting a fresh login
      TokenManager.clearAuth()
      clearCompanyCache()
      // Use dedicated auth API service
      // Pass email as username (API accepts username field)
      const response = await AuthApiService.login({
        username: credentials.username,
        password: credentials.password
      })

      // Convert response to tokens and user context
      const { tokens, userContext } = authUtils.convertLoginResponse(response)

      // Store tokens and user context
      TokenManager.setTokens(tokens)
      TokenManager.setUserContext(userContext)

      // Update state
      setToken(tokens.accessToken)
      setUser(userContext)

      // FT app flow: fetch desks and get desk token (used for indent API)
      try {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Starting desk fetch...')
        }
        const desks = await AuthApiService.getDesks()
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Desks fetched:', {
            count: desks.length,
            desks: desks.map(d => ({ fteid: d.fteid, name: d.name }))
          })
        }
        const firstDesk = desks?.[0]
        if (firstDesk?.fteid) {
          if (import.meta.env.DEV) {
            console.log('[AuthContext] Using desk fteid:', firstDesk.fteid)
            console.log('[AuthContext] Desk payload for branch resolution:', firstDesk)
          }
          // Update user context with branch FTEID from desk (for planning API)
          const deskBranchCandidate =
            (firstDesk as any).branch_fteid ||
            (firstDesk as any).branchFteid ||
            (firstDesk as any).branch_id ||
            (firstDesk as any).branchId ||
            firstDesk.parent_fteid ||
            (firstDesk as any).parentFteid
          const isBranchFteid = (value?: string | null) =>
            Boolean(value && (value.startsWith('BRH-') || value.startsWith('BRN-')))
          if (userContext && isBranchFteid(deskBranchCandidate)) {
            const updatedContext = { ...userContext, branchId: String(deskBranchCandidate) }
            TokenManager.setUserContext(updatedContext)
            setUser(updatedContext)
            if (import.meta.env.DEV) {
              console.log('[AuthContext] Updated branchId from desk:', updatedContext.branchId)
            }
          } else {
            if (import.meta.env.DEV) {
              console.warn('[AuthContext] No branch FTEID found on desk payload')
            }
          }

          const deskTokenResponse = await AuthApiService.getDeskToken(firstDesk.fteid)
          if (deskTokenResponse?.auth_token) {
            TokenManager.setDeskTokens({
              accessToken: deskTokenResponse.auth_token,
              refreshToken: deskTokenResponse.refresh_token,
              expiresAt: Date.now() + (60 * 60 * 1000),
              tokenType: 'Bearer'
            })
            if (import.meta.env.DEV) {
              console.log('[AuthContext] Stored desk token length:', deskTokenResponse.auth_token.length)
            }
          } else if (import.meta.env.DEV) {
            console.warn('[AuthContext] Desk token missing in response')
          }

          // Fetch role permissions (access-control uses desk token)
          try {
            const roleFteid = userContext?.userRole || ''
            if (roleFteid.startsWith('ROL-')) {
              const roleResponse = await realApiService.getRoleDetails(roleFteid)
              const permissions = roleResponse?.data?.permissions || []
              const updatedContext = { ...(TokenManager.getUserContext() || userContext), permissions }
              TokenManager.setUserContext(updatedContext)
              setUser(updatedContext)
              if (import.meta.env.DEV) {
                console.log('[AuthContext] Stored role permissions:', permissions.length)
              }
            }
          } catch (permissionError) {
            if (import.meta.env.DEV) {
              console.warn('[AuthContext] Failed to fetch role permissions:', permissionError)
            }
          }
        } else if (import.meta.env.DEV) {
          console.warn('[AuthContext] No desks found for user')
        }
      } catch (deskError) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Failed to fetch desk token:', {
            error: deskError,
            message: deskError instanceof Error ? deskError.message : 'Unknown desk error',
            userContext: userContext,
            hasLoginToken: !!TokenManager.getAccessToken()
          })
        }
        console.warn('Failed to fetch desk token:', deskError)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Refresh token function
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    const currentRefreshToken = TokenManager.getRefreshToken()

    if (!currentRefreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await AuthApiService.refreshToken(currentRefreshToken)

      // Convert response to tokens and optional user context
      const { tokens, userContext } = authUtils.convertRefreshResponse(response)

      // Update stored tokens
      TokenManager.setTokens(tokens)
      setToken(tokens.accessToken)

      // Update user context if provided
      if (userContext) {
        TokenManager.setUserContext(userContext)
        setUser(userContext)
      }

    } catch (err) {
      TokenManager.clearAuth()
      setToken(null)
      setUser(null)
      throw err
    }
  }, [])

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    try {
      // Call logout API to invalidate server-side session
      AuthApiService.logout().catch(err => {
        console.warn('Server-side logout failed:', err)
      })
    } catch (err) {
      console.warn('Error during logout API call:', err)
    }

    // Clear local storage and state
    TokenManager.clearAuth()
    clearCompanyCache()
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  /**
   * Clear error function
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!(token && user && !TokenManager.isTokenExpired()),
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    clearError
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Higher-order component for protected routes
 */
export interface WithAuthProps {
  fallback?: React.ComponentType
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
      return <div>Loading...</div> // You can replace with a proper loading component
    }

    if (!isAuthenticated) {
      if (options.fallback) {
        const FallbackComponent = options.fallback
        return <FallbackComponent />
      }
      return <div>Authentication required</div>
    }

    return <Component {...props} />
  }
}
