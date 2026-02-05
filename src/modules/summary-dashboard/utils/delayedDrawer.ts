import type { MetricData } from '../types/metrics'
import type { AlertOptionId } from '../data/useDelayedJourneysAnalytics'

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

export const getDelayedDrawerSelection = (metric: MetricData): AlertOptionId | null => {
  const id = metric.metricId.toLowerCase()
  const label = normalize(metric.label)

  if (id.includes('delay-delayed') || label === 'delayed') return 'all'
  if (id.includes('long-stoppage') || label.includes('long stoppage')) return 'long_stoppage'
  if (id.includes('route-deviation') || label.includes('route deviation')) return 'route_deviation'
  if (id.includes('diversion') || label.includes('diversion')) return 'diversion'
  if (id.includes('eway-bill') || label.includes('eway')) return 'eway_bill'
  if (id.includes('stop-breach') || label.includes('stop breach')) return 'stop_breach'
  return null
}
