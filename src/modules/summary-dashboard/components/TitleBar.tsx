import { Icon, Input, InputField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Typography, Row, Col, DatePicker } from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import { useConsignors } from '../hooks/useConsignors'

interface TitleBarProps {
  globalFilters: GlobalFilters
  onFiltersChange: (filters: Partial<GlobalFilters>) => void
}

export default function TitleBar({ globalFilters, onFiltersChange }: TitleBarProps) {
  const { consignors, isLoading: consignorsLoading } = useConsignors()

  const handleLocationChange = (value: string | number) => {
    const normalizedValue = String(value ?? '')
    const selectedConsignor = consignors.find(c => c.value === normalizedValue)
    onFiltersChange({
      locationId: normalizedValue || undefined,
      locationName: selectedConsignor?.label || 'All Locations'
    })
  }

  const handleStartDateChange = (value: string) => {
    const newStartDate = new Date(value)
    onFiltersChange({
      dateRange: {
        start: newStartDate,
        end: globalFilters.dateRange.end
      }
    })
  }

  const handleEndDateChange = (value: string) => {
    const newEndDate = new Date(value)
    onFiltersChange({
      dateRange: {
        start: globalFilters.dateRange.start,
        end: newEndDate
      }
    })
  }

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
            <Select
              value={globalFilters.locationId || ''}
              onValueChange={handleLocationChange}
            >
              <SelectTrigger className="min-w-[var(--spacing-x24)]" style={{ width: '100%' }}>
                <SelectValue placeholder={consignorsLoading ? 'Loading...' : 'All Locations'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {consignors.map((consignor) => (
                  <SelectItem key={consignor.value} value={consignor.value}>
                    {consignor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Picker */}
            <div className="date-picker-wrapper" style={{ width: '100%' }}>
              <DatePicker
                range
                startValue={globalFilters.dateRange.start.toISOString()}
                endValue={globalFilters.dateRange.end.toISOString()}
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
