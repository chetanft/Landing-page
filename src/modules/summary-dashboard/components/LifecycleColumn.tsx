import { Icon } from 'ft-design-system'
import type { LifecycleStage, GlobalFilters } from '../types/metrics'
import MetricCard from './MetricCard'
import ExceptionsList from './ExceptionsList'

interface LifecycleColumnProps {
  stage: LifecycleStage
  globalFilters: GlobalFilters
}

export default function LifecycleColumn({ stage, globalFilters }: LifecycleColumnProps) {
  const totalCount = stage.metrics.reduce((sum, m) => sum + m.count, 0)
  
  return (
    <div className="bg-bg-primary border border-border-primary rounded-lg p-x5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col mb-x6">
        <div className="flex items-center gap-x2 mb-x1">
          <h3 className="text-sm-rem font-medium text-secondary m-0">{stage.title}</h3>
          <Icon name="info" size={14} className="text-tertiary cursor-help" />
        </div>
        <span className="text-xxl-rem font-bold text-primary">
          {totalCount}
        </span>
      </div>

      <div className="flex flex-col flex-1">
        <div className="mb-x4">
          <span className="text-xs-rem font-semibold uppercase text-tertiary block mb-x3">
            Milestone
          </span>
          <div className="flex flex-col">
            {stage.metrics.map((metric) => (
              <MetricCard
                key={metric.metricId}
                metric={metric}
                globalFilters={globalFilters}
                variant="timeline"
              />
            ))}
          </div>
        </div>

        {stage.exceptions && stage.exceptions.length > 0 && (
          <ExceptionsList
            exceptions={stage.exceptions}
            globalFilters={globalFilters}
          />
        )}
      </div>
    </div>
  )
}
