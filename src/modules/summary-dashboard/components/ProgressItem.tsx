import { useNavigate } from 'react-router-dom'
import { Typography } from 'ft-design-system'
import type { MetricData, GlobalFilters } from '../types/metrics'
import { buildTargetUrl } from '../data/filterMapper'

interface ProgressItemProps {
  metric: MetricData
  globalFilters: GlobalFilters
  isFirst?: boolean
  isLast?: boolean
}

export default function ProgressItem({ metric, globalFilters, isFirst = false, isLast = false }: ProgressItemProps) {
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

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-x2)', alignItems: 'stretch', borderRadius: 'var(--radius-md)' }}>
      {/* Timeline Path */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', height: '100%', alignSelf: 'stretch', width: 'var(--spacing-x2)' }}>
        {/* Top Line or Spacer */}
        <div style={{ 
          width: '0.5px', 
          height: 'var(--spacing-x1)', 
          backgroundColor: isFirst ? 'transparent' : 'var(--border-primary)',
          flexShrink: 0
        }} />

        {/* Circle */}
        <div style={{ 
          width: 'var(--spacing-x2)', 
          height: 'var(--spacing-x2)', 
          borderRadius: '50%', 
          border: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)', 
          backgroundColor: 'var(--bg-primary)', 
          flexShrink: 0 
        }} />

        {/* Bottom Line (always render, but transparent if last) */}
        <div style={{ 
          width: '0.5px', 
          display: 'flex', 
          flexDirection: 'column', 
          flex: '1', 
          backgroundColor: isLast ? 'transparent' : 'var(--border-primary)', 
          minHeight: 'var(--spacing-x4)' 
        }} />
      </div>

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-x1)',
          alignItems: 'flex-start',
          flex: '1',
          minWidth: '0',
          cursor: 'pointer',
          paddingBottom: 'var(--spacing-x4)',
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
        <Typography variant="body-secondary-medium" color="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
          {metric.label}
        </Typography>
        <Typography variant="body-primary-semibold" color="primary" style={{ fontSize: 'var(--font-size-md)' }}>
          {metric.count.toLocaleString()}
        </Typography>
      </div>
    </div>
  )
}
