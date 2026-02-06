import { useEffect } from 'react'
import { Card, Typography, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'ft-design-system'
import type { AlertOptionId, CriticalJourneyItem, TransporterAlertBreakdown } from '../hooks/useDelayedJourneysAnalytics'
import { getAlertLabel } from '../hooks/useDelayedJourneysAnalytics'
import TransporterAlertBarChart from './delayed-insights/TransporterAlertBarChart'
import { CriticalJourneyCard } from './delayed-insights'

interface DelayedInsightsDrawerProps {
  open: boolean
  onClose: () => void
  selectedAlert: AlertOptionId
  onAlertChange: (alert: AlertOptionId) => void
  transporters: TransporterAlertBreakdown[]
  criticalJourneys: CriticalJourneyItem[]
  availableAlerts: AlertOptionId[]
  activeCount: number
  selectedCount?: number | null
}

export default function DelayedInsightsDrawer({
  open,
  onClose,
  selectedAlert,
  onAlertChange,
  transporters,
  criticalJourneys,
  availableAlerts,
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
  const computedTotal = transporters.reduce((sum, item) => (
    selectedAlert === 'all'
      ? sum + item.total
      : sum + item.counts[selectedAlert]
  ), 0)
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

        <Card className="delayed-insights-summary-card" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: '0px', flexDirection: 'column', height: 'fit-content', fontWeight: 600 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Typography variant="display-primary" style={{ fontSize: 'var(--font-size-xxl)' }}>{selectedTotal}</Typography>
              <Typography variant="body-secondary-regular" color="tertiary">
                {percentOfActive}% of Active Journeys
              </Typography>
            </div>
          </div>
        </Card>

        <Card className="delayed-insights-breakdown-card" style={{ padding: 'var(--spacing-x5)', marginBottom: 'var(--spacing-x6)' }}>
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
            <TransporterAlertBarChart
              transporters={transporters}
              selectedAlert={selectedAlert}
            />
          )}
        </Card>

        <Typography variant="body-primary-semibold" style={{ marginBottom: 'var(--spacing-x4)', color: 'var(--color-primary)' }}>
          Critical Journeys
        </Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
          {criticalJourneys.map((journey) => (
            <CriticalJourneyCard key={journey.journeyId} journey={journey} />
          ))}
        </div>
      </div>
    </div>
  )
}
