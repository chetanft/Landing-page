import { Card, Typography } from 'ft-design-system'
import type { CriticalJourneyItem } from '../../hooks/useDelayedJourneysAnalytics'
import { getAlertLabel } from '../../hooks/useDelayedJourneysAnalytics'

interface CriticalJourneyCardProps {
  journey: CriticalJourneyItem
}

export default function CriticalJourneyCard({ journey }: CriticalJourneyCardProps) {
  return (
    <Card style={{ padding: '20px' }}>
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
  )
}
