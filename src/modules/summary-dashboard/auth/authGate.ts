/**
 * Auth Gate - Utilities for auth-ready gating of dependent APIs
 */

import { TokenManager } from './tokenManager'

export type AuthPhase =
  | 'idle'
  | 'logging_in'
  | 'tokens_ready'
  | 'desk_ready'
  | 'ready'
  | 'refreshing'
  | 'failed'

// Global auth state tracking
let currentAuthPhase: AuthPhase = 'idle'
let authPhaseTimestamp: number = Date.now()
const authReadyListeners = new Set<() => void>()

/**
 * Get the current auth phase
 */
export const getAuthPhase = (): AuthPhase => currentAuthPhase

/**
 * Check if auth is ready (login token + desk token are valid)
 */
export const isAuthReady = (): boolean => {
  const loginToken = TokenManager.getAccessToken()
  const deskToken = TokenManager.getDeskToken()
  const isTokenValid = loginToken && loginToken !== 'undefined' && loginToken !== 'null' && loginToken.length > 10
  const isDeskValid = deskToken && deskToken !== 'undefined' && deskToken !== 'null' && deskToken.length > 10

  return Boolean(isTokenValid && isDeskValid && currentAuthPhase === 'ready')
}

/**
 * Check if login token is ready (for non-desk APIs)
 */
export const isLoginTokenReady = (): boolean => {
  const loginToken = TokenManager.getAccessToken()
  const isTokenValid = loginToken && loginToken !== 'undefined' && loginToken !== 'null' && loginToken.length > 10

  return Boolean(isTokenValid && ['tokens_ready', 'desk_ready', 'ready'].includes(currentAuthPhase))
}

/**
 * Set the auth phase and notify listeners
 */
export const setAuthPhase = (phase: AuthPhase): void => {
  const previousPhase = currentAuthPhase
  currentAuthPhase = phase
  authPhaseTimestamp = Date.now()

  if (import.meta.env.DEV) {
    console.log(`[AuthGate] Phase transition: ${previousPhase} -> ${phase} (${new Date().toISOString()})`)
  }

  // Notify listeners when auth becomes ready
  if (phase === 'ready' || phase === 'desk_ready') {
    authReadyListeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.warn('[AuthGate] Listener error:', error)
      }
    })
  }
}

/**
 * Subscribe to auth ready events
 */
export const subscribeToAuthReady = (callback: () => void): (() => void) => {
  authReadyListeners.add(callback)
  return () => authReadyListeners.delete(callback)
}

/**
 * Wait for auth to become ready
 * @param timeoutMs Maximum time to wait (default 10 seconds)
 * @returns Promise that resolves to true if auth is ready, false if timed out or failed
 */
export const waitForAuthReady = (timeoutMs: number = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    // Already ready
    if (isAuthReady()) {
      resolve(true)
      return
    }

    // Already failed
    if (currentAuthPhase === 'failed') {
      resolve(false)
      return
    }

    let resolved = false
    let unsubscribe: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (unsubscribe) unsubscribe()
        if (import.meta.env.DEV) {
          console.warn(`[AuthGate] waitForAuthReady timed out after ${timeoutMs}ms (phase: ${currentAuthPhase})`)
        }
        resolve(false)
      }
    }, timeoutMs)

    unsubscribe = subscribeToAuthReady(() => {
      if (!resolved && isAuthReady()) {
        resolved = true
        clearTimeout(timeoutId)
        if (unsubscribe) unsubscribe()
        resolve(true)
      }
    })

    // Also listen for phase changes
    const checkInterval = setInterval(() => {
      if (resolved) {
        clearInterval(checkInterval)
        return
      }

      if (isAuthReady()) {
        resolved = true
        clearTimeout(timeoutId)
        clearInterval(checkInterval)
        if (unsubscribe) unsubscribe()
        resolve(true)
      } else if (currentAuthPhase === 'failed') {
        resolved = true
        clearTimeout(timeoutId)
        clearInterval(checkInterval)
        if (unsubscribe) unsubscribe()
        resolve(false)
      }
    }, 100)
  })
}

/**
 * Wait for login token to become ready (for non-desk APIs)
 * @param timeoutMs Maximum time to wait (default 10 seconds)
 * @returns Promise that resolves to true if login token is ready, false if timed out or failed
 */
export const waitForLoginTokenReady = (timeoutMs: number = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    // Already ready
    if (isLoginTokenReady()) {
      resolve(true)
      return
    }

    // Already failed
    if (currentAuthPhase === 'failed') {
      resolve(false)
      return
    }

    let resolved = false

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true
        if (import.meta.env.DEV) {
          console.warn(`[AuthGate] waitForLoginTokenReady timed out after ${timeoutMs}ms (phase: ${currentAuthPhase})`)
        }
        resolve(false)
      }
    }, timeoutMs)

    const checkInterval = setInterval(() => {
      if (resolved) {
        clearInterval(checkInterval)
        return
      }

      if (isLoginTokenReady()) {
        resolved = true
        clearTimeout(timeoutId)
        clearInterval(checkInterval)
        resolve(true)
      } else if (currentAuthPhase === 'failed') {
        resolved = true
        clearTimeout(timeoutId)
        clearInterval(checkInterval)
        resolve(false)
      }
    }, 100)
  })
}

/**
 * Ensure auth is ready before making API calls
 * @param requireDesk Whether desk token is required (default true)
 * @param timeoutMs Maximum time to wait (default 10 seconds)
 * @returns Promise that resolves to true if auth is ready, false otherwise
 */
export const ensureAuthReady = async (
  requireDesk: boolean = true,
  timeoutMs: number = 10000
): Promise<boolean> => {
  const startTime = Date.now()

  if (requireDesk) {
    if (isAuthReady()) {
      return true
    }

    if (import.meta.env.DEV) {
      console.log(`[AuthGate] ensureAuthReady: waiting for auth (phase: ${currentAuthPhase}, requireDesk: true, timeout: ${timeoutMs}ms)`)
    }

    const result = await waitForAuthReady(timeoutMs)

    if (import.meta.env.DEV) {
      const elapsed = Date.now() - startTime
      if (result) {
        console.log(`[AuthGate] ensureAuthReady: auth ready after ${elapsed}ms`)
      } else {
        console.warn(`[AuthGate] ensureAuthReady: BLOCKED - auth not ready after ${elapsed}ms (phase: ${currentAuthPhase})`)
      }
    }

    return result
  } else {
    if (isLoginTokenReady()) {
      return true
    }

    if (import.meta.env.DEV) {
      console.log(`[AuthGate] ensureAuthReady: waiting for login token (phase: ${currentAuthPhase}, requireDesk: false, timeout: ${timeoutMs}ms)`)
    }

    const result = await waitForLoginTokenReady(timeoutMs)

    if (import.meta.env.DEV) {
      const elapsed = Date.now() - startTime
      if (result) {
        console.log(`[AuthGate] ensureAuthReady: login token ready after ${elapsed}ms`)
      } else {
        console.warn(`[AuthGate] ensureAuthReady: BLOCKED - login token not ready after ${elapsed}ms (phase: ${currentAuthPhase})`)
      }
    }

    return result
  }
}

/**
 * Reset auth state (used on logout)
 */
export const resetAuthState = (): void => {
  currentAuthPhase = 'idle'
  authPhaseTimestamp = Date.now()

  if (import.meta.env.DEV) {
    console.log('[AuthGate] Auth state reset')
  }
}

/**
 * Debug helper: Log current auth state (DEV only)
 */
export const logAuthState = (): void => {
  if (!import.meta.env.DEV) return

  const loginToken = TokenManager.getAccessToken()
  const deskToken = TokenManager.getDeskToken()

  console.group('[AuthGate] Current Auth State')
  console.log('Phase:', currentAuthPhase)
  console.log('Phase timestamp:', new Date(authPhaseTimestamp).toISOString())
  console.log('Time in phase:', `${Date.now() - authPhaseTimestamp}ms`)
  console.log('Login token:', loginToken ? `${loginToken.substring(0, 20)}... (${loginToken.length} chars)` : 'null')
  console.log('Desk token:', deskToken ? `${deskToken.substring(0, 20)}... (${deskToken.length} chars)` : 'null')
  console.log('isLoginTokenReady:', isLoginTokenReady())
  console.log('isAuthReady:', isAuthReady())
  console.log('Listeners count:', authReadyListeners.size)
  console.groupEnd()
}
