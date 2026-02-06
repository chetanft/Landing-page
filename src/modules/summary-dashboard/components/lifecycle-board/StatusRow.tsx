import { Typography } from 'ft-design-system'
import type { LifecycleStage, GlobalFilters } from '../../types/metrics'
import type { AlertOptionId } from '../../hooks/useDelayedJourneysAnalytics'
import StatusItem from '../StatusItem'
import { thinBorder } from './lifecycleBoardUtils'

interface StatusRowProps {
  stages: LifecycleStage[]
  globalFilters: GlobalFilters
  onOpenDelayedDrawer?: (alert: AlertOptionId, count: number) => void
}

export default function StatusRow({
  stages,
  globalFilters,
  onOpenDelayedDrawer
}: StatusRowProps) {
  return (
    <div style={{ display: 'flex', borderBottom: thinBorder, alignItems: 'stretch' }}>
      {stages.map((stage, index) => (
        <div
          key={`status-${stage.id}`}
          style={{
            flex: 1,
            paddingTop: 'var(--spacing-x5)',
            paddingBottom: 'var(--spacing-x5)',
            paddingLeft: '20px',
            paddingRight: '20px',
            borderLeft: index > 0 ? thinBorder : 'none',
            minHeight: 'calc(var(--spacing-x12) + var(--spacing-x3))',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Column Header */}
          <Typography variant="body-secondary-medium" color="tertiary" style={{
            fontSize: 'var(--font-size-xs)',
            textTransform: 'uppercase',
            letterSpacing: 'calc(var(--spacing-x1) / 8)',
            marginBottom: 'var(--spacing-x3)'
          }}>
            STATUS
          </Typography>

          {stage.status && stage.status.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x3)' }}>
              {stage.status.map((status, idx) => (
                <StatusItem
                  key={`status-${idx}`}
                  metric={status}
                  globalFilters={globalFilters}
                  onOpenDelayedDrawer={onOpenDelayedDrawer}
                />
              ))}
            </div>
          ) : (
            <Typography variant="body-secondary-regular" color="tertiary" style={{
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontStyle: 'italic'
            }}>
              -
            </Typography>
          )}
        </div>
      ))}
    </div>
  )
}
