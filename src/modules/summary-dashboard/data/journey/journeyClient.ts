import type {
  JourneyMilestoneKey,
  JourneyApiResponse,
  JourneySearchResponse,
  JourneyLoadsResponse,
  JourneyLoad,
  GlobalFilters
} from './journeyTypes'
import {
  journeyLoadsCache,
  notifyJourneySearchUpdate,
  JOURNEY_SEARCH_PAGE_SIZE
} from './journeyCache'
import { buildFtTmsUrl, resolveUserContext } from '../ftTmsClient'
import { TokenManager } from '../../auth/tokenManager'
import { AuthApiService, AuthenticationError } from '../../auth/authApiService'
import { ApiError } from '../../utils/apiUtils'
import { ensureAuthReady } from '../../auth/authGate'

// Date formatting for API
export const formatDateForApi = (date: Date, isEnd: boolean = false): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = '18'
  const minutes = isEnd ? '29' : '30'
  const seconds = isEnd ? '59' : '00'
  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`
}

// Build journey snapshot URL
export const buildJourneySnapshotUrl = (globalFilters: GlobalFilters, journeyStatus: string): string => {
  const baseUrl = buildFtTmsUrl('/api/journey-snapshot/v1/journeys/count')
  const startTime = formatDateForApi(globalFilters.dateRange.start, false)
  const endTime = formatDateForApi(globalFilters.dateRange.end, true)

  const params = new URLSearchParams({
    page: '1',
    size: '20',
    entity_type: 'CNR',
    journey_status: journeyStatus,
    start_time_utc: startTime,
    end_time_utc: endTime,
    journey_direction: 'outbound',
    journey_stop_type: 'source',
    'sort[sort_by]': 'created_at',
    'sort[sort_by_order]': 'DESC'
  })

  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }
  if (globalFilters.consigneeId) {
    params.append('consignee_fteid', globalFilters.consigneeId)
  }

  const milestones = ['PLANNED', 'BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION', 'IN_RETURN', 'AFTER_DESTINATION', 'CLOSED']
  milestones.forEach(milestone => {
    params.append('milestones[]', milestone)
  })

  const activeAlerts = ['long_stoppage', 'route_deviation', 'eway_bill']
  activeAlerts.forEach(alert => {
    params.append('active_alerts[]', alert)
  })

  const activeAnalytics = ['delay_in_minutes', 'expected_arrival']
  activeAnalytics.forEach(analytic => {
    params.append('active_analytics[]', analytic)
  })

  return `${baseUrl}?${params.toString()}`
}

// Build journey search URL
export const buildJourneySearchUrl = (
  globalFilters: GlobalFilters,
  journeyStatus: string,
  page: number,
  size: number
): string => {
  const baseUrl = buildFtTmsUrl('/api/journey-snapshot/v1/journeys/search')
  const startTime = formatDateForApi(globalFilters.dateRange.start, false)
  const endTime = formatDateForApi(globalFilters.dateRange.end, true)

  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    entity_type: 'CNR',
    journey_status: journeyStatus,
    start_time_utc: startTime,
    end_time_utc: endTime,
    journey_direction: 'outbound',
    journey_stop_type: 'source',
    'sort[sort_by]': 'created_at',
    'sort[sort_by_order]': 'DESC'
  })

  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }
  if (globalFilters.consigneeId) {
    params.append('consignee_fteid', globalFilters.consigneeId)
  }

  const milestones = ['PLANNED', 'BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION', 'IN_RETURN', 'AFTER_DESTINATION', 'CLOSED']
  milestones.forEach(milestone => {
    params.append('milestones[]', milestone)
  })

  const activeAlerts = ['long_stoppage', 'route_deviation', 'eway_bill']
  activeAlerts.forEach(alert => {
    params.append('active_alerts[]', alert)
  })

  const activeAnalytics = ['delay_in_minutes', 'expected_arrival']
  activeAnalytics.forEach(analytic => {
    params.append('active_analytics[]', analytic)
  })

  return `${baseUrl}?${params.toString()}`
}

// Build journey details URL
export const buildJourneyDetailsUrl = (journeyFteid: string, path: string, globalFilters: GlobalFilters): string => {
  const baseUrl = buildFtTmsUrl(`/api/journey-snapshot/v1/journeys/${journeyFteid}/${path}`)
  const params = new URLSearchParams({
    entity_type: 'CNR',
    journey_stop_type: 'source',
    journey_direction: 'outbound'
  })

  if (globalFilters.locationId) {
    params.append('consignor_fteid', globalFilters.locationId)
  }
  if (globalFilters.transporterId) {
    params.append('transporter_fteid', globalFilters.transporterId)
  }
  if (globalFilters.consigneeId) {
    params.append('consignee_fteid', globalFilters.consigneeId)
  }

  return `${baseUrl}?${params.toString()}`
}

// Build POD summary URL
export const buildJourneyPodSummaryUrl = (journeyFteid: string): string => {
  return buildFtTmsUrl(`/api/epod-service-v2/v1/journey-fte/pod-summary/journey_fteid/${journeyFteid}`)
}

// Build request headers
export const buildJourneyRequestHeaders = (token: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'token': token
  }

  const userContext = resolveUserContext(token) ?? TokenManager.getUserContext()
  if (userContext?.orgId) {
    headers['X-FT-ORGID'] = userContext.orgId
    headers['X-Org-Id'] = userContext.orgId
  }
  if (userContext?.userFteid) {
    headers['X-FT-USERID'] = userContext.userFteid
  }
  if (userContext?.userId) {
    headers['X-User-Id'] = userContext.userId
  }
  if (userContext?.userRole) {
    headers['X-User-Role'] = userContext.userRole
  }

  return headers
}

// Fetch journey search page
export const fetchJourneySearchPage = async (
  globalFilters: GlobalFilters,
  journeyStatus: JourneyMilestoneKey,
  page: number,
  signal?: AbortSignal
): Promise<JourneySearchResponse | null> => {
  const token = TokenManager.getDeskToken() || TokenManager.getAccessToken()
  if (!token) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneySearchPage] No token available')
    }
    return null
  }
  const headers = buildJourneyRequestHeaders(token)
  const url = buildJourneySearchUrl(globalFilters, journeyStatus, page, JOURNEY_SEARCH_PAGE_SIZE)
  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
    signal
  })
  const data: JourneySearchResponse = await response.json()
  if (!data.success) {
    return null
  }
  return data
}

// Fetch journey status counts
export const fetchJourneyStatusCounts = async (globalFilters: GlobalFilters, journeyStatus: JourneyMilestoneKey): Promise<JourneyApiResponse> => {
  const url = buildJourneySnapshotUrl(globalFilters, journeyStatus)
  const token = TokenManager.getDeskToken() || TokenManager.getAccessToken()
  if (!token) {
    throw new ApiError('No token available for journey status counts', 401, 'Unauthorized', url)
  }
  const headers = buildJourneyRequestHeaders(token)

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include'
  })
  const data: JourneyApiResponse = await response.json()
  if (!data.success) {
    throw new ApiError(
      'API returned failure status',
      response.status,
      response.statusText,
      url
    )
  }

  return data
}

// Fetch journey loads
export const fetchJourneyLoads = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<JourneyLoad[] | null> => {
  if (journeyLoadsCache.has(journeyFteid)) {
    return journeyLoadsCache.get(journeyFteid)?.data?.loads ?? null
  }

  // Gate on desk token - loads API requires desk token
  const authOk = await ensureAuthReady(true, 5000)
  if (!authOk) {
    // If desk token unavailable, return null and don't fetch
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyLoads] Auth not ready (desk token required), skipping fetch')
    }
    return null
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/loads', globalFilters)
  try {
    const accessToken = TokenManager.getAccessToken()
    const initialToken = TokenManager.getDeskToken() || accessToken
    if (!initialToken) {
      throw new AuthenticationError('No token available for journey loads request')
    }

    let response = await fetch(url, { method: 'GET', headers: buildJourneyRequestHeaders(initialToken) })

    if ((response.status === 401 || response.status === 403) && initialToken === accessToken) {
      const desks = await AuthApiService.getDesks().catch(() => [])
      const firstDesk = desks?.[0]
      if (firstDesk?.fteid) {
        const deskTokenResponse = await AuthApiService.getDeskToken(firstDesk.fteid)
        if (deskTokenResponse?.auth_token) {
          TokenManager.setDeskTokens({
            accessToken: deskTokenResponse.auth_token,
            refreshToken: deskTokenResponse.refresh_token,
            expiresAt: Date.now() + (12 * 60 * 60 * 1000)
          })
          response = await fetch(url, { method: 'GET', headers: buildJourneyRequestHeaders(deskTokenResponse.auth_token) })
        }
      }
    }

    if (response.status === 401 && TokenManager.hasDeskRefreshToken() && TokenManager.getDeskToken()) {
      const refreshed = await AuthApiService.refreshDeskToken(
        TokenManager.getDeskRefreshToken()!,
        TokenManager.getDeskToken()!
      )
      if (refreshed?.auth_token) {
        TokenManager.setDeskTokens({
          accessToken: refreshed.auth_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: Date.now() + (12 * 60 * 60 * 1000)
        })
        response = await fetch(url, { method: 'GET', headers: buildJourneyRequestHeaders(refreshed.auth_token) })
      }
    }

    const data: JourneyLoadsResponse = await response.json()
    if (data?.success) {
      journeyLoadsCache.set(journeyFteid, data)
      notifyJourneySearchUpdate()
      return data.data?.loads ?? []
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyLoads] Failed:', error)
    }
  }
  return null
}
