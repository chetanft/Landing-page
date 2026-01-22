import { Button, Icon, SegmentedTabs as FTSegmentedTabs, SegmentedTabItem, QuickFilters, QuickFilter, FilterOption } from 'ft-design-system'
import type { TabId, TabData } from '../types/metrics'

export type ViewMode = 'grid' | 'table'
export type PriorityFilter = 'high' | 'standard' | 'low'
export type PrioritySelection = PriorityFilter[]

interface TabControlsProps {
  activeTab: TabId
  viewMode?: ViewMode
  priorityFilter?: PrioritySelection
  tabData?: TabData | null
  onViewModeChange?: (mode: ViewMode) => void
  onPriorityFilterChange?: (priority: PrioritySelection) => void
  onFilterClick?: () => void
}

export default function TabControls({
  activeTab,
  viewMode = 'grid',
  priorityFilter = [],
  tabData,
  onViewModeChange,
  onPriorityFilterChange,
  onFilterClick,
}: TabControlsProps) {
  const handleFilterClick = () => {
    if (onFilterClick) {
      onFilterClick()
    } else {
      console.log('Filter button clicked')
    }
  }

  const handleViewModeChange = (value: string) => {
    if (onViewModeChange) {
      onViewModeChange(value as ViewMode)
    }
  }

  const handlePriorityFilterClick = (filterId: string, optionId?: string) => {
    if (!onPriorityFilterChange || filterId !== 'priority') return
    
    if (optionId) {
      const priority = optionId as PriorityFilter
      const isSelected = priorityFilter.includes(priority)
      const nextSelection = isSelected ? [] : [priority]
      onPriorityFilterChange(nextSelection)
    }
  }

  const handlePriorityFilterRemove = (filterId: string, optionId?: string) => {
    if (!onPriorityFilterChange || filterId !== 'priority' || !optionId) return
    const priority = optionId as PriorityFilter
    if (priorityFilter.includes(priority)) {
      onPriorityFilterChange([])
    }
  }

  // Orders tab: Filter button + Grid/Table view toggle
  if (activeTab === 'orders') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
        <Button
          variant="text"
          icon="filter"
          iconPosition="only"
          onClick={handleFilterClick}
          style={{
            height: 'var(--component-height-lg)',
            width: 'var(--component-height-lg)',
          }}
        />
        <FTSegmentedTabs
          value={viewMode}
          onChange={handleViewModeChange}
          variant="icon-only"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: 'var(--spacing-x1) var(--spacing-x2)',
            borderRadius: 'var(--radius-lg)',
            gap: 'var(--spacing-x1)',
            height: 'var(--component-height-lg)',
            width: 'fit-content',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex'
          }}
        >
          <SegmentedTabItem
            value="grid"
            icon={<Icon name="data-stack" size={16} />}
            variant="icon-only"
            style={{ width: 'fit-content', paddingLeft: '8px', paddingRight: '8px' }}
          />
          <SegmentedTabItem
            value="table"
            icon={<Icon name="menu" size={16} />}
            variant="icon-only"
            style={{ width: 'fit-content', paddingLeft: '8px', paddingRight: '8px' }}
          />
        </FTSegmentedTabs>
      </div>
    )
  }

  // Shipments tab: QuickFilter for priority + Filter button
  if (activeTab === 'shipments') {
    // Calculate real priority counts from tabData
    let highCount = 0
    let standardCount = 0
    let lowCount = 0

    if (tabData?.lifecycleStages) {
      tabData.lifecycleStages.forEach(stage => {
        stage.metrics.forEach(metric => {
          if (metric.label === 'High Priority') {
            highCount += metric.count
          } else if (metric.label === 'Standard Priority') {
            standardCount += metric.count
          } else if (metric.label === 'Low Priority') {
            lowCount += metric.count
          }
        })
      })
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
        <QuickFilters onFilterClick={handlePriorityFilterClick} onFilterRemove={handlePriorityFilterRemove}>
          <QuickFilter
            id="priority"
            label="Priority"
            selectedOption={priorityFilter[0]}
          >
            <FilterOption id="high" label="High" count={highCount} />
            <FilterOption id="standard" label="Standard" count={standardCount} />
            <FilterOption id="low" label="Low" count={lowCount} />
          </QuickFilter>
        </QuickFilters>
        <Button
          variant="text"
          icon="filter"
          iconPosition="only"
          onClick={handleFilterClick}
          style={{
            height: 'var(--component-height-lg)',
            width: 'var(--component-height-lg)',
          }}
        />
      </div>
    )
  }

  // Journeys and Invoices tabs: Filter button only
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Button
        variant="text"
        icon="filter"
        iconPosition="only"
        onClick={handleFilterClick}
        style={{
          height: 'var(--component-height-lg)',
          width: 'var(--component-height-lg)',
        }}
      />
    </div>
  )
}
