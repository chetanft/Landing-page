import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import type { Color } from '@deck.gl/core'
import { Map as MapGL } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { Typography } from 'ft-design-system'
import type { TabData, GlobalFilters } from '../types/metrics'
import { getJourneyMapPoints, subscribeToJourneySearchUpdates, type JourneyMapPoint } from '../data/journeyApiService'

interface JourneyMapViewProps {
  tabData: TabData | null
  globalFilters: GlobalFilters
}

const DEFAULT_VIEW_STATE = {
  longitude: 77.5946, // Bengaluru
  latitude: 12.9716,
  zoom: 5,
  pitch: 0,
  bearing: 0
}

const FALLBACK_ON_TIME_COLOR: [number, number, number, number] = [34, 197, 94, 220]
const FALLBACK_DELAYED_COLOR: [number, number, number, number] = [239, 68, 68, 220]
const POINTS_MIN_ZOOM = 10

const parseCssColor = (value: string, fallback: [number, number, number, number]): [number, number, number, number] => {
  const trimmed = value.trim()
  if (!trimmed) return fallback
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

const toColor = (value: [number, number, number, number]): Color => {
  return new Uint8ClampedArray(value)
}

const resolveCssVarColor = (cssVar: string, fallback: [number, number, number, number]): Color => {
  if (typeof window === 'undefined') return toColor(fallback)
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar)
  return toColor(parseCssColor(value, fallback))
}

const getGridStep = (zoom: number): number => {
  if (zoom < 6) return 2
  if (zoom < 8) return 1
  return 0.5
}

const buildGridCounts = (points: JourneyMapPoint[], zoom: number) => {
  const step = getGridStep(zoom)
  const buckets: Map<string, { lng: number; lat: number; count: number; delayedCount: number; sumLng: number; sumLat: number }> = new Map()

  points.forEach(point => {
    const bucketLng = Math.floor(point.lng / step) * step
    const bucketLat = Math.floor(point.lat / step) * step
    const key = `${bucketLng}:${bucketLat}`
    const existing = buckets.get(key)
    if (existing) {
      existing.count += 1
      existing.sumLng += point.lng
      existing.sumLat += point.lat
      if (point.isDelayed) existing.delayedCount += 1
    } else {
      buckets.set(key, {
        lng: bucketLng + step / 2,
        lat: bucketLat + step / 2,
        count: 1,
        delayedCount: point.isDelayed ? 1 : 0,
        sumLng: point.lng,
        sumLat: point.lat
      })
    }
  })

  return Array.from(buckets.values()).map(bucket => ({
    lng: bucket.sumLng / bucket.count,
    lat: bucket.sumLat / bucket.count,
    count: bucket.count,
    delayedCount: bucket.delayedCount
  }))
}

export default function JourneyMapView({ tabData, globalFilters }: JourneyMapViewProps) {
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE)
  const [cacheTick, setCacheTick] = useState(0)
  
  const mapPoints = useMemo<JourneyMapPoint[]>(
    () => getJourneyMapPoints(globalFilters),
    [globalFilters, tabData, cacheTick]
  )
  const visiblePoints = useMemo(
    () => mapPoints.filter(point => point.journey_status !== 'CLOSED'),
    [mapPoints]
  )
  const delayedPoints = useMemo(
    () => visiblePoints.filter(point => point.isDelayed),
    [visiblePoints]
  )
  const showPoints = viewState.zoom >= POINTS_MIN_ZOOM

  useEffect(() => {
    const unsubscribe = subscribeToJourneySearchUpdates(() => {
      setCacheTick((prev) => prev + 1)
    })
    return unsubscribe
  }, [])
  const onTimeColor = useMemo(
    () => resolveCssVarColor('--status-success', FALLBACK_ON_TIME_COLOR),
    []
  )
  const delayedColor = useMemo(
    () => resolveCssVarColor('--status-error', FALLBACK_DELAYED_COLOR),
    []
  )
  const labelColor = useMemo(
    () => resolveCssVarColor('--text-inverse', [255, 255, 255, 255]),
    []
  )

  const layers = useMemo(() => {
    if (!visiblePoints.length) return []

    const gridCounts = buildGridCounts(delayedPoints, viewState.zoom)

    const countBadge = new ScatterplotLayer<{ lng: number; lat: number; count: number; delayedCount: number }>({
      id: showPoints ? 'journey-count-badge-points' : 'journey-heatmap-count-badge',
      data: gridCounts,
      getPosition: d => [d.lng, d.lat],
      getRadius: d => Math.min(22000, 9000 + d.count * 600),
      radiusMinPixels: 14,
      radiusMaxPixels: 26,
      filled: true,
      stroked: false,
      getFillColor: () => delayedColor,
      opacity: 0.95,
      pickable: false
    })


    const countLabels = new TextLayer<{ lng: number; lat: number; count: number }>({
      id: showPoints ? 'journey-counts-points' : 'journey-heatmap-counts',
      data: gridCounts,
      getPosition: d => [d.lng, d.lat],
      getText: d => String(d.count),
      getSize: 14,
      sizeUnits: 'pixels',
      getColor: labelColor,
      fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      billboard: true,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      characterSet: '0123456789',
      pickable: false
    })

    if (showPoints) {
      return [
        new ScatterplotLayer<JourneyMapPoint>({
          id: 'journey-scatter',
          data: visiblePoints,
          getPosition: d => [d.lng, d.lat],
          getRadius: 7000,
          radiusMinPixels: 4,
          radiusMaxPixels: 10,
          filled: true,
          stroked: true,
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 1,
          getFillColor: d => (d.isDelayed ? delayedColor : onTimeColor),
          opacity: 0.85,
          pickable: true
        }),
        countBadge,
        countLabels
      ]
    }

    const heatmap = new HeatmapLayer<JourneyMapPoint>({
      id: 'journey-heatmap',
      data: delayedPoints,
      getPosition: d => [d.lng, d.lat],
      getWeight: () => 1,
      radiusPixels: 55,
      intensity: 1.4,
      threshold: 0.03,
      colorRange: [
        [254, 226, 226],
        [252, 165, 165],
        [248, 113, 113],
        [239, 68, 68],
        [220, 38, 38],
        [185, 28, 28]
      ],
      opacity: 0.5
    })

    return [heatmap, countBadge, countLabels]
  }, [visiblePoints, delayedPoints, showPoints, viewState.zoom, onTimeColor, delayedColor, labelColor])

  if (visiblePoints.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--spacing-x16) var(--spacing-x6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 280px)',
          backgroundColor: 'var(--bg-primary)',
          border: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <Typography variant="body-primary-regular" color="tertiary" style={{ fontSize: 'var(--font-size-md)' }}>
          No locations available
        </Typography>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        height: 'calc(100vh - 280px)',
        minHeight: '600px',
        position: 'relative'
      }}
    >
      <DeckGL
        layers={layers}
        controller={{ dragRotate: false, touchRotate: false }}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof DEFAULT_VIEW_STATE)}
        getTooltip={({ object }) => {
          if (!object) return null
          const journey = object as JourneyMapPoint
          const statusLabel = journey.isDelayed ? 'Delayed' : 'On time'
          const vehicleLabel = journey.vehicle_number || ''
          return {
            html: `
              <div style="font-weight:600; margin-bottom:4px;">${journey.journey_fteid || 'Journey'}</div>
              <div style="font-size:12px;">Status: ${statusLabel}</div>
              <div style="font-size:12px;">Vehicle number: ${vehicleLabel}</div>
              ${journey.eta ? '<div style="font-size:12px;">ETA: ' + journey.eta + '</div>' : ''}
            `,
            style: {
              backgroundColor: 'var(--bg-inverse, #0F172A)',
              color: 'var(--text-inverse, #F8FAFC)',
              padding: '8px',
              borderRadius: '8px'
            }
          }
        }}
      >
        <MapGL
          mapLib={maplibregl}
          mapStyle={{
            version: 8,
            sources: {
              'osm-tiles': {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              }
            },
            layers: [
              {
                id: 'osm-base',
                type: 'raster',
                source: 'osm-tiles',
                minzoom: 0,
                maxzoom: 22
              }
            ]
          }}
        />
      </DeckGL>
    </div>
  )
}
