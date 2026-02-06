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
  route_deviation: 'var(--critical)',
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
    <div style={{ flex: 1, minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
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
  const axisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))
  const gridLineColor = 'var(--border-primary)'
  const verticalGridPositions = displayTotals.length > 0
    ? Array.from({ length: displayTotals.length + 1 }, (_, index) => (index / displayTotals.length) * 100)
    : []

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 180, pointerEvents: 'none' }}>
        {axisTicks.map((tick) => (
          <div
            key={`grid-y-${tick}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: `${maxValue ? (tick / maxValue) * 100 : 0}%`,
              height: 1,
              backgroundColor: gridLineColor,
              opacity: 0.35
            }}
          />
        ))}
        {verticalGridPositions.map((left) => (
          <div
            key={`grid-x-${left}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${left}%`,
              width: 1,
              backgroundColor: gridLineColor,
              opacity: 0.2
            }}
          />
        ))}
      </div>
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
