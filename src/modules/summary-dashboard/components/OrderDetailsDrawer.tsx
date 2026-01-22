import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Badge,
  Typography,
  Card,
  Icon,
} from 'ft-design-system'
import { useOrderDrawerData, type DrawerTab } from '../hooks/useOrderDrawerData'
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatDuration,
  formatDelay,
  formatWeight,
} from '../utils/ordersFormat'
import ErrorBanner from './ErrorBanner'
import DrawerSkeleton from './DrawerSkeleton'

interface OrderDetailsDrawerProps {
  open: boolean
  orderId: string | null
  onClose: () => void
}

export default function OrderDetailsDrawer({
  open,
  orderId,
  onClose,
}: OrderDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('details')

  const {
    details,
    detailsLoading,
    detailsError,
    timeline,
    timelineLoading,
    timelineError,
    comments,
    commentsLoading,
    commentsError,
    templates,
    templatesLoading,
    refetchDetails,
    refetchTimeline,
    refetchComments,
    addComment,
  } = useOrderDrawerData({
    orderId,
    activeTab,
  })

  // Reset tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('details')
    }
  }, [open])

  // Handle ESC key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!open || !orderId) return null

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          opacity: 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '600px',
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-primary)',
          boxShadow: '0px 8px 20px 0px rgba(0, 0, 0, 0.16)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: 'translateX(0)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--spacing-x5) var(--spacing-x5)',
            borderBottom: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backgroundColor: 'var(--bg-primary)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography
            variant="body-primary-semibold"
            style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)' }}
          >
            Order Details
          </Typography>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x4)' }}>
            {/* Navigation arrows - disabled for now */}
            <Button
              variant="ghost"
              icon="chevron-left"
              iconPosition="only"
              size="sm"
              disabled
              style={{
                height: 'var(--component-height-md)',
                width: 'var(--component-height-md)',
                padding: 0,
              }}
            />
            <Button
              variant="ghost"
              icon="chevron-right"
              iconPosition="only"
              size="sm"
              disabled
              style={{
                height: 'var(--component-height-md)',
                width: 'var(--component-height-md)',
                padding: 0,
              }}
            />
            <Button
              variant="ghost"
              icon="cross"
              iconPosition="only"
              size="sm"
              onClick={onClose}
              style={{
                height: 'var(--component-height-md)',
                width: 'var(--component-height-md)',
                padding: 0,
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
            flexShrink: 0,
          }}
        >
          {(['details', 'timeline', 'comments'] as DrawerTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: 'var(--spacing-x3) var(--spacing-x8)',
                border: 'none',
                borderBottom:
                  activeTab === tab
                    ? '4px solid var(--dark-100, #434f64)'
                    : 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: 'var(--font-family-body-primary, Inter)',
                fontSize: 'var(--font-size-md)',
                fontWeight: activeTab === tab ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'details' ? 'Details' : tab === 'timeline' ? 'Timeline' : 'Comments'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--spacing-x5)',
            minHeight: 0,
          }}
        >
          {activeTab === 'details' && (
            <DetailsTab
              details={details}
              loading={detailsLoading}
              error={detailsError}
              onRetry={refetchDetails}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab
              timeline={timeline}
              loading={timelineLoading}
              error={timelineError}
              onRetry={refetchTimeline}
            />
          )}
          {activeTab === 'comments' && (
            <CommentsTab
              comments={comments}
              loading={commentsLoading}
              error={commentsError}
              templates={templates}
              templatesLoading={templatesLoading}
              onRetry={refetchComments}
              onAddComment={addComment}
            />
          )}
        </div>
      </div>
    </>
  )

  return createPortal(drawerContent, document.body)
}

// Details Tab Component
interface DetailsTabProps {
  details: ReturnType<typeof useOrderDrawerData>['details']
  loading: boolean
  error: Error | null
  onRetry: () => void
}

function DetailsTab({ details, loading, error, onRetry }: DetailsTabProps) {
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
              <Badge variant="critical" size="sm">
                {delayMessage}
              </Badge>
            )}
            {!delayMessage && summary.deliveryStatus === 'on_time' && (
              <Badge variant="positive" size="sm">
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

// Timeline Tab Component
interface TimelineTabProps {
  timeline: ReturnType<typeof useOrderDrawerData>['timeline']
  loading: boolean
  error: Error | null
  onRetry: () => void
}

function TimelineTab({ timeline, loading, error, onRetry }: TimelineTabProps) {
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
                    <Badge variant="critical" size="sm" style={{ marginTop: 'var(--spacing-x1)' }}>
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

// Comments Tab Component
interface CommentsTabProps {
  comments: ReturnType<typeof useOrderDrawerData>['comments']
  loading: boolean
  error: Error | null
  templates: ReturnType<typeof useOrderDrawerData>['templates']
  templatesLoading: boolean
  onRetry: () => void
  onAddComment: (type: 'template' | 'custom', templateId?: string, message?: string) => Promise<void>
}

function CommentsTab({
  comments,
  loading,
  error,
  templates,
  templatesLoading,
  onRetry,
  onAddComment,
}: CommentsTabProps) {
  const [commentType, setCommentType] = useState<'template' | 'custom'>('template')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [customMessage, setCustomMessage] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (commentType === 'template' && !selectedTemplateId) return
    if (commentType === 'custom' && !customMessage.trim()) return

    setIsSubmitting(true)
    try {
      await onAddComment(
        commentType,
        commentType === 'template' ? selectedTemplateId : undefined,
        commentType === 'custom' ? customMessage : undefined
      )
      setSelectedTemplateId('')
      setCustomMessage('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <DrawerSkeleton variant="comments" />
  }

  if (error) {
    return <ErrorBanner message={error.message} onRetry={onRetry} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x5)', height: '100%' }}>
      {/* Comments List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-x6)' }}>
            <Typography variant="body-primary-regular">No comments yet</Typography>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} style={{ display: 'flex', gap: 'var(--spacing-x3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Typography
                  variant="body-primary-semibold"
                  style={{ color: 'var(--bg-primary)', fontSize: 'var(--font-size-sm)' }}
                >
                  {comment.authorInitials}
                </Typography>
              </div>
              <div style={{ flex: 1 }}>
                <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {comment.authorName}
                </Typography>
                <Typography variant="body-secondary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                  {formatDateTime(comment.createdAt)}
                </Typography>
                <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-x1)' }}>
                  {comment.message}
                </Typography>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <Card style={{ padding: 'var(--spacing-x5)', flexShrink: 0 }}>
        <Typography
          variant="body-primary-semibold"
          style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--spacing-x4)' }}
        >
          Add Comment
        </Typography>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)' }}>
          {/* Radio buttons */}
          <div style={{ display: 'flex', gap: 'var(--spacing-x4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={commentType === 'template'}
                onChange={() => setCommentType('template')}
                style={{ cursor: 'pointer' }}
              />
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Select comment
              </Typography>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x1)', cursor: 'pointer' }}>
              <input
                type="radio"
                checked={commentType === 'custom'}
                onChange={() => setCommentType('custom')}
                style={{ cursor: 'pointer' }}
              />
              <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)' }}>
                Write comment
              </Typography>
            </label>
          </div>

          {/* Input */}
          {commentType === 'template' ? (
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={templatesLoading}
              style={{
                padding: 'var(--spacing-x2)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                width: '100%',
              }}
            >
              <option value="">Select comment</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Write your comment..."
              style={{
                padding: 'var(--spacing-x2)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                width: '100%',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          )}

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || (commentType === 'template' && !selectedTemplateId) || (commentType === 'custom' && !customMessage.trim())}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
