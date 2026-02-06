import { useState, useCallback } from 'react'
import type { TabData, GlobalFilters } from '../types/metrics'
import type { AlertOptionId } from '../hooks/useDelayedJourneysAnalytics'
import { useDelayedJourneysAnalytics } from '../hooks/useDelayedJourneysAnalytics'
import NewLifecycleBoard from '../components/NewLifecycleBoard'
import DelayedInsightsDrawer from '../components/DelayedInsightsDrawer'

export type JourneysViewMode = 'column' | 'map'

interface FtlContainerProps {
  tabData: TabData | null
  globalFilters: GlobalFilters
  isLoading: boolean
  error: string | null
  onRetry: () => void
  journeysViewMode: JourneysViewMode
}

export default function FtlContainer({
  tabData,
  globalFilters,
  isLoading,
  error,
  onRetry,
  journeysViewMode
}: FtlContainerProps) {
  const [isDelayedDrawerOpen, setIsDelayedDrawerOpen] = useState(false)
  const [delayedAlertSelection, setDelayedAlertSelection] = useState<AlertOptionId>('all')
  const [delayedSelectedCount, setDelayedSelectedCount] = useState<number | null>(null)

  const { analytics: delayedAnalytics } = useDelayedJourneysAnalytics(globalFilters)

  const handleOpenDelayedDrawer = useCallback((alert: AlertOptionId, count: number) => {
    setDelayedAlertSelection(alert)
    setDelayedSelectedCount(count)
    setIsDelayedDrawerOpen(true)
  }, [])

  const handleCloseDelayedDrawer = useCallback(() => {
    setIsDelayedDrawerOpen(false)
  }, [])

  const handleAlertChange = useCallback((alert: AlertOptionId) => {
    if (alert === delayedAlertSelection) return
    setDelayedAlertSelection(alert)
    setDelayedSelectedCount(null)
  }, [delayedAlertSelection])

  return (
    <>
      <DelayedInsightsDrawer
        open={isDelayedDrawerOpen}
        onClose={handleCloseDelayedDrawer}
        selectedAlert={delayedAlertSelection}
        onAlertChange={handleAlertChange}
        transporters={delayedAnalytics.transporters}
        criticalJourneys={delayedAnalytics.criticalJourneys}
        availableAlerts={delayedAnalytics.availableAlerts}
        activeCount={delayedAnalytics.activeCount}
        selectedCount={delayedSelectedCount}
      />

      <NewLifecycleBoard
        tabData={tabData}
        globalFilters={globalFilters}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        journeysViewMode={journeysViewMode}
        onOpenDelayedDrawer={handleOpenDelayedDrawer}
      />
    </>
  )
}
