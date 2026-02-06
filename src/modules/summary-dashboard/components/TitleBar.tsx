import { useCallback, useEffect, useState } from 'react'
import { Icon, Input, InputField, Typography, Row, Col, DatePicker } from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import {
  LocationFilter,
  useDatePickerCustomOptions,
  formatDateForInput,
  parseDateValue
} from './title-bar'

interface TitleBarProps {
  globalFilters: GlobalFilters
  onFiltersChange: (filters: Partial<GlobalFilters>) => void
}

export default function TitleBar({ globalFilters, onFiltersChange }: TitleBarProps) {
  const [localDateRange, setLocalDateRange] = useState(globalFilters.dateRange)

  // Sync when actual date values change, not object reference
  useEffect(() => {
    setLocalDateRange(globalFilters.dateRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilters.dateRange.start, globalFilters.dateRange.end])

  const handleLocationChange = useCallback((locationId: string | undefined, locationName: string) => {
    onFiltersChange({
      locationId,
      locationName
    })
  }, [onFiltersChange])

  const updateDateRange = useCallback(
    (next: { start?: Date; end?: Date }) => {
      setLocalDateRange((prev) => {
        const updated = {
          start: next.start ?? prev.start,
          end: next.end ?? prev.end
        }
        onFiltersChange({ dateRange: updated })
        return updated
      })
    },
    [onFiltersChange]
  )

  const handleStartDateChange = useCallback((value: string) => {
    const newStartDate = parseDateValue(value)
    if (!newStartDate) return
    updateDateRange({ start: newStartDate })
  }, [updateDateRange])

  const handleEndDateChange = useCallback((value: string) => {
    const newEndDate = parseDateValue(value)
    if (!newEndDate) return
    updateDateRange({ end: newEndDate })
  }, [updateDateRange])

  // Inject custom date range options into DatePicker dropdown
  useDatePickerCustomOptions({
    onStartChange: handleStartDateChange,
    onEndChange: handleEndDateChange
  })

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: 'var(--spacing-x5)', borderBottom: 'calc(var(--spacing-x1) / 4) solid var(--border-secondary)' }}>
      <Row align="middle" justify="space-between" style={{ flexWrap: 'nowrap' }}>
        {/* Title Container */}
        <Col flex="0 0 auto" style={{ width: 'fit-content', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x3)' }}>
            <Icon name="dashboard" size={24} color="var(--primary)" />
            <Typography variant="title-primary">Summary Dashboard</Typography>
          </div>
        </Col>

        {/* Filter and Search Container */}
        <Col flex="1 1 auto" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-x3)', alignItems: 'center', maxWidth: 'calc(var(--spacing-x24) * 10)', width: '100%' }}>
            {/* Location Filter */}
            <LocationFilter
              value={globalFilters.locationId}
              onChange={handleLocationChange}
            />

            {/* Date Range Picker */}
            <div className="date-picker-wrapper" style={{ width: '100%' }}>
              <DatePicker
                range
                startValue={formatDateForInput(localDateRange.start)}
                endValue={formatDateForInput(localDateRange.end)}
                onStartChange={handleStartDateChange}
                onEndChange={handleEndDateChange}
                placeholder="Select date range"
                includeDropdown
              />
            </div>

            {/* Search Input */}
            <div className="search-input-wrapper" style={{ width: '100%', flex: '1 1 auto' }}>
              <Input>
                <InputField
                  type="search"
                  placeholder="Search..."
                  style={{ width: '100%' }}
                  leadingIcon="search"
                  leadingIconSize={16}
                />
              </Input>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}
