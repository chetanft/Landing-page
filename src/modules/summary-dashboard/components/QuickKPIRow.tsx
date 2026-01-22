import type { MetricData, GlobalFilters } from '../types/metrics'
import MetricCard from './MetricCard'

interface QuickKPIRowProps {
  metrics: MetricData[]
  globalFilters: GlobalFilters
}

export default function QuickKPIRow({ metrics, globalFilters }: QuickKPIRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.metricId}
          metric={metric}
          globalFilters={globalFilters}
          variant="kpi"
        />
      ))}
    </div>
  )
}
