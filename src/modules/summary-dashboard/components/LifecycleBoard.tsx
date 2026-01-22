import type { TabData, GlobalFilters } from '../types/metrics'
import QuickKPIRow from './QuickKPIRow'
import LifecycleColumn from './LifecycleColumn'
import DashboardSkeleton from './DashboardSkeleton'
import ErrorBanner from './ErrorBanner'

interface LifecycleBoardProps {
  tabData: TabData | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  globalFilters: GlobalFilters
}

export default function LifecycleBoard({
  tabData,
  isLoading,
  error,
  onRetry,
  globalFilters,
}: LifecycleBoardProps) {
  if (isLoading && !tabData) {
    return <DashboardSkeleton />
  }

  if (error && !tabData) {
    return <ErrorBanner message={error} onRetry={onRetry} />
  }

  if (!tabData) {
    return (
      <div className="flex items-center justify-center py-x16 px-x6 text-secondary text-md-rem">
        <p>No data available for this tab.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-x6 p-x6">
      {tabData.quickKPIs.length > 0 && (
        <QuickKPIRow metrics={tabData.quickKPIs} globalFilters={globalFilters} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x5">
        {tabData.lifecycleStages.map((stage) => (
          <LifecycleColumn
            key={stage.id}
            stage={stage}
            globalFilters={globalFilters}
          />
        ))}
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
