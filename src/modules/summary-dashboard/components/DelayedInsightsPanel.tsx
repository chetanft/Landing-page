import { useMemo, useState } from 'react'
import { Card, Typography, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import { useDelayedJourneysAnalytics, type AlertOptionId, type TransporterAlertBreakdown, getAlertLabel } from '../data/useDelayedJourneysAnalytics'

interface DelayedInsightsPanelProps {
  globalFilters: GlobalFilters
  onOpenDrawer: (alert: AlertOptionId) => void
}

const ALERT_COLORS: Record<Exclude<AlertOptionId, 'all'>, string> = {
  long_stoppage: 'var(--critical)',
  stop_breach: 'var(--warning)',
  route_deviation: 'var(--primary)',
  eway_bill: 'var(--secondary)',
  diversion: 'var(--positive)'
}

const buildAlertTotals = (transporters: TransporterAlertBreakdown[], alert: AlertOptionId) => {
  return transporters.map((item) => {
    if (alert === 'all') {
      return { ...item, total: item.total }
    }
    return { ...item, total: item.counts[alert] }
  })
}

const ChartBar = ({
  transporter,
  total,
  segments,
  maxValue,
  onSegmentClick
}: {
  transporter: string
  total: number
  segments: Array<{ alert: Exclude<AlertOptionId, 'all'>; value: number }>
  maxValue: number
  onSegmentClick: (alert: Exclude<AlertOptionId, 'all'>) => void
}) => {
  const heightPct = maxValue ? Math.max(32, Math.round((total / maxValue) * 160)) : 0
  return (
    <div title={`${transporter} • ${total}`} style={{ flex: 1, minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'flex-end',
          width: '100%'
        }}
      >
        <div
          style={{
            height: `${heightPct}px`,
            width: '100%',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-subtle)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column-reverse'
          }}
        >
          {segments.map((segment) => {
            if (!segment.value) return null
            return (
              <div
                key={segment.alert}
                onClick={() => onSegmentClick(segment.alert)}
                style={{
                  height: `${Math.max(6, Math.round((segment.value / total) * heightPct))}px`,
                  backgroundColor: ALERT_COLORS[segment.alert],
                  cursor: 'pointer'
                }}
              />
            )
          })}
        </div>
      </div>
      <Typography
        variant="body-secondary-regular"
        color="tertiary"
        style={{
          textAlign: 'center',
          maxWidth: 72,
          fontSize: '10px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word'
        }}
      >
        {transporter}
      </Typography>
    </div>
  )
}

const TransporterAlertChart = ({
  transporters,
  selectedAlert,
  onAlertSegmentClick
}: {
  transporters: TransporterAlertBreakdown[]
  selectedAlert: AlertOptionId
  onAlertSegmentClick: (alert: Exclude<AlertOptionId, 'all'>) => void
}) => {
  const totals = buildAlertTotals(transporters, selectedAlert)
  const sorted = [...totals].sort((a, b) => b.total - a.total)
  const top = sorted.slice(0, 5)
  const rest = sorted.slice(5)
  const restTotal = rest.reduce((sum, item) => sum + item.total, 0)
  const displayTotals = restTotal > 0
    ? [
        ...top,
        {
          transporter: 'Others',
          counts: {
            long_stoppage: 0,
            stop_breach: 0,
            route_deviation: 0,
            eway_bill: 0,
            diversion: 0
          },
          total: restTotal
        }
      ]
    : top
  const maxValue = Math.max(1, ...displayTotals.map(item => item.total))

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-x4)', padding: '0 0', overflowX: 'auto' }}>
      {displayTotals.map((item) => {
        const segments =
          selectedAlert === 'all'
            ? (Object.keys(item.counts) as Exclude<AlertOptionId, 'all'>[]).map(alert => ({
                alert,
                value: item.counts[alert]
              }))
            : [{ alert: selectedAlert, value: item.counts[selectedAlert] }]
        return (
          <ChartBar
            key={item.transporter}
            transporter={item.transporter}
            total={item.total}
            segments={segments}
            maxValue={maxValue}
            onSegmentClick={onAlertSegmentClick}
          />
        )
      })}
    </div>
  )
}

export default function DelayedInsightsPanel({ globalFilters, onOpenDrawer }: DelayedInsightsPanelProps) {
  const { analytics } = useDelayedJourneysAnalytics(globalFilters)
  const [selectedAlert, setSelectedAlert] = useState<AlertOptionId>('all')

  const transporterData = useMemo(() => analytics.transporters, [analytics.transporters])

  return (
    <Card style={{ padding: 'var(--spacing-x6)', marginBottom: '20px' }}>
      <div style={{ marginBottom: '0px', display: 'flex', flexDirection: 'column', height: 'fit-content', fontWeight: 600, padding: 0 }}>
        <Typography variant="body-primary-semibold" style={{ fontSize: '16px', fontWeight: 900 }}>Delayed</Typography>
        <Typography variant="body-secondary-regular" color="tertiary">
          {analytics.delayedPercent}% of Active Journeys
        </Typography>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-x5)' }}>
        <Typography variant="display-primary" style={{ fontSize: 'var(--font-size-xxl)' }}>{analytics.delayedCount}</Typography>
        <button
          type="button"
          onClick={() => onOpenDrawer('all')}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--spacing-x2) var(--spacing-x4)',
            cursor: 'pointer',
            color: 'var(--text-primary)'
          }}
        >
          View details
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-x3)' }}>
        <Typography variant="body-primary-semibold" style={{ width: '100%' }}>Transporter Wise Breakdown</Typography>
        <Select value={selectedAlert} onValueChange={(value) => setSelectedAlert(value as AlertOptionId)}>
          <SelectTrigger style={{ width: 80 }}>
            <SelectValue placeholder="Alerts" />
          </SelectTrigger>
          <SelectContent>
            {analytics.availableAlerts.map((alert) => (
              <SelectItem key={alert} value={alert}>
                {getAlertLabel(alert)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TransporterAlertChart
        transporters={transporterData}
        selectedAlert={selectedAlert}
        onAlertSegmentClick={(alert) => {
          setSelectedAlert(alert)
          onOpenDrawer(alert)
        }}
      />
    </Card>
  )
}
