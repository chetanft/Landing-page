import { SegmentedTabs as FTSegmentedTabs, SegmentedTabItem } from 'ft-design-system'
import type { TabId } from '../types/metrics'

interface SegmentedTabsProps {
  tabs: { id: TabId; label: string }[]
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

export default function SegmentedTabs({ tabs, activeTab, onTabChange }: SegmentedTabsProps) {
  const handleChange = (value: string) => {
    onTabChange(value as TabId)
  }

  return (
    <FTSegmentedTabs
      value={activeTab}
      onChange={handleChange}
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
      {tabs.map((tab) => (
        <SegmentedTabItem
          key={tab.id}
          value={tab.id}
          label={tab.label}
          style={{ width: 'fit-content', paddingLeft: '8px', paddingRight: '8px' }}
        />
      ))}
    </FTSegmentedTabs>
  )
}
