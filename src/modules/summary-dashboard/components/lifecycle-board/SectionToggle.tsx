import { Button, Icon, Typography } from 'ft-design-system'
import { thinBorder } from './lifecycleBoardUtils'

interface SectionToggleProps {
  isExpanded: boolean
  onToggle: () => void
  label: string
}

export default function SectionToggle({
  isExpanded,
  onToggle,
  label
}: SectionToggleProps) {
  return (
    <div style={{
      padding: 'var(--spacing-x2) var(--spacing-x3)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: thinBorder
    }}>
      <Button
        variant="text"
        size="sm"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-x1)',
          color: 'var(--text-secondary)'
        }}
      >
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          style={{ color: 'var(--color-primary)' }}
        />
        <Typography variant="body-primary-regular" style={{
          color: 'var(--color-primary)',
          fontSize: 'var(--font-size-xs)',
          textTransform: 'uppercase',
          letterSpacing: 'calc(var(--spacing-x1) / 8)'
        }}>
          {isExpanded ? `Hide ${label}` : `Show ${label}`}
        </Typography>
      </Button>
    </div>
  )
}
