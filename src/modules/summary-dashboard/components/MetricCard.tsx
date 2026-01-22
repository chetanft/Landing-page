import { useNavigate } from 'react-router-dom'
import { Badge } from 'ft-design-system'
import type { MetricData, GlobalFilters } from '../types/metrics'
import { buildTargetUrl } from '../data/filterMapper'

interface MetricCardProps {
  metric: MetricData
  globalFilters: GlobalFilters
  variant?: 'kpi' | 'list' | 'timeline'
}

const STATUS_BADGE_VARIANT: Record<string, 'danger' | 'success' | 'warning' | 'neutral'> = {
  neutral: 'neutral',
  warning: 'warning',
  critical: 'danger',
  positive: 'success',
}

const STATUS_TEXT_COLOR: Record<string, string> = {
  neutral: 'text-primary',
  warning: 'text-warning',
  critical: 'text-critical',
  positive: 'text-positive',
}

export default function MetricCard({
  metric,
  globalFilters,
  variant = 'list',
}: MetricCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    const url = buildTargetUrl(metric.target, globalFilters)
    navigate(url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const badgeVariant = STATUS_BADGE_VARIANT[metric.statusType] || 'neutral'
  const textColorClass = STATUS_TEXT_COLOR[metric.statusType] || 'text-primary'
  const tooltipText = `${metric.label}: Click to view ${metric.count.toLocaleString()} items`

  if (variant === 'kpi') {
    return (
      <div
        className="flex flex-col gap-x2 p-x4 bg-bg-primary border border-border-primary rounded-lg cursor-pointer transition-all hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring focus:ring-focus-ring"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        title={tooltipText}
        aria-label={`${metric.label}: ${metric.count}. Click to view details.`}
      >
        <span className="text-sm-rem text-secondary font-medium">{metric.label}</span>
        <span className={`text-xxl-rem font-bold ${textColorClass}`}>
          {metric.count.toLocaleString()}
        </span>
      </div>
    )
  }

  if (variant === 'timeline') {
    return (
      <div 
        className="relative pl-x6 pb-x6 last:pb-0 group cursor-pointer"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        {/* Vertical Line */}
        <div className="absolute left-x1 w-x1 bg-border-secondary top-x0 bottom-x0 first:top-x3 last:h-x3 last:bottom-auto" />
        
        {/* Dot */}
        <div className="absolute left-x0 top-x2 w-x3 h-x3 rounded-full border border-border-primary bg-bg-primary z-10" />

        <div className="flex flex-col gap-x1">
          <span className="text-sm-rem text-secondary leading-tight">{metric.label}</span>
          <span className="text-lg-rem font-medium text-primary leading-none">
            {metric.count.toLocaleString()}
          </span>
        </div>
      </div>
    )
  }

  // Fallback 'list' or others
  return (
    <div
      className="flex justify-between items-center p-x3 rounded-md cursor-pointer transition-colors hover:bg-bg-secondary focus:outline-none focus:ring focus:ring-focus-ring"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={tooltipText}
      aria-label={`${metric.label}: ${metric.count}. Click to view details.`}
    >
      <span className="text-sm-rem text-primary">{metric.label}</span>
      <Badge variant={badgeVariant} className="min-w-x8 text-center">
        {metric.count.toLocaleString()}
      </Badge>
    </div>
  )
}
