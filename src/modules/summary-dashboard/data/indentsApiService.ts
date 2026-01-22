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

/**
 * Fetch indents count from the cyclops API
 */
export const fetchIndentsCount = async (globalFilters: GlobalFilters): Promise<IndentItem[]> => {
  try {
    return await fetchIndentsCountFromAPI(globalFilters)
  } catch (error) {
    console.warn('Failed to fetch from real indents API, using fallback data:', error)
    return await fetchIndentsCountFallback()
  }
}

/**
 * Real API call implementation for indents
 */
export const fetchIndentsCountFromAPI = async (globalFilters: GlobalFilters): Promise<IndentItem[]> => {
  const baseUrl = buildFtTmsUrl('/cyclops/indent/consignor/list/count')

  // Format dates for the API (assuming similar format as journey API)
  const params = new URLSearchParams()

  // Add date range filters if needed
  if (globalFilters.dateRange) {
    // The API might accept date filters - adding placeholder for future implementation
    // params.append('start_date', globalFilters.dateRange.start.toISOString())
    // params.append('end_date', globalFilters.dateRange.end.toISOString())
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
      body: JSON.stringify({})
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

/**
 * Fallback function with mock indents data
 */
const fetchIndentsCountFallback = async (): Promise<IndentItem[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  // Mock data based on the provided API response
  return [
    {
      "count": 0,
      "text": "Scheduled",
      "key": "SCHEDULED"
    },
    {
      "count": 34,
      "text": "Open",
      "key": "OPEN",
      "child": [
        {
          "count": 4,
          "text": "Pending Approval",
          "key": "PENDING_APPROVAL"
        },
        {
          "break_up": {
            "bidding": 0,
            "indent": 19
          },
          "count": 19,
          "text": "Pending Acceptance",
          "key": "TRANSPORTER_SELECTION_PENDING"
        },
        {
          "overdue": 0,
          "count": 3,
          "text": "In Assignment",
          "key": "VEHICLE_PLACEMENT_IN_PROGRESS"
        },
        {
          "overdue": 0,
          "count": 8,
          "text": "In Reporting",
          "key": "VEHICLE_REPORTING_IN_PROGRESS"
        }
      ]
    },
    {
      "count": 52693,
      "text": "Expired",
      "key": "EXPIRED"
    },
    {
      "count": 20,
      "text": "Partially Fulfilled",
      "key": "PARTIALLY_CLOSED"
    },
    {
      "count": 5765,
      "text": "Cancelled",
      "key": "CANCELLED"
    },
    {
      "count": 71542,
      "text": "Fulfilled",
      "key": "COMPLETELY_CLOSED"
    },
    {
      "count": 2,
      "text": "Drafts",
      "key": "DRAFT"
    },
    {
      "count": 0,
      "text": "Approval Rejection",
      "key": "APPROVAL_REJECTION"
    },
    {
      "count": 228,
      "text": "Vehicle Rejected",
      "key": "REJECTED"
    },
    {
      "count": 790,
      "text": "Rejected By Transporter",
      "key": "REJECTED_BY_TRANSPORTER"
    }
  ]
}
