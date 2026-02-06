import { useMemo, useState } from 'react'
import { Card, Typography, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import { useDelayedJourneysAnalytics, type AlertOptionId, getAlertLabel } from '../hooks/useDelayedJourneysAnalytics'
import TransporterAlertBarChart from './delayed-insights/TransporterAlertBarChart'

interface DelayedInsightsPanelProps {
  globalFilters: GlobalFilters
  onOpenDrawer: (alert: AlertOptionId) => void
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

      <TransporterAlertBarChart
        transporters={transporterData}
        selectedAlert={selectedAlert}
      />
    </Card>
  )
}
