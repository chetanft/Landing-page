/**
 * Utility functions for auth integration
 */

import { TokenManager, AuthTokens, UserContext } from './tokenManager'
import type { LoginResponse, RefreshTokenResponse } from './authTypes'

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
      userFteid: (response.user as { fteid?: string; userFteid?: string }).fteid
        || (response.user as { fteid?: string; userFteid?: string }).userFteid,
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
        userFteid: (response.user as { fteid?: string; userFteid?: string }).fteid
          || (response.user as { fteid?: string; userFteid?: string }).userFteid,
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
