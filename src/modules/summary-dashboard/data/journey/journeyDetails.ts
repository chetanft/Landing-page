import type {
  JourneyMilestoneKey,
  JourneyMapPoint,
  JourneyDoRow,
  GlobalFilters
} from './journeyTypes'
import {
  journeySearchCache,
  journeyLoadsCache,
  journeyTrackingDetailsCache,
  journeyAlertsCache,
  journeyTrackingPathCache,
  journeyPodSummaryCache,
  notifyJourneySearchUpdate
} from './journeyCache'
import { buildJourneyDetailsUrl, buildJourneyPodSummaryUrl } from './journeyClient'
import { ftTmsFetch } from '../ftTmsClient'

// Fetch journey tracking details
export const fetchJourneyTrackingDetails = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<any | null> => {
  if (journeyTrackingDetailsCache.has(journeyFteid)) {
    return journeyTrackingDetailsCache.get(journeyFteid)
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/tracking', globalFilters)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success) {
      journeyTrackingDetailsCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyTrackingDetails] Failed:', error)
    }
  }
  return null
}

// Fetch journey alerts
export const fetchJourneyAlerts = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<any | null> => {
  if (journeyAlertsCache.has(journeyFteid)) {
    return journeyAlertsCache.get(journeyFteid)
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/alerts', globalFilters)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success) {
      journeyAlertsCache.set(journeyFteid, data.data)
      notifyJourneySearchUpdate()
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyAlerts] Failed:', error)
    }
  }
  return null
}

// Get cached alerts for journey
export const getJourneyAlertsForJourney = (journeyFteid: string): any | null => {
  return journeyAlertsCache.get(journeyFteid) ?? null
}

// Fetch journey tracking path
export const fetchJourneyTrackingPath = async (
  journeyFteid: string,
  globalFilters: GlobalFilters
): Promise<any[] | null> => {
  if (journeyTrackingPathCache.has(journeyFteid)) {
    return journeyTrackingPathCache.get(journeyFteid) || null
  }

  const url = buildJourneyDetailsUrl(journeyFteid, 'details/tracking/path', globalFilters)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success && Array.isArray(data.data)) {
      journeyTrackingPathCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyTrackingPath] Failed:', error)
    }
  }
  return null
}

// Fetch journey POD summary
export const fetchJourneyPodSummary = async (
  journeyFteid: string
): Promise<any | null> => {
  if (journeyPodSummaryCache.has(journeyFteid)) {
    return journeyPodSummaryCache.get(journeyFteid)
  }

  const url = buildJourneyPodSummaryUrl(journeyFteid)
  try {
    const response = await ftTmsFetch(url, { method: 'GET' })
    const data = await response.json()
    if (data?.success) {
      journeyPodSummaryCache.set(journeyFteid, data.data)
      return data.data
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetchJourneyPodSummary] Failed:', error)
    }
  }
  return null
}

// Get milestone label
const getMilestoneLabel = (status: JourneyMilestoneKey): string => {
  const mapping: Record<JourneyMilestoneKey, string> = {
    BEFORE_ORIGIN: 'En route to loading',
    AT_ORIGIN: 'At origin',
    IN_TRANSIT: 'In transit',
    AT_DESTINATION: 'At destination',
    AFTER_DESTINATION: 'Delivered',
    CLOSED: 'Delivered',
    PLANNED: 'Planning',
    IN_RETURN: 'In return'
  }
  return mapping[status] ?? 'Tracking'
}

// Get stage for status
const getStageForStatus = (status: JourneyMilestoneKey): 'Tracking' | 'Delivered' | 'Vehicle procurement' | 'Planning' => {
  if (status === 'AFTER_DESTINATION' || status === 'CLOSED') return 'Delivered'
  if (['BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION'].includes(status)) {
    return 'Tracking'
  }
  if (status === 'PLANNED') return 'Vehicle procurement'
  return 'Planning'
}

// Get map points for all journeys with valid coordinates
export function getJourneyMapPoints(_globalFilters: GlobalFilters): JourneyMapPoint[] {
  const mapPoints: JourneyMapPoint[] = []

  // Iterate through all journeys in search cache (all statuses)
  for (const [status, journeys] of journeySearchCache.entries()) {
    for (const journey of journeys) {
      const journeyFteid = journey.journey_fteid
      if (!journeyFteid) continue

      let lat: number | null = null
      let lng: number | null = null
      let eta: string | undefined
      let sta: string | undefined
      let vehicleNumber: string | undefined
      let trackingHealth: string | undefined
      let isDelayed = false

      // Primary source: Latest point in tracking path cache
      const trackingPath = journeyTrackingPathCache.get(journeyFteid)
      if (trackingPath && Array.isArray(trackingPath) && trackingPath.length > 0) {
        // Use first item (most recent) or item with highest device_time
        const latestPoint = trackingPath.reduce((latest, current) => {
          const latestTime = latest?.device_time || 0
          const currentTime = current?.device_time || 0
          return currentTime > latestTime ? current : latest
        }, trackingPath[0])

        if (latestPoint?.lat && latestPoint?.lng) {
          const parsedLat = parseFloat(String(latestPoint.lat))
          const parsedLng = parseFloat(String(latestPoint.lng))

          // Validate parsed coordinates
          if (!isNaN(parsedLat) && !isNaN(parsedLng) &&
              parsedLat >= -90 && parsedLat <= 90 &&
              parsedLng >= -180 && parsedLng <= 180 &&
              !(parsedLat === 0 && parsedLng === 0)) {
            lat = parsedLat
            lng = parsedLng
          }
        }
      }

      // Fallback: Try tracking details cache if no coordinates from path
      if (lat === null || lng === null) {
        const trackingDetails = journeyTrackingDetailsCache.get(journeyFteid)
        if (trackingDetails) {
          const detailsLat = trackingDetails.lat || trackingDetails.latitude
          const detailsLng = trackingDetails.lng || trackingDetails.longitude

          if (detailsLat && detailsLng) {
            const parsedLat = parseFloat(String(detailsLat))
            const parsedLng = parseFloat(String(detailsLng))

            // Validate parsed coordinates
            if (!isNaN(parsedLat) && !isNaN(parsedLng) &&
                parsedLat >= -90 && parsedLat <= 90 &&
                parsedLng >= -180 && parsedLng <= 180 &&
                !(parsedLat === 0 && parsedLng === 0)) {
              lat = parsedLat
              lng = parsedLng
            }
          }
        }
      }

      // Skip journeys with invalid coordinates
      if (lat === null || lng === null) {
        continue
      }

      // Extract additional data from journey or tracking details
      const trackingDetails = journeyTrackingDetailsCache.get(journeyFteid)
      if (trackingDetails) {
        eta = trackingDetails.eta || trackingDetails.expected_arrival
        sta = trackingDetails.sta || trackingDetails.scheduled_arrival
        vehicleNumber = trackingDetails.vehicle_number || trackingDetails.vehicleNumber
        trackingHealth = trackingDetails.tracking_health || trackingDetails.trackingHealth
      }

      // Also check journey data for ETA/STA/vehicle
      if (!eta && (journey as any).eta) eta = String((journey as any).eta)
      if (!sta && (journey as any).sta) sta = String((journey as any).sta)
      if (!vehicleNumber && (journey as any).vehicle_number) vehicleNumber = String((journey as any).vehicle_number)
      if (!vehicleNumber && (journey as any).vehicle_info?.vehicle_number) {
        vehicleNumber = String((journey as any).vehicle_info.vehicle_number)
      }

      const delayMinutesRaw =
        (journey as any).delay_in_minutes ??
        (journey as any).delayInMinutes ??
        trackingDetails?.delay_in_minutes ??
        trackingDetails?.delayInMinutes
      if (delayMinutesRaw !== undefined && delayMinutesRaw !== null && delayMinutesRaw !== '') {
        const parsedDelay = Number(delayMinutesRaw)
        if (!Number.isNaN(parsedDelay) && parsedDelay > 0) {
          isDelayed = true
        }
      }

      if (!isDelayed) {
        const slaStatus = (journey as any).sla?.status || (journey as any).sla_status
        if (typeof slaStatus === 'string' && slaStatus.toLowerCase().includes('delay')) {
          isDelayed = true
        }
      }

      mapPoints.push({
        journey_fteid: journeyFteid,
        lat,
        lng,
        journey_status: journey.journey_status || status,
        isDelayed,
        eta,
        sta,
        vehicle_number: vehicleNumber,
        tracking_health: trackingHealth
      })
    }
  }

  return mapPoints
}

// Get journey DO rows
export const getJourneyDoRows = (): JourneyDoRow[] => {
  const rows: JourneyDoRow[] = []

  for (const [status, journeys] of journeySearchCache.entries()) {
    const milestoneLabel = getMilestoneLabel(status)
    const stageLabel = getStageForStatus(status)
    journeys.forEach((journey) => {
      const journeyId = journey.journey_fteid
      if (!journeyId) return
      const loads = journeyLoadsCache.get(journeyId)?.data?.loads ?? []
      if (!loads || loads.length === 0) return

      loads.forEach((load) => {
        const fromLabel = load.from?.label || load.from?.address || ''
        const toLabel = load.to?.label || load.to?.address || ''
        const route = fromLabel && toLabel ? `${fromLabel} → ${toLabel}` : fromLabel || toLabel
        const consignorName = load.from?.label || ''
        const consigneeName = load.to?.label || ''
        const statusLabel = load.status || journey.journey_status || ''
        const epodStatus = typeof journey.epod_status === 'string' ? journey.epod_status : ''
        const finalStatus = stageLabel === 'Delivered' && epodStatus
          ? epodStatus
          : statusLabel

        const invoices = load.invoices ?? []
        invoices.forEach((invoice) => {
          const doNumbers = [
            invoice.do_number,
            ...(invoice.associated_do_numbers ?? [])
          ].filter((item): item is string => Boolean(item))

          const soNumbers = [
            invoice.so_number,
            ...(invoice.associated_so_numbers ?? [])
          ].filter((item): item is string => Boolean(item))

          doNumbers.forEach((doNumber) => {
            rows.push({
              journeyId,
              journeyStatus: status,
              doNumber,
              soNumbers,
              consignorName,
              consigneeName,
              route,
              tripType: 'FTL',
              stage: stageLabel,
              milestone: milestoneLabel,
              status: finalStatus,
              relatedIdType: 'Trip',
              relatedId: journeyId,
              deliveryStatus: '',
              dispatchDate: undefined
            })
          })
        })
      })
    })
  }

  return rows
}

// Get journey DO counts by status
export const getJourneyDoCountsByStatus = (): Record<string, number> => {
  const counts: Record<string, number> = {
    BEFORE_ORIGIN: 0,
    AT_ORIGIN: 0,
    IN_TRANSIT: 0,
    AT_DESTINATION: 0
  }

  const seenByStatus = new Map<JourneyMilestoneKey, Set<string>>()

  for (const [status, journeys] of journeySearchCache.entries()) {
    if (!['BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION'].includes(status)) {
      continue
    }
    if (!seenByStatus.has(status)) {
      seenByStatus.set(status, new Set<string>())
    }
    const seen = seenByStatus.get(status)!
    journeys.forEach((journey) => {
      const journeyId = journey.journey_fteid
      if (!journeyId) return
      const loads = journeyLoadsCache.get(journeyId)?.data?.loads ?? []
      loads.forEach((load) => {
        const invoices = load.invoices ?? []
        invoices.forEach((invoice) => {
          const doNumbers = [
            invoice.do_number,
            ...(invoice.associated_do_numbers ?? [])
          ].filter((item): item is string => Boolean(item))

          doNumbers.forEach((doNumber) => seen.add(doNumber))
        })
      })
    })
    counts[status] = seen.size
  }

  return counts
}
