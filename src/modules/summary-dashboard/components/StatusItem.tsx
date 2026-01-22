import { useNavigate } from 'react-router-dom'
import { Typography } from 'ft-design-system'
import type { MetricData, GlobalFilters } from '../types/metrics'
import { buildTargetUrl } from '../data/filterMapper'

interface StatusItemProps {
  metric: MetricData
  globalFilters: GlobalFilters
}

export default function StatusItem({ metric, globalFilters }: StatusItemProps) {
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

  const tooltipText = `${metric.label}: Click to view ${metric.count.toLocaleString()} items`

  // Determine color based on status type
  const getStatusColor = (statusType: string, label: string) => {
    const lowerLabel = label.toLowerCase()
    if (lowerLabel.includes('on time') || lowerLabel.includes('ontime') || lowerLabel.includes('clean')) {
      return 'var(--color-positive)'
    }
    if (lowerLabel.includes('delay') || lowerLabel.includes('delayed') || lowerLabel.includes('unclean') || lowerLabel.includes('pending')) {
      return 'var(--warning)'
    }
    // Fallback to statusType mapping
    switch (statusType) {
      case 'positive': return 'var(--color-positive)'
      case 'warning': return 'var(--warning)'
      case 'critical': return 'var(--critical)'
      default: return 'var(--text-primary)'
    }
  }

  const textColor = getStatusColor(metric.statusType, metric.label)

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
      aria-label={`${metric.label}: ${metric.count}. Click to view details.`}
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
      <Typography variant="body-primary-semibold" style={{ color: textColor, fontSize: 'var(--font-size-md)' }}>
        {metric.count.toLocaleString()}
      </Typography>
      <Typography variant="body-secondary-regular" color="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
        {metric.label}
      </Typography>
    </div>
  )
}
