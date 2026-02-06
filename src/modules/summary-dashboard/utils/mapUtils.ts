import type { Color } from '@deck.gl/core'

/**
 * Map visualization utilities
 */

// Fallback colors for map visualization
export const FALLBACK_ON_TIME_COLOR: [number, number, number, number] = [34, 197, 94, 220]
export const FALLBACK_DELAYED_COLOR: [number, number, number, number] = [239, 68, 68, 220]

/**
 * Parse a CSS color string (hex or rgb/rgba) into an RGBA tuple
 */
export const parseCssColor = (
  value: string,
  fallback: [number, number, number, number]
): [number, number, number, number] => {
  const trimmed = value.trim()
  if (!trimmed) return fallback

  // Handle hex colors
  if (trimmed.startsWith('#')) {
    const hex = trimmed.replace('#', '')
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return [r, g, b, fallback[3]]
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return [r, g, b, fallback[3]]
    }
  }

  // Handle rgb/rgba colors
  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/i)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map(part => part.trim())
    const r = Number(parts[0])
    const g = Number(parts[1])
    const b = Number(parts[2])
    const a = parts[3] !== undefined ? Math.round(Number(parts[3]) * 255) : fallback[3]
    if (![r, g, b].some(Number.isNaN)) {
      return [r, g, b, Number.isNaN(a) ? fallback[3] : a]
    }
  }

  return fallback
}

/**
 * Convert RGBA tuple to deck.gl Color type
 */
export const toColor = (value: [number, number, number, number]): Color => {
  return new Uint8ClampedArray(value)
}

/**
 * Resolve a CSS variable to a deck.gl Color
 */
export const resolveCssVarColor = (
  cssVar: string,
  fallback: [number, number, number, number]
): Color => {
  if (typeof window === 'undefined') return toColor(fallback)
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar)
  return toColor(parseCssColor(value, fallback))
}

/**
 * Grid aggregation types
 */
export interface GridPoint {
  lng: number
  lat: number
}

export interface GridCount {
  lng: number
  lat: number
  count: number
}

/**
 * Get grid step size based on zoom level
 */
export const getGridStep = (zoom: number): number => {
  if (zoom < 5) return 2
  if (zoom < 7) return 1
  return 0.5
}

/**
 * Aggregate points into grid cells for cluster visualization
 */
export const buildGridCounts = <T extends GridPoint>(points: T[], zoom: number): GridCount[] => {
  const step = getGridStep(zoom)
  const buckets = new Map<string, { lng: number; lat: number; count: number; sumLng: number; sumLat: number }>()

  points.forEach(point => {
    const bucketLng = Math.floor(point.lng / step) * step
    const bucketLat = Math.floor(point.lat / step) * step
    const key = `${bucketLng}:${bucketLat}`
    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      existing.sumLng += point.lng
      existing.sumLat += point.lat
    } else {
      buckets.set(key, {
        lng: bucketLng + step / 2,
        lat: bucketLat + step / 2,
        count: 1,
        sumLng: point.lng,
        sumLat: point.lat
      })
    }
  })

  return Array.from(buckets.values()).map(bucket => ({
    lng: bucket.sumLng / bucket.count,
    lat: bucket.sumLat / bucket.count,
    count: bucket.count
  }))
}
