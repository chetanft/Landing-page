import { Button, Row, Col, Typography, Icon, Spacer } from 'ft-design-system'

export type EmptyStateVariant = 'no-data' | 'no-results' | 'api-unavailable'

interface EmptyStateProps {
  variant: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

const variantConfig: Record<EmptyStateVariant, { icon: string; defaultTitle: string; defaultDescription: string }> = {
  'no-data': {
    icon: 'inbox',
    defaultTitle: 'No orders found',
    defaultDescription: 'There are no orders available at this time.',
  },
  'no-results': {
    icon: 'search',
    defaultTitle: 'No matching orders',
    defaultDescription: 'Try adjusting your filters to see more results.',
  },
  'api-unavailable': {
    icon: 'warning',
    defaultTitle: 'Data unavailable',
    defaultDescription: 'Unable to load orders data. The API endpoint may not be available.',
  },
}

export default function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const config = variantConfig[variant]

  return (
    <div className="empty-state-wrapper">
      <Row justify="center" align="middle" style={{ minHeight: 'calc(var(--spacing-x24) * 3)' }}>
        <Col span={12} style={{ textAlign: 'center' }}>
          <Icon name={config.icon} size={48} />
          <Spacer size="medium" />
          <Typography variant="title-secondary">{title || config.defaultTitle}</Typography>
          <Spacer size="small" />
          <Typography variant="body-primary-regular" style={{ color: 'var(--text-secondary)' }}>
            {description || config.defaultDescription}
          </Typography>
          {onAction && actionLabel && (
            <>
              <Spacer size="large" />
              <Button variant="primary" size="md" onClick={onAction}>
                {actionLabel}
              </Button>
            </>
          )}
        </Col>
      </Row>
    </div>
  )
}
