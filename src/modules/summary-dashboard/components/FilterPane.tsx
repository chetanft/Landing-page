import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Button,
  Typography,
  SelectLegacy,
} from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import { useTransporters } from '../hooks/useTransporters'

interface FilterPaneProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  globalFilters: GlobalFilters
  onFiltersChange: (filters: Partial<GlobalFilters>) => void
}

export default function FilterPane({
  open,
  onOpenChange,
  globalFilters,
  onFiltersChange,
}: FilterPaneProps) {
  const { transporters, isLoading: transportersLoading } = useTransporters()
  
  // Local state for filter values (allows cancel without applying)
  const [localTransporterId, setLocalTransporterId] = useState<string | undefined>(
    globalFilters.transporterId
  )

  // Sync local state when globalFilters change (e.g., when drawer opens)
  useEffect(() => {
    if (open) {
      setLocalTransporterId(globalFilters.transporterId)
    }
  }, [open, globalFilters.transporterId])

  // Handle ESC key to close
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalTransporterId(globalFilters.transporterId)
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, globalFilters.transporterId, onOpenChange])

  const handleTransporterChange = (value: string | number) => {
    const normalizedValue = String(value ?? '')
    setLocalTransporterId(normalizedValue || undefined)
  }

  const handleReset = () => {
    setLocalTransporterId(undefined)
  }

  const handleApply = () => {
    const selectedTransporter = transporters.find(
      (t) => t.value === localTransporterId
    )
    onFiltersChange({
      transporterId: localTransporterId,
      transporterName: selectedTransporter?.label || 'All Transporters',
    })
    onOpenChange(false)
  }

  const handleClose = () => {
    // Reset local state to globalFilters when closing without applying
    setLocalTransporterId(globalFilters.transporterId)
    onOpenChange(false)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!open) return null

  const floatingPanel = (
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
      
      {/* Floating Panel */}
      <div
        style={{
          position: 'fixed',
          top: 'var(--spacing-x6)',
          right: 'var(--spacing-x6)',
          bottom: 'var(--spacing-x6)',
          width: '480px',
          maxHeight: 'calc(100vh - calc(var(--spacing-x6) * 2))',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
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
            padding: 'var(--spacing-x5)',
            borderBottom: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)' }}>
            Filters
          </Typography>
          <Button
            variant="text"
            icon="cross"
            iconPosition="only"
            size="sm"
            onClick={handleClose}
            style={{
              height: 'var(--component-height-md)',
              width: 'var(--component-height-md)',
              padding: 0,
            }}
          />
        </div>

        {/* Content Area */}
        <div
          style={{
            padding: 'var(--spacing-x5)',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Other filters section */}
          <div>
            <Typography
              variant="body-secondary-medium"
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-primary)',
                marginBottom: 'var(--spacing-x4)',
              }}
            >
              Other filters
            </Typography>

            {/* Transporter filter */}
            <div style={{ marginBottom: 'var(--spacing-x4)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-x1)',
                  marginBottom: 'var(--spacing-x2)',
                }}
              >
                <Typography
                  variant="body-secondary-medium"
                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}
                >
                  Transporter
                </Typography>
                <span style={{ color: 'var(--text-critical)' }}>*</span>
              </label>
              <SelectLegacy
                value={localTransporterId || ''}
                onChange={handleTransporterChange}
                placeholder={transportersLoading ? 'Loading...' : 'Select transporter'}
                options={[
                  { value: '', label: 'All Transporters' },
                  ...transporters.map((transporter) => ({
                    value: transporter.value,
                    label: transporter.label,
                  })),
                ]}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--spacing-x5)',
            borderTop: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-x2)',
            flexShrink: 0,
          }}
        >
          <Button variant="secondary" onClick={handleReset}>
            Reset all
          </Button>
          <Button variant="primary" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </>
  )

  return createPortal(floatingPanel, document.body)
}
