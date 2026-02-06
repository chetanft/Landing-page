import {
  Badge,
  Typography,
  Icon,
} from 'ft-design-system'
import type { useOrderDrawerData } from '../../hooks/useOrderDrawerData'
import {
  formatDateTime,
  formatDate,
  formatDuration,
  formatDelay,
} from '../../utils/ordersFormat'
import ErrorBanner from '../ErrorBanner'
import DrawerSkeleton from '../DrawerSkeleton'

interface OrderTimelineTabProps {
  timeline: ReturnType<typeof useOrderDrawerData>['timeline']
  loading: boolean
  error: Error | null
  onRetry: () => void
}

export default function OrderTimelineTab({ timeline, loading, error, onRetry }: OrderTimelineTabProps) {
  if (loading) {
    return <DrawerSkeleton variant="timeline" />
  }

  if (error) {
    return <ErrorBanner message={error.message} onRetry={onRetry} />
  }

  if (!timeline || timeline.events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-x6)' }}>
        <Typography variant="body-primary-regular">No timeline events available</Typography>
      </div>
    )
  }

  // Flatten events including children and group by date
  const flattenEvents = (events: typeof timeline.events): typeof timeline.events => {
    const flattened: typeof timeline.events = []
    events.forEach((event) => {
      flattened.push(event)
      if (event.children && event.children.length > 0) {
        flattened.push(...flattenEvents(event.children))
      }
    })
    return flattened
  }

  const allEvents = flattenEvents(timeline.events)
  const eventsByDate = new Map<string, typeof timeline.events>()
  allEvents.forEach((event) => {
    const dateKey = formatDate(event.timestamp)
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, [])
    }
    eventsByDate.get(dateKey)!.push(event)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
      {Array.from(eventsByDate.entries()).map(([dateKey, events]) => (
        <div key={dateKey}>
          {/* Date Separator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-x3)',
              marginBottom: 'var(--spacing-x4)',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-primary)' }} />
            <div
              style={{
                padding: '2px 8px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '100px',
              }}
            >
              <Typography variant="body-primary-medium" style={{ fontSize: '14px' }}>
                {dateKey}
              </Typography>
            </div>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-primary)' }} />
          </div>

          {/* Events */}
          <div style={{ display: 'flex', gap: 'var(--spacing-x3)' }}>
            {/* Timeline Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {events.map((event, idx) => (
                <div key={event.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '33px',
                      height: '33px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--dark-100, #434f64)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Icon name="chevron-up" size="sm" style={{ color: 'var(--bg-primary)' }} />
                  </div>
                  {idx < events.length - 1 && (
                    <div
                      style={{
                        width: '2px',
                        height: '60px',
                        backgroundColor: 'var(--dark-100, #434f64)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Event Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
              {events.map((event) => (
                <div key={event.id}>
                  <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {event.label}
                  </Typography>
                  {event.subLabel && (
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                      {event.subLabel}
                    </Typography>
                  )}
                  <Typography variant="body-secondary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {formatDateTime(event.timestamp)}
                  </Typography>
                  {event.durationMinutes && (
                    <Typography variant="body-secondary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                      Time taken: {formatDuration(event.durationMinutes)}
                    </Typography>
                  )}
                  {event.delayMinutes && event.delayMinutes > 0 && (
                    <Badge variant="danger" size="sm" style={{ marginTop: 'var(--spacing-x1)' }}>
                      {formatDelay(event.delayMinutes)}
                    </Badge>
                  )}
                  {event.location && (
                    <Typography variant="body-secondary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                      {event.location}
                    </Typography>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
