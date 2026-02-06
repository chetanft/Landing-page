import { Button, Typography } from 'ft-design-system'
import type { LifecycleStage, GlobalFilters } from '../../types/metrics'
import type { AlertOptionId } from '../../hooks/useDelayedJourneysAnalytics'
import ProgressItem from '../ProgressItem'
import StatusItem from '../StatusItem'
import { thinBorder, groupMetrics } from './lifecycleBoardUtils'

interface MilestonesRowProps {
  stages: LifecycleStage[]
  globalFilters: GlobalFilters
  onRetry: () => void
  suppressErrors?: boolean
  onOpenDelayedDrawer?: (alert: AlertOptionId, count: number) => void
}

export default function MilestonesRow({
  stages,
  globalFilters,
  onRetry,
  suppressErrors = false,
  onOpenDelayedDrawer
}: MilestonesRowProps) {
  return (
    <div style={{ display: 'flex', borderBottom: thinBorder, alignItems: 'stretch' }}>
      {stages.map((stage, index) => {
        const groups = groupMetrics(stage.metrics)
        const hasGroups = groups.length > 0
        const isGrouped = groups.length > 1 || (groups.length === 1 && groups[0].groupLabel !== null)
        const hasError = Boolean(stage.error) && !suppressErrors

        return (
          <div
            key={`milestones-${stage.id}`}
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
              MILESTONE
            </Typography>

            {hasError ? (
              <div style={{
                padding: 'var(--spacing-x3)',
                borderRadius: 'var(--radius-md)',
                border: thinBorder,
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-x2)'
              }}>
                <Typography variant="body-secondary-regular" color="tertiary" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {stage.error}
                </Typography>
                <Button variant="text" size="sm" onClick={onRetry} style={{ alignSelf: 'flex-start' }}>
                  Retry
                </Button>
              </div>
            ) : hasGroups ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {groups.map((group, groupIdx) => (
                  <div key={group.groupKey} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Divider between groups (not before first group) */}
                    {isGrouped && groupIdx > 0 && (
                      <div style={{
                        height: '1px',
                        backgroundColor: 'var(--border-secondary)',
                        marginTop: 'var(--spacing-x4)',
                        marginBottom: 'var(--spacing-x4)'
                      }} />
                    )}

                    {/* Sub-section header (only if groupLabel exists) */}
                    {group.groupLabel && (
                      <Typography variant="body-secondary-semibold" color="tertiary" style={{
                        fontSize: 'var(--font-size-xs)',
                        textTransform: 'uppercase',
                        letterSpacing: 'calc(var(--spacing-x1) / 8)',
                        marginBottom: 'var(--spacing-x2)',
                        marginTop: groupIdx === 0 ? '0' : 'var(--spacing-x1)'
                      }}>
                        {group.groupLabel}
                      </Typography>
                    )}

                    {/* Progress items within this group */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {group.items.map((metric, itemIdx) => {
                        // Render StatusItem for At Drop / At Pickup / At Drop + Pickup metrics
                        const isStatusItemMetric = ['in-transit-at-drop', 'in-transit-at-pickup', 'in-transit-at-drop-pickup'].includes(metric.metricId)

                        if (isStatusItemMetric) {
                          return (
                            <div key={metric.metricId} style={{ padding: 'var(--spacing-x2) 0' }}>
                              <StatusItem
                                metric={metric}
                                globalFilters={globalFilters}
                                onOpenDelayedDrawer={onOpenDelayedDrawer}
                              />
                            </div>
                          )
                        }

                        return (
                          <ProgressItem
                            key={metric.metricId}
                            metric={metric}
                            globalFilters={globalFilters}
                            isFirst={itemIdx === 0}
                            isLast={itemIdx === group.items.length - 1}
                          />
                        )
                      })}
                    </div>
                  </div>
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
        )
      })}
    </div>
  )
}
