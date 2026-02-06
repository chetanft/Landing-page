import { Typography } from 'ft-design-system'
import type { AlertOptionId } from '../../hooks/useDelayedJourneysAnalytics'
import { ALERT_COLORS, DEFAULT_DELAYED_COLOR } from './constants'

interface ChartBarProps {
  transporter: string
  total: number
  segments: Array<{ alert: Exclude<AlertOptionId, 'all'>; value: number }>
  maxValue: number
}

export default function ChartBar({
  transporter,
  total,
  segments,
  maxValue
}: ChartBarProps) {
  const heightPct = maxValue ? Math.max(32, Math.round((total / maxValue) * 160)) : 0
  // Check if any segment has values - if not, show default delayed color
  const hasSegmentValues = segments.some(s => s.value > 0)

  return (
    <div
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
