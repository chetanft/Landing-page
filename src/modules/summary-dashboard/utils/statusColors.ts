/**
 * Map journey statuses to FT Design System colors (CSS variables)
 * Use for React components that support CSS variables
 */
export function getStatusColor(journeyStatus: string): string {
  const normalizedStatus = journeyStatus.toUpperCase().trim()

  switch (normalizedStatus) {
    case 'IN_TRANSIT':
      return 'var(--primary)'
    case 'AT_DESTINATION':
      return 'var(--color-success)'
    case 'AT_ORIGIN':
      return 'var(--color-warning)'
    case 'BEFORE_ORIGIN':
      return 'var(--color-neutral)'
    case 'AFTER_DESTINATION':
      return 'var(--color-success)'
    case 'CLOSED':
      return 'var(--color-neutral)'
    case 'IN_RETURN':
      return 'var(--primary)'
    case 'PLANNED':
      return 'var(--color-neutral)'
    default:
      return 'var(--color-secondary)'
  }
}

/**
 * Map journey statuses to hex colors for MapLibre
 * MapLibre doesn't support CSS variables, so we need actual color values
 * These match FT Design System token colors
 */
export function getStatusColorHex(journeyStatus: string): string {
  const normalizedStatus = journeyStatus.toUpperCase().trim()

  switch (normalizedStatus) {
    case 'IN_TRANSIT':
      return '#3B82F6' // Primary blue
    case 'AT_DESTINATION':
      return '#10B981' // Success green
    case 'AT_ORIGIN':
      return '#F59E0B' // Warning amber
    case 'BEFORE_ORIGIN':
      return '#6B7280' // Neutral gray
    case 'AFTER_DESTINATION':
      return '#10B981' // Success green
    case 'CLOSED':
      return '#6B7280' // Neutral gray
    case 'IN_RETURN':
      return '#3B82F6' // Primary blue
    case 'PLANNED':
      return '#6B7280' // Neutral gray
    default:
      return '#9CA3AF' // Secondary gray
  }
}

/**
 * Get computed CSS variable value as hex color
 * Useful for converting CSS variables to hex for MapLibre
 */
export function getComputedColor(cssVariable: string, fallback: string = '#000000'): string {
  if (typeof window === 'undefined') return fallback
  
  // Remove 'var(' and ')' if present
  const varName = cssVariable.replace(/var\(|\)/g, '').trim()
  
  const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  
  if (!computed) return fallback
  
  // If it's already a hex color, return it
  if (computed.startsWith('#')) return computed
  
  // If it's rgb/rgba, convert to hex
  if (computed.startsWith('rgb')) {
    const matches = computed.match(/\d+/g)
    if (matches && matches.length >= 3) {
      const r = parseInt(matches[0])
      const g = parseInt(matches[1])
      const b = parseInt(matches[2])
      return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
    }
  }
  
  return fallback
}
