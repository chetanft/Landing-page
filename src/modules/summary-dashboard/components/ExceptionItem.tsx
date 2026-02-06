import { useNavigate } from 'react-router-dom'
import { Typography } from 'ft-design-system'
import type { MetricData, GlobalFilters } from '../types/metrics'
import { buildTargetUrl } from '../data/filterMapper'
import type { AlertOptionId } from '../hooks/useDelayedJourneysAnalytics'
import { getDelayedDrawerSelection } from '../utils/delayedDrawer'

interface ExceptionItemProps {
  metric: MetricData
  globalFilters: GlobalFilters
  onOpenDelayedDrawer?: (alert: AlertOptionId, count: number) => void
}

export default function ExceptionItem({ metric, globalFilters, onOpenDelayedDrawer }: ExceptionItemProps) {
  const navigate = useNavigate()
  const displayCount = metric.isMissing ? '-' : metric.count.toLocaleString()

  const handleClick = () => {
    const delayedSelection = getDelayedDrawerSelection(metric)
    if (delayedSelection && onOpenDelayedDrawer) {
      onOpenDelayedDrawer(delayedSelection, metric.count)
      return
    }
    const url = buildTargetUrl(metric.target, globalFilters)
    navigate(url)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  const tooltipText = metric.isMissing
    ? `${metric.label}: No data available`
    : `${metric.label}: Click to view ${metric.count.toLocaleString()} items`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-x1)',
        alignItems: 'flex-start',
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)'
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={tooltipText}
      aria-label={`${metric.label}: ${metric.isMissing ? 'No data available' : metric.count}. Click to view details.`}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = ''
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = 'none'
        e.currentTarget.style.boxShadow = '0 0 0 calc(var(--spacing-x1) / 2) var(--primary)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <Typography
        variant="body-primary-semibold"
        style={{ color: 'var(--critical)', fontSize: 'var(--font-size-md)' }}
      >
        {displayCount}
      </Typography>
      <Typography variant="body-secondary-regular" color="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
        {metric.label}
      </Typography>
    </div>
  )
}
