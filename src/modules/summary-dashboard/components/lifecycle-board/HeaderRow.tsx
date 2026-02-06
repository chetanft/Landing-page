import { Icon, Typography } from 'ft-design-system'
import type { LifecycleStage } from '../../types/metrics'
import Tooltip from '../Tooltip'
import { thinBorder, getStageIcon, getStageDescription } from './lifecycleBoardUtils'

interface HeaderRowProps {
  stages: LifecycleStage[]
}

export default function HeaderRow({ stages }: HeaderRowProps) {
  return (
    <div style={{
      display: 'flex',
      borderBottom: thinBorder,
      backgroundColor: 'var(--bg-primary)'
    }}>
      {stages.map((stage, index) => {
        const iconName = getStageIcon(stage.title)
        // Calculate header total: use the main milestone count (summary group)
        // Don't sum breakdown metrics (priority, POD, etc.) as they're subsets of the total
        // The summary metric has groupKey === 'summary' and represents the main milestone count
        const summaryMetric = stage.metrics.find(m => m.groupKey === 'summary')
        const totalCount = summaryMetric?.count ??
          // Fallback: if no summary metric, find metric with label "Total"
          stage.metrics.find(m => m.label === 'Total')?.count ??
          // Last fallback: sum only non-grouped metrics (shouldn't happen in normal flow)
          stage.metrics.filter(m => !m.groupKey || m.groupKey === 'summary').reduce((sum, m) => sum + m.count, 0)
        const totalDisplay = summaryMetric?.isMissing ? '-' : totalCount.toLocaleString()
        const description = getStageDescription(stage.title)

        return (
          <div
            key={stage.id}
            style={{
              flex: 1,
              paddingTop: 'var(--spacing-x5)',
              paddingBottom: 'var(--spacing-x5)',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderLeft: index > 0 ? thinBorder : 'none',
              minHeight: 'var(--spacing-x20)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-x2)', marginBottom: 'var(--spacing-x2)' }}>
              {iconName && <Icon name={iconName} size={14} style={{ color: 'var(--text-tertiary)', marginTop: 'calc(var(--spacing-x1) / 2)' }} />}
              <Typography variant="body-primary-semibold" color="primary" style={{
                fontSize: 'var(--font-size-sm)',
                flex: 1,
                color: 'var(--color-secondary)'
              }}>
                {stage.title}
              </Typography>
              <Tooltip content={description}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '0',
                    background: 'none',
                    padding: '0',
                    cursor: 'help',
                    marginTop: 'calc(var(--spacing-x1) / 4)'
                  }}
                  aria-label={`Information about ${stage.title}`}
                >
                  <Icon name="info" size={12} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </Tooltip>
            </div>
            <Typography variant="display-primary" color="primary" style={{
              fontSize: '32px'
            }}>
              {totalDisplay}
            </Typography>
          </div>
        )
      })}
    </div>
  )
}
