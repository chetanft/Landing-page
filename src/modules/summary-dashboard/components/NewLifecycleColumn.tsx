import React from 'react'
import { Card, Icon, Typography, Divider, Collapsible, CollapsibleContent } from 'ft-design-system'
import type { LifecycleStage, GlobalFilters } from '../types/metrics'
import ProgressItem from './ProgressItem'
import ExceptionItem from './ExceptionItem'
import StatusItem from './StatusItem'

interface NewLifecycleColumnProps {
  stage: LifecycleStage
  icon?: string
  globalFilters: GlobalFilters
  sectionStates: SectionState
}

interface SectionState {
  milestones: boolean
  status: boolean
  exceptions: boolean
}

export default function NewLifecycleColumn({ stage, icon, globalFilters, sectionStates }: NewLifecycleColumnProps) {
  // Filter out summary metrics (groupKey === 'summary') as they're redundant with the header
  const displayableMetrics = stage.metrics.filter(m => m.groupKey !== 'summary')
  
  // Calculate header total: use summary metric if available, otherwise sum all metrics
  const summaryMetric = stage.metrics.find(m => m.groupKey === 'summary')
  const totalCount = summaryMetric?.count ?? 
    (stage.id === 'indents'
      ? stage.metrics.filter(metric => !metric.label.startsWith('  ')).reduce((sum, m) => sum + m.count, 0)
      : stage.metrics.reduce((sum, m) => sum + m.count, 0))
  const orderedMetrics = stage.id === 'planning'
    ? displayableMetrics
      .map((metric, index) => ({
        metric,
        index,
        order: {
          'orders.planning.unplanned': 1,
          'orders.planning.planned': 2,
          'orders.planning.partially_planned': 3,
          'orders.planning.validation_in_progress': 4,
          'orders.planning.validation_success': 5,
          'orders.planning.validation_failure': 6,
          'orders.planning.core_failed': 7,
        }[metric.metricId] ?? 99,
      }))
      .sort((a, b) => a.order - b.order || a.index - b.index)
      .map(({ metric }) => metric)
    : displayableMetrics

  return (
    <Card style={{ backgroundColor: 'var(--bg-primary)', border: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)', boxShadow: 'var(--shadow-sm)', flex: '1', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', minWidth: '0' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)', justifyContent: 'flex-start', alignItems: 'flex-start', padding: 'var(--spacing-x5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
          {icon && <Icon name={icon as any} size={16} style={{ color: 'var(--text-tertiary)' }} />}
          <Typography variant="body-primary-semibold" color="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
            {stage.title}
          </Typography>
          <Icon name="info" size={14} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <Typography variant="display-primary" color="primary" style={{ fontSize: 'var(--font-size-xxl)' }}>
          {totalCount}
        </Typography>
      </div>

      {/* Divider */}
      <div style={{ display: sectionStates.milestones ? 'block' : 'none' }}>
        <Divider style={{ borderColor: 'var(--border-primary)', padding: 'var(--spacing-x4) 0' }} />
      </div>

      {/* Milestone Section */}
      <div style={{ transition: 'all var(--transition-normal) ease-in-out', overflow: 'hidden', opacity: sectionStates.milestones ? 1 : 0, maxHeight: sectionStates.milestones ? 'calc(var(--spacing-x24) * 20)' : '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: 'var(--spacing-x4) var(--spacing-x3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-x2)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-x2)' }}>
            <Typography variant="body-secondary-medium" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
              MILESTONE
            </Typography>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'var(--spacing-x2)' }}>
            {orderedMetrics.map((metric, index) => (
              <ProgressItem
                key={metric.metricId}
                metric={metric}
                globalFilters={globalFilters}
                isFirst={index === 0}
                isLast={index === orderedMetrics.length - 1}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status Section */}
      {stage.status && stage.status.length > 0 && (
        <div style={{ transition: 'all var(--transition-normal) ease-in-out', overflow: 'hidden', opacity: sectionStates.status ? 1 : 0, maxHeight: sectionStates.status ? 'calc(var(--spacing-x24) * 20)' : '0' }}>
          <div style={{ paddingTop: '0' }}>
            <Divider style={{ borderColor: 'var(--border-secondary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 'var(--spacing-x4) var(--spacing-x3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-x2)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-x2)' }}>
              <Typography variant="body-secondary-medium" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
                STATUS
              </Typography>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)', marginTop: 'var(--spacing-x2)' }}>
              {stage.status.map((status, index) => (
                <StatusItem
                  key={`status-${index}`}
                  metric={status}
                  globalFilters={globalFilters}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exceptions Section */}
      {stage.exceptions && stage.exceptions.length > 0 && (
        <div style={{ transition: 'all var(--transition-normal) ease-in-out', overflow: 'hidden', opacity: sectionStates.exceptions ? 1 : 0, maxHeight: sectionStates.exceptions ? 'calc(var(--spacing-x24) * 20)' : '0' }}>
          <div style={{ paddingTop: '0' }}>
            <Divider style={{ borderColor: 'var(--border-secondary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 'var(--spacing-x4) var(--spacing-x3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-x2)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-x2)' }}>
              <Typography variant="body-secondary-medium" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase' }}>
                EXCEPTIONS
              </Typography>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)', marginTop: 'var(--spacing-x2)' }}>
              {stage.exceptions.map((exception, index) => (
                <ExceptionItem
                  key={`exception-${index}`}
                  metric={exception}
                  globalFilters={globalFilters}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
