/**
 * Authentication helper utilities
 */

// Helper to build API URL - avoids circular dependency with ftTmsClient
export const buildAuthApiUrl = (path: string): string => {
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
export const buildApiUrl = (path: string): string => {
  const envBaseUrl = import.meta.env.VITE_FT_TMS_API_BASE_URL
  if (envBaseUrl && envBaseUrl.startsWith('/__ft_tms')) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${envBaseUrl}${normalizedPath}`
  }
  return path.startsWith('http') ? path : `https://api.freighttiger.com${path}`
}

// Pattern for validating FT user IDs
export const FT_USER_ID_PATTERN = /^[A-Z]{3}-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/

export const isValidFtUserId = (value?: string): value is string => {
  return typeof value === 'string' && FT_USER_ID_PATTERN.test(value)
}
