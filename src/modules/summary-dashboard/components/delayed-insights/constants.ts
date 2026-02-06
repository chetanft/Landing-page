import type { AlertOptionId } from '../../hooks/useDelayedJourneysAnalytics'

export const ALERT_COLORS: Record<Exclude<AlertOptionId, 'all'>, string> = {
  long_stoppage: 'var(--critical)',
  stop_breach: 'var(--warning)',
  route_deviation: 'var(--critical)',
  eway_bill: 'var(--secondary)',
  diversion: 'var(--positive)'
}

export const DEFAULT_DELAYED_COLOR = 'var(--warning)'
