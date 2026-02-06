import { useEffect, useState } from 'react'
import { Typography } from 'ft-design-system'
import type { TabData, GlobalFilters } from '../types/metrics'
import type { AlertOptionId } from '../hooks/useDelayedJourneysAnalytics'
import DashboardSkeleton from './DashboardSkeleton'
import JourneyMapView from './JourneyMapView'
import {
  SectionToggle,
  HeaderRow,
  MilestonesRow,
  ExceptionsRow,
  StatusRow,
  thinBorder
} from './lifecycle-board'

interface NewLifecycleBoardProps {
  tabData: TabData | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  globalFilters: GlobalFilters
  journeysViewMode?: 'column' | 'map'
  onOpenDelayedDrawer?: (alert: AlertOptionId, count: number) => void
}

interface SectionState {
  milestones: boolean
  status: boolean
  exceptions: boolean
}

export default function NewLifecycleBoard({
  tabData,
  isLoading,
  error: _error,
  onRetry,
  globalFilters,
  journeysViewMode = 'column',
  onOpenDelayedDrawer
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

  const isJourneysTab = tabData?.id === 'journeys'

  const toggleSection = (section: keyof SectionState) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  if (isLoading && !tabData) {
    return <DashboardSkeleton />
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

  // Show map view for journeys tab
  if (isJourneysTab && journeysViewMode === 'map') {
    return (
      <div>
        <JourneyMapView tabData={tabData} globalFilters={globalFilters} />
      </div>
    )
  }

  return (
    <div>
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
            onRetry={onRetry}
            suppressErrors={isJourneysTab}
            onOpenDelayedDrawer={onOpenDelayedDrawer}
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
                onOpenDelayedDrawer={onOpenDelayedDrawer}
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
                onOpenDelayedDrawer={onOpenDelayedDrawer}
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
      </div>

    </div>
  )
}
