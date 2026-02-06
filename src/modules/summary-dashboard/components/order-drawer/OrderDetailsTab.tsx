import {
  Badge,
  Typography,
  Card,
  Icon,
} from 'ft-design-system'
import type { useOrderDrawerData } from '../../hooks/useOrderDrawerData'
import {
  formatCurrency,
  formatDateTime,
  formatDelay,
  formatWeight,
} from '../../utils/ordersFormat'
import ErrorBanner from '../ErrorBanner'
import DrawerSkeleton from '../DrawerSkeleton'

interface OrderDetailsTabProps {
  details: ReturnType<typeof useOrderDrawerData>['details']
  loading: boolean
  error: Error | null
  onRetry: () => void
}

export default function OrderDetailsTab({ details, loading, error, onRetry }: OrderDetailsTabProps) {
  if (loading) {
    return <DrawerSkeleton variant="details" />
  }

  if (error) {
    return <ErrorBanner message={error.message} onRetry={onRetry} />
  }

  if (!details) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-x6)' }}>
        <Typography variant="body-primary-regular">No details available</Typography>
      </div>
    )
  }

  const { summary, parties, identifiers } = details
  const delayMessage = summary.delayMinutes ? formatDelay(summary.delayMinutes) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x5)' }}>
      {/* Order Summary */}
      <Card style={{ padding: 'var(--spacing-x5)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-x4)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)' }}>
            <Typography
              variant="body-secondary-medium"
              style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
            >
              SO Number
            </Typography>
            <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
              {summary.soNumber}
            </Typography>
            <div style={{ marginTop: 'var(--spacing-x3)' }}>
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                Total Cost
              </Typography>
              <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
                {formatCurrency(summary.totalCost, summary.currency)}
              </Typography>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)' }}>
            <Typography
              variant="body-secondary-medium"
              style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
            >
              Total weight
            </Typography>
            <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
              {formatWeight(summary.totalWeight, summary.totalWeightUom)}
            </Typography>
            <div style={{ marginTop: 'var(--spacing-x3)' }}>
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                No. of DOs
              </Typography>
              <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
                {summary.doCount}
              </Typography>
            </div>
            <div style={{ marginTop: 'var(--spacing-x2)' }}>
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                No. of SKUs
              </Typography>
              <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
                {summary.skuCount}
              </Typography>
            </div>
            <div style={{ marginTop: 'var(--spacing-x2)' }}>
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                Created at
              </Typography>
              <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
                {formatDateTime(summary.createdAt)}
              </Typography>
            </div>
          </div>
        </div>
      </Card>

      {/* Status and Milestones */}
      <Card style={{ padding: 'var(--spacing-x5)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x2)' }}>
            <Badge variant="neutral" size="sm">
              {summary.status}
            </Badge>
            {delayMessage && (
              <Badge variant="danger" size="sm">
                {delayMessage}
              </Badge>
            )}
            {!delayMessage && summary.deliveryStatus === 'on_time' && (
              <Badge variant="success" size="sm">
                On time
              </Badge>
            )}
          </div>
          {summary.eta && (
            <div>
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                ETA
              </Typography>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                {formatDateTime(summary.eta)}
              </Typography>
            </div>
          )}
          {summary.sta && (
            <div>
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                STA
              </Typography>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                {formatDateTime(summary.sta)}
              </Typography>
            </div>
          )}
          {summary.nextMilestoneLabel && (
            <Card
              style={{
                padding: 'var(--spacing-x4)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <Typography
                variant="body-secondary-medium"
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}
              >
                Next Milestone
              </Typography>
              <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>
                {summary.nextMilestoneLabel}
              </Typography>
              {summary.nextMilestoneEta && (
                <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                  ETA: {formatDateTime(summary.nextMilestoneEta)}
                </Typography>
              )}
            </Card>
          )}
        </div>
      </Card>

      {/* Party Details */}
      {(['sender', 'shipTo', 'billTo'] as const).map((partyKey) => {
        const party = parties[partyKey]
        const label =
          partyKey === 'sender' ? 'Sender' : partyKey === 'shipTo' ? 'Ship To' : 'Bill To'
        return (
          <Card key={partyKey} style={{ padding: 'var(--spacing-x5)' }}>
            <Typography
              variant="body-primary-semibold"
              style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-x4)' }}
            >
              {label}
            </Typography>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x2)' }}>
              <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>
                {party.name}
              </Typography>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                {party.address}
              </Typography>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                GSTIN: {party.gstin}
              </Typography>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
                <Icon name="mail" size="sm" />
                <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {party.email}
                </Typography>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
                <Icon name="phone" size="sm" />
                <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {party.phone}
                </Typography>
              </div>
            </div>
          </Card>
        )
      })}

      {/* Identifiers */}
      <Card style={{ padding: 'var(--spacing-x5)' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-x4)',
          }}
        >
          {identifiers.planningId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Planning ID: {identifiers.planningId}
              </Typography>
              <Icon name="arrow-top-right" size="xs" />
            </div>
          )}
          {identifiers.indentId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Indent ID: {identifiers.indentId}
              </Typography>
              <Icon name="arrow-top-right" size="xs" />
            </div>
          )}
          {identifiers.journeyId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Journey ID: {identifiers.journeyId}
              </Typography>
              <Icon name="arrow-top-right" size="xs" />
            </div>
          )}
          {identifiers.epodId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                ePOD ID: {identifiers.epodId}
              </Typography>
              <Icon name="arrow-top-right" size="xs" />
            </div>
          )}
          {identifiers.invoiceNumber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)' }}>
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Invoice Number: {identifiers.invoiceNumber}
              </Typography>
              <Icon name="arrow-top-right" size="xs" />
            </div>
          )}
          {!identifiers.planningId &&
            !identifiers.indentId &&
            !identifiers.journeyId &&
            !identifiers.epodId &&
            !identifiers.invoiceNumber && (
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                No identifiers available
              </Typography>
            )}
        </div>
      </Card>
    </div>
  )
}
