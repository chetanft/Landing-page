import { useEffect } from 'react'
import { Card, Typography, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'ft-design-system'
import type { AlertOptionId, CriticalJourneyItem, TransporterAlertBreakdown } from '../data/useDelayedJourneysAnalytics'
import { getAlertLabel } from '../data/useDelayedJourneysAnalytics'

interface DelayedInsightsDrawerProps {
  open: boolean
  onClose: () => void
  selectedAlert: AlertOptionId
  onAlertChange: (alert: AlertOptionId) => void
  transporters: TransporterAlertBreakdown[]
  criticalJourneys: CriticalJourneyItem[]
  availableAlerts: AlertOptionId[]
  delayedCount: number
  activeCount: number
  selectedCount?: number | null
}

const ALERT_COLORS: Record<Exclude<AlertOptionId, 'all'>, string> = {
  long_stoppage: 'var(--critical)',
  stop_breach: 'var(--warning)',
  route_deviation: 'var(--primary)',
  eway_bill: 'var(--secondary)',
  diversion: 'var(--positive)'
}

const DEFAULT_DELAYED_COLOR = 'var(--warning)'

const ChartBar = ({
  transporter,
  total,
  segments,
  maxValue
}: {
  transporter: string
  total: number
  segments: Array<{ alert: Exclude<AlertOptionId, 'all'>; value: number }>
  maxValue: number
}) => {
  const heightPct = maxValue ? Math.max(32, Math.round((total / maxValue) * 160)) : 0
  // Check if any segment has values - if not, show default delayed color
  const hasSegmentValues = segments.some(s => s.value > 0)
  const tooltipText = `${transporter} • ${total}`

  return (
    <div
      title={tooltipText}
      style={{ flex: 1, minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-x2)' }}
    >
      <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
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
          {hasSegmentValues ? (
            segments.map((segment) => {
              if (!segment.value) return null
              return (
                <div
                  key={segment.alert}
                  style={{
                    height: `${Math.max(6, Math.round((segment.value / total) * heightPct))}px`,
                    backgroundColor: ALERT_COLORS[segment.alert]
                  }}
                />
              )
            })
          ) : (
            // Show default delayed bar when no alert breakdown available
            <div
              style={{
                height: `${heightPct}px`,
                backgroundColor: DEFAULT_DELAYED_COLOR
              }}
            />
          )}
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
  totalOverride
}: {
  transporters: TransporterAlertBreakdown[]
  selectedAlert: AlertOptionId
  totalOverride?: number
}) => {
  const totals = transporters.map((item) => ({
    ...item,
    total: selectedAlert === 'all' ? item.total : item.counts[selectedAlert]
  }))
  const sumTotal = totals.reduce((sum, item) => sum + item.total, 0)
  const targetTotal = typeof totalOverride === 'number' ? totalOverride : sumTotal
  const sorted = [...totals].sort((a, b) => b.total - a.total)
  const existingOthers = sorted.find(item => item.transporter === 'Others')
  const sortedWithoutOthers = sorted.filter(item => item.transporter !== 'Others')
  const top = sortedWithoutOthers.slice(0, 5)
  const rest = sortedWithoutOthers.slice(5)
  const restTotal = rest.reduce((sum, item) => sum + item.total, 0)
  const restCounts = rest.reduce((sum, item) => {
    (Object.keys(sum) as Exclude<AlertOptionId, 'all'>[]).forEach((key) => {
      sum[key] += item.counts[key]
    })
    return sum
  }, {
    long_stoppage: 0,
    stop_breach: 0,
    route_deviation: 0,
    eway_bill: 0,
    diversion: 0
  })

  const displayTotals = [...top]
  const othersTotal = (existingOthers?.total ?? 0) + restTotal
  if (othersTotal > 0) {
    const othersCounts = {
      long_stoppage: (existingOthers?.counts.long_stoppage ?? 0) + restCounts.long_stoppage,
      stop_breach: (existingOthers?.counts.stop_breach ?? 0) + restCounts.stop_breach,
      route_deviation: (existingOthers?.counts.route_deviation ?? 0) + restCounts.route_deviation,
      eway_bill: (existingOthers?.counts.eway_bill ?? 0) + restCounts.eway_bill,
      diversion: (existingOthers?.counts.diversion ?? 0) + restCounts.diversion
    }
    displayTotals.push({
      transporter: 'Others',
      counts: othersCounts,
      total: othersTotal
    })
  }

  const displaySum = displayTotals.reduce((sum, item) => sum + item.total, 0)
  if (targetTotal > displaySum) {
    const othersIndex = displayTotals.findIndex(item => item.transporter === 'Others')
    if (othersIndex >= 0) {
      displayTotals[othersIndex] = {
        ...displayTotals[othersIndex],
        total: displayTotals[othersIndex].total + (targetTotal - displaySum)
      }
    } else {
      displayTotals.push({
        transporter: 'Others',
        counts: {
          long_stoppage: 0,
          stop_breach: 0,
          route_deviation: 0,
          eway_bill: 0,
          diversion: 0
        },
        total: targetTotal - displaySum
      })
    }
  }
  const maxValue = Math.max(1, ...displayTotals.map(item => item.total))
  const axisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio))

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--spacing-x3)', alignItems: 'flex-end' }}>
        <div style={{ height: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {axisTicks
            .slice()
            .reverse()
            .map((tick) => (
              <Typography key={tick} variant="body-secondary-regular" color="tertiary" style={{ fontSize: '10px' }}>
                {tick}
              </Typography>
            ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-x4)', padding: '0 0', overflowX: 'auto', flex: 1 }}>
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
              />
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-x4)', marginTop: 'var(--spacing-x3)' }}>
        {(selectedAlert === 'all'
          ? (Object.keys(ALERT_COLORS) as Exclude<AlertOptionId, 'all'>[])
          : [selectedAlert as Exclude<AlertOptionId, 'all'>]
        ).map((alert) => (
          <div key={alert} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: ALERT_COLORS[alert], display: 'inline-block' }} />
            <Typography variant="body-secondary-regular" color="tertiary" style={{ fontSize: '10px' }}>
              {getAlertLabel(alert)}
            </Typography>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DelayedInsightsDrawer({
  open,
  onClose,
  selectedAlert,
  onAlertChange,
  transporters,
  criticalJourneys,
  availableAlerts,
  delayedCount,
  activeCount,
  selectedCount
}: DelayedInsightsDrawerProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const headerTitle = selectedAlert === 'all' ? 'Delayed' : getAlertLabel(selectedAlert)
  const computedTotal = selectedAlert === 'all'
    ? delayedCount
    : transporters.reduce((sum, item) => sum + item.counts[selectedAlert], 0)
  const selectedTotal = selectedCount ?? computedTotal
  const percentOfActive = activeCount > 0 ? Math.round((selectedTotal / activeCount) * 100) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10100 }}>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.35)' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: 'min(520px, 92vw)',
          backgroundColor: 'var(--bg-primary)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--spacing-x6)',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: 'var(--bg-primary)',
            paddingBottom: 'var(--spacing-x4)',
            marginBottom: 'var(--spacing-x5)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body-primary-semibold">{headerTitle}</Typography>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
          </div>
        </div>

        <Card style={{ padding: 'var(--spacing-x5)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: '0px', flexDirection: 'column', height: 'fit-content', fontWeight: 600, padding: 0 }}>
            <div>
              <Typography variant="display-primary" style={{ fontSize: 'var(--font-size-xxl)' }}>{selectedTotal}</Typography>
              <Typography variant="body-secondary-regular" color="tertiary">
                {percentOfActive}% of Active Journeys
              </Typography>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--spacing-x5)', marginBottom: 'var(--spacing-x6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-x4)' }}>
            <Typography variant="body-primary-semibold" style={{ width: '100%' }}>Transporter Wise Breakdown</Typography>
            <Select value={selectedAlert} onValueChange={(value) => onAlertChange(value as AlertOptionId)}>
              <SelectTrigger style={{ width: 80 }}>
                <SelectValue placeholder="Alerts" />
              </SelectTrigger>
              <SelectContent>
                {availableAlerts.map((alert) => (
                  <SelectItem key={alert} value={alert}>
                    {getAlertLabel(alert)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTotal === 0 ? (
            <Typography variant="body-secondary-regular" color="tertiary" style={{ padding: 'var(--spacing-x6) 0' }}>
              No transporter data available for this alert.
            </Typography>
          ) : (
            <TransporterAlertChart
              transporters={transporters}
              selectedAlert={selectedAlert}
              totalOverride={selectedTotal}
            />
          )}
        </Card>

        <Typography variant="body-primary-semibold" style={{ marginBottom: 'var(--spacing-x4)' }}>
          Critical Journeys
        </Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
          {criticalJourneys.map((journey) => (
            <Card key={journey.journeyId} style={{ padding: 'var(--spacing-x4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-x3)' }}>
                <Typography variant="body-primary-semibold">{journey.vehicleNumber}</Typography>
                <Typography variant="body-secondary-regular" style={{ color: 'var(--critical)' }}>
                  Delayed by {Math.round(journey.delayMinutes / 60)} hr
                </Typography>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-x2)', flexWrap: 'wrap', marginBottom: 'var(--spacing-x3)' }}>
                {journey.alerts.map((alert) => (
                  <span
                    key={alert}
                    style={{
                      background: 'var(--critical-light)',
                      color: 'var(--critical)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '12px'
                    }}
                  >
                    {getAlertLabel(alert)}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body-secondary-regular" color="tertiary">
                  Journey ID
                </Typography>
                <Typography variant="body-secondary-regular" color="tertiary">
                  Transporter
                </Typography>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body-primary-regular">{journey.journeyId}</Typography>
                <Typography variant="body-primary-regular">{journey.transporter}</Typography>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
