import type { GlobalFilters } from '../types/metrics'
import { buildFtTmsUrl } from './ftTmsClient'
import { TokenManager } from '../auth/tokenManager'
import { AuthenticationError } from '../auth/authApiService'

// API response types for indents
interface IndentChildItem {
  count: number
  text: string
  key: string
  break_up?: {
    bidding: number
    indent: number
  }
  overdue?: number
}

interface IndentItem {
  count: number
  text: string
  key: string
  child?: IndentChildItem[]
  break_up?: {
    bidding: number
    indent: number
  }
  overdue?: number
}

export interface IndentsApiResponse {
  success?: boolean
  data?: IndentItem[]
}

export interface IndentPartnerOption {
  value: string
  label: string
}

/**
 * Fetch indents count from the cyclops API
 */
export const fetchIndentsCount = async (globalFilters: GlobalFilters): Promise<IndentItem[]> => {
  return fetchIndentsCountFromAPI(globalFilters)
}

/**
 * Real API call implementation for indents
 */
export const fetchIndentsCountFromAPI = async (globalFilters: GlobalFilters): Promise<IndentItem[]> => {
  const baseUrl = buildFtTmsUrl('/api/cyclops/indent/consignor/list/count')

  const params = new URLSearchParams()
  const bodyPayload: Record<string, unknown> = {}

  // Add date range filters if provided (millisecond timestamps)
  if (globalFilters.dateRange?.start && globalFilters.dateRange?.end) {
    bodyPayload.from_date = globalFilters.dateRange.start.getTime()
    bodyPayload.to_date = globalFilters.dateRange.end.getTime()
  }

  // Add location filter if specified
  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }

  // Add transporter filter if specified
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }

    try {
      const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
      const deskToken = TokenManager.getDeskToken()
      const token = deskToken || TokenManager.getAccessToken()
      
      // Indent API uses 'token' header instead of 'Authorization: Bearer' header
      // This is different from other APIs which use Authorization header
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['token'] = token
        if (import.meta.env.DEV) {
          const source = deskToken ? 'desk token' : 'login token'
          console.log(`[fetchIndentsCount] Using ${source} header: ${token.substring(0, 30)}... (len=${token.length})`)
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn(`[fetchIndentsCount] No token available from storage`)
        }
      }
    
    // NOTE: Indent API does NOT need user context headers (X-Org-Id, X-Branch-Id, etc.)
    // Adding these headers causes 401 Unauthorized errors
    // The token itself contains all necessary user context
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(bodyPayload)
    })
    
    if (!response.ok) {
      let errorMessage = `Indent API request failed (${response.status})`
      try {
        const errorBody = await response.clone().json()
        errorMessage = errorBody.message || errorBody.error || errorMessage
      } catch {
        // Ignore parse errors
      }
      
      console.error('Indent API error:', { url, status: response.status, message: errorMessage })
      
      if (response.status === 401) {
        throw new AuthenticationError(errorMessage, response.status)
      }
      
      throw new Error(errorMessage)
    }
    
    const data = await response.json()

    // Handle both direct array response and wrapped response
    if (Array.isArray(data)) {
      return data as IndentItem[]
    } else if (data.success && data.data) {
      return data.data as IndentItem[]
    } else {
      throw new Error('Invalid API response format')
    }
  } catch (error) {
    console.error('Error fetching indents count from API:', error)
    throw error
  }
}

const fetchIndentPartners = async (path: string): Promise<IndentPartnerOption[]> => {
  const baseUrl = buildFtTmsUrl(path)
  const deskToken = TokenManager.getDeskToken()
  const token = deskToken || TokenManager.getAccessToken()

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }

  if (token) {
    headers['token'] = token
    if (import.meta.env.DEV) {
      const source = deskToken ? 'desk token' : 'login token'
      console.log(`[fetchIndentPartners] Using ${source} header: ${token.substring(0, 30)}... (len=${token.length})`)
    }
  } else if (import.meta.env.DEV) {
    console.warn('[fetchIndentPartners] No token available from storage')
  }

  const response = await fetch(baseUrl, {
    method: 'GET',
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    let errorMessage = `Indent partner request failed (${response.status})`
    try {
      const errorBody = await response.clone().json()
      errorMessage = errorBody.message || errorBody.error || errorMessage
    } catch {
      // Ignore parse errors
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  if (data?.success === false) {
    throw new Error('Indent partner API returned failure status')
  }

  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return items.map((item: any) => ({
    value: String(item.fteid || item.id || ''),
    label: String(item.name || item.label || item.text || '')
  })).filter(item => item.value && item.label)
}

export const fetchIndentConsignees = async (): Promise<IndentPartnerOption[]> => {
  return fetchIndentPartners('/api/cyclops/indent/dashboard/consignee')
}

export const fetchIndentTransporters = async (): Promise<IndentPartnerOption[]> => {
  return fetchIndentPartners('/api/cyclops/indent/dashboard/transporters')
}
