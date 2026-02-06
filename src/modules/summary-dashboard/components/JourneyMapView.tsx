import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import { Map as MapGL } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { Typography } from 'ft-design-system'
import type { TabData, GlobalFilters } from '../types/metrics'
import { getJourneyMapPoints, subscribeToJourneySearchUpdates, type JourneyMapPoint } from '../data/journeyApiService'
import {
  FALLBACK_ON_TIME_COLOR,
  FALLBACK_DELAYED_COLOR,
  resolveCssVarColor,
  buildGridCounts,
  type GridCount
} from '../utils/mapUtils'

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

const COUNTS_MAX_ZOOM = 8

export default function JourneyMapView({ tabData, globalFilters }: JourneyMapViewProps) {
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE)
  const [cacheTick, setCacheTick] = useState(0)
  
  // tabData and cacheTick trigger recalculation when journey cache updates
  const mapPoints = useMemo<JourneyMapPoint[]>(
    () => getJourneyMapPoints(globalFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const points = new ScatterplotLayer<JourneyMapPoint>({
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
    })

    if (viewState.zoom > COUNTS_MAX_ZOOM) {
      return [heatmap, points]
    }

    const gridCounts = buildGridCounts(delayedPoints, viewState.zoom)
    const countBadge = new ScatterplotLayer<GridCount>({
      id: 'journey-delayed-count-badge',
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

    const countLabels = new TextLayer<GridCount>({
      id: 'journey-delayed-count-labels',
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

    return [heatmap, points, countBadge, countLabels]
  }, [visiblePoints, delayedPoints, viewState.zoom, onTimeColor, delayedColor, labelColor])

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
