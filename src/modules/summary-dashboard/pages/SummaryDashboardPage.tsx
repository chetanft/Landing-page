import { useState, useCallback, useMemo, useEffect } from 'react'
import { Typography, Row, Col, Spacer, Card, QuickFilters, QuickFilter, FilterOption } from 'ft-design-system'
import type { TabId, GlobalFilters } from '../types/metrics'
import AppHeader from '../components/AppHeader'
import TitleBar from '../components/TitleBar'
import SegmentedTabs from '../components/SegmentedTabs'
import TabControls, { type ViewMode, type JourneysViewMode, type PrioritySelection } from '../components/TabControls'
import NewLifecycleBoard from '../components/NewLifecycleBoard'
import DelayedInsightsDrawer from '../components/DelayedInsightsDrawer'
import OrdersTableView from '../components/OrdersTableView'
import FilterPane from '../components/FilterPane'
import OrderDetailsDrawer from '../components/OrderDetailsDrawer'
import { useMetricsData } from '../data/useMetricsData'
import { useDelayedJourneysAnalytics, type AlertOptionId } from '../data/useDelayedJourneysAnalytics'
import { usePermissions } from '../hooks/usePermissions'
import { useOrdersTableData } from '../hooks/useOrdersTableData'
import { useAppLoader } from '../../../AppLoaderContext'

const ALL_TABS: { id: TabId; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'journeys', label: 'FTL' },
  { id: 'shipments', label: 'PTL' },
  { id: 'invoices', label: 'Invoices' },
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
  const [selectedFilters, setSelectedFilters] = useState<Set<'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'>>(new Set())
  const [selectedOutboundOption, setSelectedOutboundOption] = useState<string | null>(null)
  const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDelayedDrawerOpen, setIsDelayedDrawerOpen] = useState(false)
  const [delayedAlertSelection, setDelayedAlertSelection] = useState<AlertOptionId>('all')
  const [delayedSelectedCount, setDelayedSelectedCount] = useState<number | null>(null)

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

  const { analytics: delayedAnalytics } = useDelayedJourneysAnalytics(globalFilters)

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

  // Fetch orders data for quick filter counts (only when orders tab is active)
  const { summary: ordersSummary } = useOrdersTableData({
    selectedFilters: new Set(),
    selectedOutboundOption: null,
    globalFilters,
    page: 1,
    pageSize: 1, // We only need the summary, not the actual orders
  })

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
    if (mode === 'table') {
      console.log('Table view selected - implementation pending design')
    }
  }, [])

  const handleOpenDelayedDrawer = useCallback((alert: AlertOptionId, count: number) => {
    setDelayedAlertSelection(alert)
    setDelayedSelectedCount(count)
    setIsDelayedDrawerOpen(true)
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

  const handleQuickFilterClick = useCallback((filterId: string, optionId?: string) => {
    if (filterId === 'outbound' && optionId) {
      // Handle outbound sub-options (FTL/PTL)
      const newOption = selectedOutboundOption === optionId ? null : optionId
      setSelectedOutboundOption(newOption)
      
      // Update parent outbound filter state
      setSelectedFilters(prev => {
        const newSet = new Set(prev)
        if (newOption) {
          // Selecting an option - ensure outbound is selected and inbound is deselected
          newSet.delete('inbound')
          newSet.add('outbound')
        } else {
          // Deselecting option - deselect outbound parent too
          newSet.delete('outbound')
        }
        return newSet
      })
    } else {
      // Handle main filters
      const typedFilterId = filterId as 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'
      setSelectedFilters(prev => {
        const newSet = new Set(prev)
        const isCurrentlySelected = newSet.has(typedFilterId)
        
        if (isCurrentlySelected) {
          // Deselecting
          newSet.delete(typedFilterId)
          // If deselecting outbound, also clear the selected option
          if (typedFilterId === 'outbound') {
            setSelectedOutboundOption(null)
          }
        } else {
          // Selecting
          if (typedFilterId === 'inbound') {
            // Deselect outbound when selecting inbound (mutually exclusive)
            newSet.delete('outbound')
            setSelectedOutboundOption(null)
          } else if (typedFilterId === 'outbound') {
            // Deselect inbound when selecting outbound (mutually exclusive)
            newSet.delete('inbound')
          }
          newSet.add(typedFilterId)
        }
        return newSet
      })
    }
  }, [selectedOutboundOption])

  // Calculate filtered counts for QuickFilters from API summary
  const quickFilterCounts = useMemo(() => {
    if (activeTab !== 'orders' || !ordersSummary) {
      return {
        inbound: 0,
        outbound: 0,
        ftl: 0,
        ptl: 0,
        deliveryDelayed: 0,
      }
    }

    return {
      inbound: ordersSummary.inbound || 0,
      outbound: ordersSummary.outbound || 0,
      ftl: ordersSummary.ftl || 0,
      ptl: ordersSummary.ptl || 0,
      deliveryDelayed: ordersSummary.deliveryDelayed || 0,
    }
  }, [activeTab, ordersSummary])

  const handleOpenOrderDetails = useCallback((orderId: string) => {
    setSelectedOrderId(orderId)
    setIsDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setSelectedOrderId(null)
  }, [])

  const handleCloseDelayedDrawer = useCallback(() => {
    setIsDelayedDrawerOpen(false)
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

      <OrderDetailsDrawer
        open={isDrawerOpen}
        orderId={selectedOrderId}
        onClose={handleCloseDrawer}
      />

      <DelayedInsightsDrawer
        open={isDelayedDrawerOpen}
        onClose={handleCloseDelayedDrawer}
        selectedAlert={delayedAlertSelection}
        onAlertChange={(alert) => {
          if (alert === delayedAlertSelection) return
          setDelayedAlertSelection(alert)
          setDelayedSelectedCount(null)
        }}
        transporters={delayedAnalytics.transporters}
        criticalJourneys={delayedAnalytics.criticalJourneys}
        availableAlerts={delayedAnalytics.availableAlerts}
        delayedCount={delayedAnalytics.delayedCount}
        activeCount={delayedAnalytics.activeCount}
        selectedCount={delayedSelectedCount}
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
              <QuickFilters onFilterClick={handleQuickFilterClick}>
                <QuickFilter 
                  id="inbound" 
                  label="Inbound" 
                  count={quickFilterCounts.inbound}
                  selected={selectedFilters.has('inbound')}
                />
                <QuickFilter 
                  id="outbound" 
                  label="Outbound" 
                  count={quickFilterCounts.outbound}
                  selected={selectedFilters.has('outbound')}
                  selectedOption={selectedOutboundOption || undefined}
                >
                  <FilterOption 
                    id="ftl" 
                    label="FTL" 
                    count={quickFilterCounts.ftl}
                  />
                  <FilterOption 
                    id="ptl" 
                    label="PTL" 
                    count={quickFilterCounts.ptl}
                  />
                </QuickFilter>
                <QuickFilter 
                  id="delivery-delayed" 
                  label="Delivery delayed" 
                  count={quickFilterCounts.deliveryDelayed}
                  type="warning"
                  selected={selectedFilters.has('delivery-delayed')}
                />
              </QuickFilters>
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
            {activeTab === 'orders' && viewMode === 'table' ? (
              <OrdersTableView
                selectedFilters={selectedFilters}
                selectedOutboundOption={selectedOutboundOption}
                globalFilters={globalFilters}
                onOpenDetails={handleOpenOrderDetails}
              />
            ) : (
              <>
                <NewLifecycleBoard
                  tabData={displayTabData}
                  globalFilters={globalFilters}
                  isLoading={displayLoading}
                  error={activeTab === 'journeys' ? null : error}
                  onRetry={handleRefresh}
                  journeysViewMode={journeysViewMode}
                  onOpenDelayedDrawer={activeTab === 'journeys' ? handleOpenDelayedDrawer : undefined}
                />
              </>
            )}
          </Col>
        </Row>


      </div>
    </div>
  )
}
