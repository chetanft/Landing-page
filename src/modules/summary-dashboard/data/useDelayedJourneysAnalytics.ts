import { useEffect, useMemo, useState } from 'react'
import type { GlobalFilters } from '../types/metrics'
import {
  ensureJourneySearchData,
  getAllJourneySearchItems,
  subscribeToJourneySearchUpdates,
  getJourneyAlertsForJourney
} from './journeyApiService'

export type AlertOptionId = 'all' | 'long_stoppage' | 'stop_breach' | 'route_deviation' | 'eway_bill' | 'diversion'

export interface TransporterAlertBreakdown {
  transporter: string
  counts: Record<Exclude<AlertOptionId, 'all'>, number>
  total: number
}

export interface CriticalJourneyItem {
  journeyId: string
  vehicleNumber: string
  transporter: string
  delayMinutes: number
  alerts: Exclude<AlertOptionId, 'all'>[]
}

export interface DelayedJourneysAnalytics {
  delayedCount: number
  activeCount: number
  delayedPercent: number
  transporters: TransporterAlertBreakdown[]
  criticalJourneys: CriticalJourneyItem[]
  availableAlerts: AlertOptionId[]
}

const ALERT_LABEL_MAP: Record<AlertOptionId, string> = {
  all: 'All Alerts',
  long_stoppage: 'Long Stoppage',
  stop_breach: 'Stop Breach',
  route_deviation: 'Route Deviation',
  eway_bill: 'E-way Bill',
  diversion: 'Diversion'
}

const KNOWN_ALERTS: Exclude<AlertOptionId, 'all'>[] = [
  'long_stoppage',
  'stop_breach',
  'route_deviation',
  'eway_bill',
  'diversion'
]

// Active journeys should cover En Route to Loading → At Destination
const ACTIVE_STATUSES = new Set([
  'BEFORE_ORIGIN',
  'AT_ORIGIN',
  'IN_TRANSIT',
  'AT_DESTINATION'
])

const normalizeAlertName = (value?: string): Exclude<AlertOptionId, 'all'> | null => {
  if (!value) return null
  const normalized = value.toLowerCase().replace(/\s+/g, '_')
  if (normalized.includes('long') && normalized.includes('stoppage')) return 'long_stoppage'
  if (normalized.includes('stop') && normalized.includes('breach')) return 'stop_breach'
  if (normalized.includes('route') && normalized.includes('deviation')) return 'route_deviation'
  if (normalized.includes('eway')) return 'eway_bill'
  if (normalized.includes('diversion')) return 'diversion'
  return null
}

const getDelayMinutes = (journey: Record<string, unknown>): number => {
  const raw = journey.delay_in_minutes
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const parsed = parseFloat(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const getTransporterName = (journey: Record<string, unknown>): string => {
  const transporterInfo = journey.transporter_info as { transporter_name?: string } | undefined
  if (transporterInfo?.transporter_name) return transporterInfo.transporter_name

  const transporterName = journey.transporter_name as string | undefined
  if (transporterName) return transporterName

  const transporterObj = journey.transporter as { transporter_name?: string } | undefined
  if (transporterObj?.transporter_name) return transporterObj.transporter_name

  const lcuList = journey.lcu as Array<{ transporter_name?: string }> | undefined
  if (Array.isArray(lcuList)) {
    const lcuName = lcuList.find(item => item.transporter_name)?.transporter_name
    if (lcuName) return lcuName
  }

  return 'Unknown'
}

const getVehicleNumber = (journey: Record<string, unknown>): string => {
  const vehicleInfo = journey.vehicle_info as { vehicle_number?: string } | undefined
  return vehicleInfo?.vehicle_number || '--'
}

const getJourneyAlerts = (journey: Record<string, unknown>): Exclude<AlertOptionId, 'all'>[] => {
  const journeyId = journey.journey_fteid ? String(journey.journey_fteid) : ''
  const alertsPayload = journeyId ? getJourneyAlertsForJourney(journeyId) : null
  const alerts = (alertsPayload?.alerts ?? alertsPayload) as Array<{ alert_name?: string }> | undefined
  if (!Array.isArray(alerts) || alerts.length === 0) return []
  const mapped = alerts
    .map(alert => normalizeAlertName(alert.alert_name))
    .filter((alert): alert is Exclude<AlertOptionId, 'all'> => Boolean(alert))
  return Array.from(new Set(mapped))
}

export const getAlertLabel = (alertId: AlertOptionId) => ALERT_LABEL_MAP[alertId]

export const useDelayedJourneysAnalytics = (globalFilters: GlobalFilters) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheTick, setCacheTick] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    ensureJourneySearchData(globalFilters)
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load journeys')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [globalFilters])

  useEffect(() => {
    const unsubscribe = subscribeToJourneySearchUpdates(() => {
      setCacheTick((prev) => prev + 1)
    })
    return unsubscribe
  }, [])

  const analytics = useMemo<DelayedJourneysAnalytics>(() => {
    const journeys = getAllJourneySearchItems()
    const transporterMap = new Map<string, TransporterAlertBreakdown>()
    let activeCount = 0
    let delayedCount = 0
    const criticalJourneys: CriticalJourneyItem[] = []

    journeys.forEach((journey) => {
      const status = String(journey.journey_status || '')
      const isActive = ACTIVE_STATUSES.has(status)
      if (isActive) {
        activeCount += 1
      }

      const delayMinutes = getDelayMinutes(journey)
      const alerts = getJourneyAlerts(journey)
      const isDelayed = delayMinutes > 0 || alerts.length > 0
      if (isDelayed && isActive) {
        delayedCount += 1
        criticalJourneys.push({
          journeyId: String(journey.journey_fteid || ''),
          vehicleNumber: getVehicleNumber(journey),
          transporter: getTransporterName(journey),
          delayMinutes,
          alerts
        })
      }

      if (!isActive) return
      const rawTransporter = getTransporterName(journey)
      const transporter = rawTransporter === 'Unknown' ? 'Others' : rawTransporter
      const entry = transporterMap.get(transporter) || {
        transporter,
        counts: {
          long_stoppage: 0,
          stop_breach: 0,
          route_deviation: 0,
          eway_bill: 0,
          diversion: 0
        },
        total: 0
      }

      alerts.forEach((alert) => {
        entry.counts[alert] += 1
      })
      // Count delayed journeys (not just those with alerts) within active window
      entry.total += isDelayed ? 1 : 0
      transporterMap.set(transporter, entry)
    })

    const transporters = Array.from(transporterMap.values())
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (a.transporter === 'Others') return 1
        if (b.transporter === 'Others') return -1
        return b.total - a.total
      })

    const sortedCritical = criticalJourneys
      .filter(item => item.journeyId)
      .sort((a, b) => b.delayMinutes - a.delayMinutes)
      .slice(0, 8)

    const delayedPercent = activeCount ? Math.round((delayedCount / activeCount) * 100) : 0

    return {
      delayedCount,
      activeCount,
      delayedPercent,
      transporters,
      criticalJourneys: sortedCritical,
      availableAlerts: ['all', ...KNOWN_ALERTS]
    }
  }, [globalFilters, cacheTick])

  return { analytics, loading, error }
}
