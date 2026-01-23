import { useState, useEffect, useMemo } from 'react'
import { Button, Badge, Typography, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from 'ft-design-system'
import { useOrdersTableData } from '../hooks/useOrdersTableData'
import { getCustomDataTemplate } from '../data/ordersApiService'
import type { OrderRow, OrderStatus, CustomDataTemplateField } from '../types/orders'
import type { GlobalFilters } from '../types/metrics'
import ErrorBanner from './ErrorBanner'
import EmptyState from './EmptyState'
import TableSkeleton from './TableSkeleton'
import { formatDateTime, formatDelay } from '../utils/ordersFormat'

type FilterId = 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'

interface OrdersTableViewProps {
  selectedFilters: Set<FilterId>
  selectedOutboundOption: string | null
  globalFilters: GlobalFilters
  onOpenDetails: (orderId: string) => void
}

export default function OrdersTableView({
  selectedFilters,
  selectedOutboundOption,
  globalFilters,
  onOpenDetails,
}: OrdersTableViewProps) {
  const { orders, isLoading, error, refetch } = useOrdersTableData({
    selectedFilters,
    selectedOutboundOption,
    globalFilters,
  })

  const [customFields, setCustomFields] = useState<CustomDataTemplateField[]>([])

  // Fetch custom data template fields
  useEffect(() => {
    getCustomDataTemplate()
      .then(fields => setCustomFields(fields))
      .catch(err => {
        console.warn('Failed to load custom data template:', err)
        setCustomFields([])
      })
  }, [])

  // Calculate total column count (fixed + custom)
  const fixedColumnCount = 12
  const totalColumnCount = fixedColumnCount + customFields.length

  // Format custom field value for display
  const formatCustomValue = (value: any, field: CustomDataTemplateField): string => {
    if (value === null || value === undefined || value === '') {
      return '—'
    }
    if (field.type === 'number') {
      return String(Number(value))
    }
    return String(value)
  }

  // Get custom field label (human-readable)
  const getCustomFieldLabel = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const getStatusBadgeVariant = (status: OrderStatus): 'default' | 'warning' | 'info' | 'neutral' => {
    switch (status) {
      case 'In Process':
      case 'In Transit':
        return 'info'
      case 'Pending':
      case 'Pending Approval':
      case 'Reconciliation Pending':
        return 'warning'
      case 'In Assignment':
        return 'neutral'
      default:
        return 'default'
    }
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  if (error) {
    return <ErrorBanner error={error} onRetry={refetch} />
  }

  // Determine if filters are applied
  const hasFilters = useMemo(() => {
    return (
      selectedFilters.size > 0 ||
      selectedOutboundOption !== null ||
      globalFilters.locationId !== undefined ||
      globalFilters.transporterId !== undefined ||
      globalFilters.priority !== undefined ||
      globalFilters.dateRange !== undefined
    )
  }, [selectedFilters, selectedOutboundOption, globalFilters])

  // Show empty state if no orders
  if (orders.length === 0) {
    const emptyVariant = hasFilters ? 'no-results' : 'no-data'
    return (
      <EmptyState
        variant={emptyVariant}
        onAction={hasFilters ? () => {
          // Clear filters - this would need to be passed as a prop or handled by parent
          // For now, just show the empty state
        } : undefined}
        actionLabel={hasFilters ? 'Clear filters' : undefined}
      />
    )
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x4)', width: '100%' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--spacing-x2)' }}>
        <Typography variant="body-primary-semibold" style={{ fontSize: 'var(--font-size-md)', color: 'var(--primary)' }}>
          {orders.length} Orders available
        </Typography>
      </div>

      {/* Table */}
      <div style={{ border: 'calc(var(--spacing-x1) / 4) solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Order ID
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Consignor
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Consignee
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Route
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Trip Type
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Stage
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Milestone
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Status
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  ID
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Delivery status
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Dispatch date
                </Typography>
              </TableHead>
              <TableHead colorVariant="dark25">
                <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                  Actions
                </Typography>
              </TableHead>
              {/* Custom data columns */}
              {customFields.map((field) => (
                <TableHead key={field.name} colorVariant="dark25">
                  <Typography variant="body-secondary-semibold" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                    {getCustomFieldLabel(field.name)}
                  </Typography>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((row: OrderRow) => (
                <TableRow
                  key={row.id}
                  onMouseEnter={(e) => {
                    const cells = e.currentTarget.querySelectorAll('td')
                    cells.forEach((cell) => {
                      ;(cell as HTMLElement).style.backgroundColor = 'var(--bg-secondary)'
                    })
                  }}
                  onMouseLeave={(e) => {
                    const cells = e.currentTarget.querySelectorAll('td')
                    cells.forEach((cell) => {
                      ;(cell as HTMLElement).style.backgroundColor = ''
                    })
                  }}
                  style={{ transition: 'background-color 0.15s ease' }}
                >
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>
                      {row.orderId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>
                      {row.consignorName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>
                      {row.consigneeName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>
                      {row.route}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                      {row.tripType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>
                      {row.stage}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}>
                      {row.milestone || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(row.status)} size="sm">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body-primary-regular"
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--primary)',
                        cursor: 'default',
                        textDecoration: 'none'
                      }}
                    >
                      {row.relatedIdType}: {row.relatedId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-x1)' }}>
                      {row.deliveryStatus === 'delayed' ? (
                        <Typography
                          variant="body-primary-regular"
                          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}
                        >
                          {row.delayDays
                            ? `Delayed by ${row.delayDays} ${row.delayDays === 1 ? 'day' : 'days'}`
                            : 'Delayed'}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body-primary-regular"
                          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--primary)' }}
                        >
                          On time
                        </Typography>
                      )}
                      {row.deliveryEta && (
                        <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {formatDateTime(row.deliveryEta)}
                        </Typography>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                      {row.dispatchDate ? formatDateTime(row.dispatchDate) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      icon="arrow-top-right"
                      iconPosition="only"
                      size="sm"
                      className="rounded-full"
                      onClick={() => onOpenDetails(row.id)}
                      style={{
                        height: 'var(--component-height-md)',
                        width: 'var(--component-height-md)',
                        padding: 0,
                        borderStyle: 'solid',
                        borderColor: 'var(--border-primary)'
                      }}
                    />
                  </TableCell>
                  {/* Custom data cells */}
                  {customFields.map((field) => {
                    const customValue = row.customData?.[field.name]
                    return (
                      <TableCell key={field.name}>
                        <Typography variant="body-primary-regular" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                          {formatCustomValue(customValue, field)}
                        </Typography>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
