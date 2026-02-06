/**
 * Authentication types and interfaces
 */

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

export class PermissionError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'PermissionError'
  }
}
