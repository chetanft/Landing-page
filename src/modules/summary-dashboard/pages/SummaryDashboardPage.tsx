import { useState, useCallback, useMemo, useEffect } from 'react'
import { Typography, Row, Col, Spacer, Card } from 'ft-design-system'
import type { TabId, GlobalFilters } from '../types/metrics'
import AppHeader from '../components/AppHeader'
import TitleBar from '../components/TitleBar'
import SegmentedTabs from '../components/SegmentedTabs'
import TabControls, { type ViewMode, type PrioritySelection } from '../components/TabControls'
import NewLifecycleBoard from '../components/NewLifecycleBoard'
import FilterPane from '../components/FilterPane'
import { FtlContainer, OrdersContainer, OrdersQuickFilters, useOrdersQuickFilters } from '../containers'
import type { JourneysViewMode } from '../containers'
import { useMetricsData } from '../hooks/useMetricsData'
import { usePermissions } from '../hooks/usePermissions'
import { useAppLoader } from '../../../AppLoaderContext'

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: 'journeys', label: 'FTL' },
  { id: 'shipments', label: 'PTL' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'orders', label: 'Orders' }
]

const getDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

export default function SummaryDashboardPage() {
  const { availableTabs, canAccessTab } = usePermissions()
  const { setAppLoading } = useAppLoader()
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false)

  const tabs = useMemo(() => {
    return ALL_TABS.filter((tab) => canAccessTab(tab.id))
  }, [canAccessTab])

  const defaultTab = tabs[0]?.id || 'journeys'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [journeysViewMode, setJourneysViewMode] = useState<JourneysViewMode>(() => {
    const stored = localStorage.getItem('ftl-journey-view-mode')
    return (stored === 'map' ? 'map' : 'column') as JourneysViewMode
  })
  const [priorityFilter, setPriorityFilter] = useState<PrioritySelection>([])
  const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(false)

  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    locationId: undefined,
    locationName: 'All Locations',
    transporterId: undefined,
    transporterName: 'All Transporters',
    consigneeId: undefined,
    consigneeName: 'All Consignees',
    dateRange: getDefaultDateRange(),
    priority: defaultTab === 'shipments' ? priorityFilter : undefined
  })

  const {
    tabData,
    countsData,
    isLoading,
    countsLoading,
    error,
    refetch
  } = useMetricsData(activeTab, globalFilters)

  // Orders quick filters (only used when orders tab is active)
  const ordersQuickFilters = useOrdersQuickFilters(globalFilters)

  const displayTabData = tabData ?? countsData
  const displayLoading = !displayTabData && (isLoading || countsLoading)

  useEffect(() => {
    if (!hasInitialLoadCompleted && displayLoading) {
      setAppLoading(true)
      return
    }

    if (!hasInitialLoadCompleted && !displayLoading) {
      setHasInitialLoadCompleted(true)
      setAppLoading(false)
    }
  }, [hasInitialLoadCompleted, displayLoading, setAppLoading])

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId)
    setGlobalFilters((prev) => ({
      ...prev,
      priority: tabId === 'shipments' && priorityFilter.length > 0 ? priorityFilter : undefined
    }))
  }, [priorityFilter])

  const handleFiltersChange = useCallback((filters: Partial<GlobalFilters>) => {
    setGlobalFilters((prev) => ({ ...prev, ...filters }))
  }, [])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  const handleJourneysViewModeChange = useCallback((mode: JourneysViewMode) => {
    setJourneysViewMode(mode)
    localStorage.setItem('ftl-journey-view-mode', mode)
  }, [])

  const handlePriorityFilterChange = useCallback((priority: PrioritySelection) => {
    setPriorityFilter(priority)

    if (activeTab === 'shipments') {
      setGlobalFilters((prev) => ({
        ...prev,
        priority: priority.length > 0 ? priority : undefined
      }))
    }
  }, [activeTab])

  const handleFilterClick = useCallback(() => {
    setIsFilterPaneOpen(true)
  }, [])

  if (!hasInitialLoadCompleted && isLoading) {
    return null
  }

  if (availableTabs.length === 0) {
    return (
      <div>
        <AppHeader />
        <TitleBar
          globalFilters={globalFilters}
          onFiltersChange={handleFiltersChange}
        />
        <div>
          <Row justify="center" align="middle" style={{ minHeight: '60vh' }}>
            <Col span={12}>
              <Card style={{ textAlign: 'center' }}>
                <Typography variant="title-secondary">Access Restricted</Typography>
                <Spacer size={"small" as any} />
                <Typography variant="body-primary-regular">You don't have permission to view the Summary Dashboard.</Typography>
                <Typography variant="body-primary-regular">Please contact your administrator for access.</Typography>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'journeys':
        return (
          <FtlContainer
            tabData={displayTabData}
            globalFilters={globalFilters}
            isLoading={displayLoading}
            error={null}
            onRetry={handleRefresh}
            journeysViewMode={journeysViewMode}
          />
        )
      case 'orders':
        return (
          <OrdersContainer
            tabData={displayTabData}
            globalFilters={globalFilters}
            isLoading={displayLoading}
            error={error}
            onRetry={handleRefresh}
            viewMode={viewMode}
            selectedFilters={ordersQuickFilters.selectedFilters}
            selectedOutboundOption={ordersQuickFilters.selectedOutboundOption}
          />
        )
      default:
        // PTL (shipments) and Invoices use the standard lifecycle board
        return (
          <NewLifecycleBoard
            tabData={displayTabData}
            globalFilters={globalFilters}
            isLoading={displayLoading}
            error={error}
            onRetry={handleRefresh}
          />
        )
    }
  }

  return (
    <div>
      <AppHeader />

      <TitleBar
        globalFilters={globalFilters}
        onFiltersChange={handleFiltersChange}
      />

      <FilterPane
        open={isFilterPaneOpen}
        onOpenChange={setIsFilterPaneOpen}
        globalFilters={globalFilters}
        onFiltersChange={handleFiltersChange}
        transporterPtlOnly={activeTab === 'shipments'}
      />

      <div style={{ padding: 'var(--spacing-x6) var(--spacing-x5)', display: 'flex', flexDirection: 'column' }}>
        <Row align="middle" justify="center" style={{ marginBottom: 'var(--spacing-x6)', flexWrap: 'nowrap', width: '100%' }}>
          <Col style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', width: 'fit-content', gap: 'var(--spacing-x4)', flexWrap: 'nowrap', maxWidth: '327px' }}>
            <SegmentedTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </Col>
          <Col style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', gap: '12px' }}>
            {activeTab === 'orders' && (
              <OrdersQuickFilters
                selectedFilters={ordersQuickFilters.selectedFilters}
                selectedOutboundOption={ordersQuickFilters.selectedOutboundOption}
                quickFilterCounts={ordersQuickFilters.quickFilterCounts}
                onFilterClick={ordersQuickFilters.handleQuickFilterClick}
              />
            )}
            <TabControls
              activeTab={activeTab}
              viewMode={viewMode}
              journeysViewMode={journeysViewMode}
              priorityFilter={priorityFilter}
              tabData={tabData}
              onViewModeChange={handleViewModeChange}
              onJourneysViewModeChange={handleJourneysViewModeChange}
              onPriorityFilterChange={handlePriorityFilterChange}
              onFilterClick={handleFilterClick}
            />
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            {renderContent()}
          </Col>
        </Row>
      </div>
    </div>
  )
}
