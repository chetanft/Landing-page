import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Typography,
} from 'ft-design-system'
import { useOrderDrawerData, type DrawerTab } from '../hooks/useOrderDrawerData'
import { OrderDetailsTab, OrderTimelineTab, OrderCommentsTab } from './order-drawer'
import type { OrderRow, OrderDetailsResponse } from '../types/orders'

interface OrderDetailsDrawerProps {
  open: boolean
  orderId: string | null
  fallbackOrder?: OrderRow | null
  onClose: () => void
}

const buildFallbackDetails = (order: OrderRow): OrderDetailsResponse['data'] => ({
  summary: {
    soNumber: order.soNumber || order.orderId,
    totalWeight: 0,
    totalWeightUom: 'kg',
    doCount: 0,
    skuCount: 0,
    totalCost: 0,
    currency: '₹',
    createdAt: order.dispatchDate || '',
    stage: order.stage || '—',
    status: order.status,
    deliveryStatus: order.deliveryStatus,
    eta: order.deliveryEta,
  },
  parties: {
    sender: {
      name: order.consignorName || '—',
      address: '—',
      gstin: '—',
      email: '—',
      phone: '—'
    },
    shipTo: {
      name: order.consigneeName || '—',
      address: '—',
      gstin: '—',
      email: '—',
      phone: '—'
    },
    billTo: {
      name: order.consigneeName || '—',
      address: '—',
      gstin: '—',
      email: '—',
      phone: '—'
    }
  },
  identifiers: {
    planningId: order.orderId,
    journeyId: order.relatedIdType === 'Trip' ? order.relatedId : undefined,
    invoiceNumber: order.relatedIdType === 'INV' ? order.relatedId : undefined,
  }
})

export default function OrderDetailsDrawer({
  open,
  orderId,
  fallbackOrder = null,
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
  const detailsForRender = details || (fallbackOrder ? buildFallbackDetails(fallbackOrder) : null)
  const detailsErrorForRender = detailsForRender ? null : detailsError

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
          zIndex: 11000,
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
          zIndex: 11001,
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
            <OrderDetailsTab
              details={detailsForRender}
              loading={detailsLoading}
              error={detailsErrorForRender}
              onRetry={refetchDetails}
            />
          )}
          {activeTab === 'timeline' && (
            <OrderTimelineTab
              timeline={timeline}
              loading={timelineLoading}
              error={timelineError}
              onRetry={refetchTimeline}
            />
          )}
          {activeTab === 'comments' && (
            <OrderCommentsTab
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
