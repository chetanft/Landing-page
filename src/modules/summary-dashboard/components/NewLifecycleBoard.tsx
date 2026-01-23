import { useEffect, useState } from 'react'
import { Button, Icon, Typography } from 'ft-design-system'
import type { IconName } from 'ft-design-system'
import type { TabData, GlobalFilters, LifecycleStage } from '../types/metrics'
import DashboardSkeleton from './DashboardSkeleton'
import ErrorBanner from './ErrorBanner'
import ProgressItem from './ProgressItem'
import ExceptionItem from './ExceptionItem'
import StatusItem from './StatusItem'
import Tooltip from './Tooltip'

interface NewLifecycleBoardProps {
  tabData: TabData | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  globalFilters: GlobalFilters
}

interface SectionState {
  milestones: boolean
  status: boolean
  exceptions: boolean
}

const thinBorder = 'calc(var(--spacing-x1) / 4) solid var(--border-primary)'

// Group metrics by groupKey for universal sub-section support
interface MetricGroup {
  groupKey: string
  groupLabel: string | null
  groupOrder: number
  items: any[]
}

function groupMetrics(metrics: any[]): MetricGroup[] {
  // Filter out metrics with count = 0
  // Also filter out summary metrics (groupKey === 'summary') as they're redundant with the header
  const nonZeroMetrics = metrics.filter(m => 
    m.count > 0 && m.groupKey !== 'summary'
  )
  
  if (nonZeroMetrics.length === 0) {
    return []
  }

  // Check if any metrics have groupKey
  const hasGrouping = nonZeroMetrics.some(m => m.groupKey)
  
  if (!hasGrouping) {
    // No grouping - return single ungrouped group
    return [{
      groupKey: 'ungrouped',
      groupLabel: null,
      groupOrder: 0,
      items: nonZeroMetrics
    }]
  }

  // Group by groupKey
  const grouped = new Map<string, MetricGroup>()
  
  nonZeroMetrics.forEach(metric => {
    const key = metric.groupKey || 'ungrouped'
    const label = metric.groupLabel || null
    const order = metric.groupOrder ?? 999
    
    if (!grouped.has(key)) {
      grouped.set(key, {
        groupKey: key,
        groupLabel: label,
        groupOrder: order,
        items: []
      })
    }
    
    grouped.get(key)!.items.push(metric)
  })

  // Convert to array and sort by groupOrder, then by groupLabel/groupKey
  const groups = Array.from(grouped.values()).sort((a, b) => {
    if (a.groupOrder !== b.groupOrder) {
      return a.groupOrder - b.groupOrder
    }
    const aLabel = a.groupLabel || a.groupKey
    const bLabel = b.groupLabel || b.groupKey
    return aLabel.localeCompare(bLabel)
  })

  return groups
}

// Map stage titles to appropriate FT Design System icons
const getStageIcon = (title: string): IconName | undefined => {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('vehicle procurement')) return undefined
  if (lowerTitle.includes('en route') || lowerTitle.includes('loading')) return 'arrow-top-right'
  if (lowerTitle.includes('in yard')) return 'arrow-top-right'
  if (lowerTitle.includes('at loading')) return 'plant'
  if (lowerTitle.includes('booked')) return 'arrow-top-right'
  if (lowerTitle.includes('picked up')) return 'plant'
  if (lowerTitle.includes('in transit')) return 'road'
  if (lowerTitle.includes('at unloading')) return 'warehouse'
  if (lowerTitle.includes('delivered')) return 'check'
  if (lowerTitle.includes('planned')) return 'planning'
  if (lowerTitle.includes('completed')) return 'check'
  if (lowerTitle.includes('closed')) return 'check'
  return undefined
}

// Get description/tooltip for each stage
const getStageDescription = (title: string): string => {
  const lowerTitle = title.toLowerCase()
  
  // Vehicle/Indent stages
  if (lowerTitle.includes('vehicle procurement')) return 'Vehicles requested and awaiting assignment'
  if (lowerTitle.includes('planned')) return 'Scheduled but not yet started'
  if (lowerTitle.includes('en route') && lowerTitle.includes('loading')) return 'Vehicle traveling to pickup location'
  if (lowerTitle.includes('in yard')) return 'Vehicle waiting at yard or depot'
  if (lowerTitle.includes('at loading')) return 'Vehicle at loading point, ready for pickup'
  
  // Journey/Shipment stages
  if (lowerTitle.includes('booked')) return 'Order confirmed and scheduled for transport'
  if (lowerTitle.includes('picked up')) return 'Cargo collected from origin'
  if (lowerTitle.includes('in transit')) return 'Currently being transported to destination'
  if (lowerTitle.includes('at unloading')) return 'Arrived at destination, awaiting unloading'
  if (lowerTitle.includes('delivered')) return 'Successfully delivered to final destination'
  
  // Generic stages
  if (lowerTitle.includes('new')) return 'Newly created, awaiting processing'
  if (lowerTitle.includes('processing')) return 'Currently being processed'
  if (lowerTitle.includes('dispatched')) return 'Dispatched from origin location'
  if (lowerTitle.includes('completed')) return 'Successfully completed'
  if (lowerTitle.includes('closed')) return 'Closed and finalized'
  if (lowerTitle.includes('cancelled')) return 'Cancelled and no longer active'
  
  // Default
  return `Current status: ${title}`
}

// Section Toggle Button Component
function SectionToggle({
  isExpanded,
  onToggle,
  label
}: {
  isExpanded: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <div style={{
      padding: 'var(--spacing-x2) var(--spacing-x3)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: thinBorder
    }}>
      <Button
        variant="text"
        size="sm"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-x1)',
          color: 'var(--text-secondary)'
        }}
      >
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          style={{ color: 'inherit' }}
        />
        <Typography variant="body-primary-regular" style={{
          color: 'inherit',
          fontSize: 'var(--font-size-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'calc(var(--spacing-x1) / 8)'
        }}>
          {isExpanded ? `Hide ${label}` : `Show ${label}`}
        </Typography>
      </Button>
    </div>
  )
}

// Header Row - Table-like cells without card styling
function HeaderRow({
  stages
}: {
  stages: LifecycleStage[]
}) {
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
                color: 'var(--text-primary)'
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
              fontSize: 'var(--font-size-xl)'
            }}>
              {totalCount.toLocaleString()}
            </Typography>
          </div>
        )
      })}
    </div>
  )
}

// Milestones Row - Grid row with consistent alignment
function MilestonesRow({
  stages,
  globalFilters
}: {
  stages: LifecycleStage[]
  globalFilters: GlobalFilters
}) {
  return (
    <div style={{ display: 'flex', borderBottom: thinBorder, alignItems: 'stretch' }}>
      {stages.map((stage, index) => {
        const groups = groupMetrics(stage.metrics)
        const hasGroups = groups.length > 0
        const isGrouped = groups.length > 1 || (groups.length === 1 && groups[0].groupLabel !== null)

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

            {hasGroups ? (
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
                      {group.items.map((metric, itemIdx) => (
                        <ProgressItem
                          key={metric.metricId}
                          metric={metric}
                          globalFilters={globalFilters}
                          isFirst={itemIdx === 0}
                          isLast={itemIdx === group.items.length - 1}
                        />
                      ))}
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
                —
              </Typography>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Exceptions Row - Grid row with consistent alignment
function ExceptionsRow({
  stages,
  globalFilters
}: {
  stages: LifecycleStage[]
  globalFilters: GlobalFilters
}) {
  return (
    <div style={{ display: 'flex', borderBottom: thinBorder, alignItems: 'stretch' }}>
      {stages.map((stage, index) => (
        <div
          key={`exceptions-${stage.id}`}
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
            EXCEPTIONS
          </Typography>

          {stage.exceptions && stage.exceptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x3)' }}>
              {stage.exceptions.map((exception, idx) => (
                <ExceptionItem
                  key={`exception-${idx}`}
                  metric={exception}
                  globalFilters={globalFilters}
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
              No exceptions
            </Typography>
          )}
        </div>
      ))}
    </div>
  )
}

// Status Row - Grid row with consistent alignment
function StatusRow({
  stages,
  globalFilters
}: {
  stages: LifecycleStage[]
  globalFilters: GlobalFilters
}) {
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
              No status
            </Typography>
          )}
        </div>
      ))}
    </div>
  )
}

export default function NewLifecycleBoard({
  tabData,
  isLoading,
  error,
  onRetry,
  globalFilters,
}: NewLifecycleBoardProps) {
  const [sections, setSections] = useState<SectionState>(() => {
    const stored = localStorage.getItem('lifecycle-board-sections')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        // Fall back to default
      }
    }
    return { milestones: true, status: true, exceptions: true }
  })

  useEffect(() => {
    localStorage.setItem('lifecycle-board-sections', JSON.stringify(sections))
  }, [sections])

  const toggleSection = (section: keyof SectionState) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (isLoading && !tabData) {
    return <DashboardSkeleton />
  }

  if (error && !tabData) {
    return <ErrorBanner message={error} onRetry={onRetry} />
  }

  if (!tabData) {
    return (
      <div style={{ padding: 'var(--spacing-x16) var(--spacing-x6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body-primary-regular" color="tertiary" style={{ fontSize: 'var(--font-size-md)' }}>
          No data available for this tab.
        </Typography>
      </div>
    )
  }

  const lifecycleStages = tabData.lifecycleStages || []
  const stageCount = lifecycleStages.length
  const hasExceptions = lifecycleStages.some(stage => stage.exceptions && stage.exceptions.length > 0)
  const hasStatus = lifecycleStages.some(stage => stage.status && stage.status.length > 0)

  if (stageCount === 0) {
    return (
      <div style={{ padding: 'var(--spacing-x16) var(--spacing-x6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body-primary-regular" color="tertiary" style={{ fontSize: 'var(--font-size-md)' }}>
          No lifecycle stages available for this tab.
        </Typography>
      </div>
    )
  }

  return (
    <div style={{
      border: thinBorder,
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        {/* Stage Header */}
        <HeaderRow stages={lifecycleStages} />

        {/* Milestones Section */}
        {sections.milestones && (
          <MilestonesRow
            stages={lifecycleStages}
            globalFilters={globalFilters}
          />
        )}
        <SectionToggle
          isExpanded={sections.milestones}
          onToggle={() => toggleSection('milestones')}
          label="milestones"
        />

        {/* Exceptions Section */}
        {hasExceptions && (
          <>
            {sections.exceptions && (
              <ExceptionsRow
                stages={lifecycleStages}
                globalFilters={globalFilters}
              />
            )}
            <SectionToggle
              isExpanded={sections.exceptions}
              onToggle={() => toggleSection('exceptions')}
              label="exceptions"
            />
          </>
        )}

        {/* Status Section */}
        {hasStatus && (
          <>
            {sections.status && (
              <StatusRow
                stages={lifecycleStages}
                globalFilters={globalFilters}
              />
            )}
            <SectionToggle
              isExpanded={sections.status}
              onToggle={() => toggleSection('status')}
              label="status"
            />
          </>
        )}
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={onRetry}
          variant="inline"
        />
      )}
    </div>
  )
}
