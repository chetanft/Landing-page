import type { MetricTarget, GlobalFilters } from '../types/metrics'

/**
 * Filter key mapping from dashboard keys to target page keys
 * This handles cases where the dashboard uses different filter names than the target pages
 */
const FILTER_KEY_MAP: Record<string, string> = {
  // Journey filters
  delay_in_minutes: 'isDelayed',
  // Add more mappings as needed
}

/**
 * Serialize a filter value to URL query string format
 */
const serializeFilterValue = (value: string | string[] | boolean): string => {
  if (Array.isArray(value)) {
    return value.join(',')
  }
  return String(value)
}

/**
 * Format date for URL query string (YYYY-MM-DD)
 */
const formatDateForUrl = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

/**
 * Map a filter key to its target page equivalent
 */
const mapFilterKey = (key: string): string => {
  return FILTER_KEY_MAP[key] || key
}

/**
 * Build the full target URL with all filters applied
 */
export const buildTargetUrl = (
  target: MetricTarget,
  globalFilters: GlobalFilters
): string => {
  const params = new URLSearchParams()

  // Add metric-specific default filters
  Object.entries(target.defaultFilters).forEach(([key, value]) => {
    const mappedKey = mapFilterKey(key)
    params.set(mappedKey, serializeFilterValue(value))
  })

  // Add global filters
  if (globalFilters.locationId) {
    params.set('location_id', globalFilters.locationId)
  }

  if (globalFilters.dateRange) {
    params.set('date_from', formatDateForUrl(globalFilters.dateRange.start))
    params.set('date_to', formatDateForUrl(globalFilters.dateRange.end))
  }

  if (globalFilters.entityType) {
    params.set('entity_type', globalFilters.entityType)
  }

  if (globalFilters.priority && globalFilters.priority.length > 0) {
    globalFilters.priority.forEach((priority) => {
      params.append('priority', priority)
    })
  }

  const queryString = params.toString()
  return queryString ? `${target.path}?${queryString}` : target.path
}

/**
 * Build request params for API call, combining metric params with global filters
 */
export const buildRequestParams = (
  metricParams: Record<string, unknown>,
  globalFilters: GlobalFilters
): Record<string, unknown> => {
  const params: Record<string, unknown> = { ...metricParams }

  if (globalFilters.locationId) {
    params.location_id = globalFilters.locationId
  }

  if (globalFilters.dateRange) {
    params.date_from = formatDateForUrl(globalFilters.dateRange.start)
    params.date_to = formatDateForUrl(globalFilters.dateRange.end)
  }

  if (globalFilters.entityType) {
    params.entity_type = globalFilters.entityType
  }

  if (globalFilters.priority && globalFilters.priority.length > 0) {
    params.priority = globalFilters.priority
  }

  return params
}
