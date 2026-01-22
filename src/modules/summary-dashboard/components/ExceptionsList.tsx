import { useNavigate } from 'react-router-dom'
import type { MetricData, GlobalFilters } from '../types/metrics'
import { buildTargetUrl } from '../data/filterMapper'

interface ExceptionsListProps {
  exceptions: MetricData[]
  globalFilters: GlobalFilters
}

export default function ExceptionsList({ exceptions, globalFilters }: ExceptionsListProps) {
  const navigate = useNavigate()

  const handleClick = (metric: MetricData) => {
    const url = buildTargetUrl(metric.target, globalFilters)
    navigate(url)
  }

  const handleKeyDown = (e: React.KeyboardEvent, metric: MetricData) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(metric)
    }
  }

  return (
    <div className="mt-x4 pt-x4 border-t border-border-secondary">
      <div className="mb-x3">
        <span className="text-xs-rem font-semibold uppercase text-tertiary">
          Exceptions
        </span>
      </div>
      <ul className="list-none p-x0 m-x0 flex flex-col gap-x4">
        {exceptions.map((exception) => (
          <li
            key={exception.metricId}
            className="flex flex-col cursor-pointer hover:opacity-80 focus:outline-none"
            onClick={() => handleClick(exception)}
            onKeyDown={(e) => handleKeyDown(e, exception)}
            role="button"
            tabIndex={0}
            aria-label={`${exception.label}: ${exception.count} exceptions. Click to view details.`}
          >
            <span 
              className="text-lg-rem font-bold leading-tight"
              style={{ color: 'var(--color-critical)' }}
            >
              {exception.count.toLocaleString()}
            </span>
            <span className="text-sm-rem text-secondary leading-tight">
              {exception.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
