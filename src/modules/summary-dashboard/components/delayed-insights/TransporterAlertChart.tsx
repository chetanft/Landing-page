import { Typography } from 'ft-design-system'
import type { AlertOptionId, TransporterAlertBreakdown } from '../../hooks/useDelayedJourneysAnalytics'
import { getAlertLabel } from '../../hooks/useDelayedJourneysAnalytics'
import ChartBar from './ChartBar'
import { ALERT_COLORS } from './constants'

interface TransporterAlertChartProps {
  transporters: TransporterAlertBreakdown[]
  selectedAlert: AlertOptionId
  totalOverride?: number
}

export default function TransporterAlertChart({
  transporters,
  selectedAlert,
  totalOverride
}: TransporterAlertChartProps) {
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
  const gridLineColor = 'var(--border-primary)'
  const verticalGridPositions = displayTotals.length > 0
    ? Array.from({ length: displayTotals.length + 1 }, (_, index) => (index / displayTotals.length) * 100)
    : []

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
        <div style={{ position: 'relative', flex: 1 }}>
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
