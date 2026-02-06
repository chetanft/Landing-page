import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchOrders } from '../data/ordersApiService'
import { getJourneyDoRows, subscribeToJourneySearchUpdates } from '../data/journeyApiService'
import type { OrderRow, OrderSummary, PaginationMeta } from '../types/orders'
import type { GlobalFilters } from '../types/metrics'

type FilterId = 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'

interface UseOrdersTableDataParams {
  selectedFilters: Set<FilterId>
  selectedOutboundOption: string | null
  globalFilters: GlobalFilters
  page?: number
  pageSize?: number
}

interface UseOrdersTableDataResult {
  orders: OrderRow[]
  summary: OrderSummary | null
  pagination: PaginationMeta | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

const parseCsvParam = (params: URLSearchParams, key: string): string[] => {
  const value = params.get(key)
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const STATUS_TO_LABEL: Record<string, string[]> = {
  UNPLANNED: ['pending'],
  PLANNED: ['in process'],
  PARTIALLY_PLANNED: ['in process'],
  IN_PROGRESS: ['in process'],
  DISPATCHED: ['in transit'],
  IN_TRANSIT: ['in transit'],
  FAILED: ['failed'],
  CANCELLED: ['cancelled'],
  RTO: ['rto'],
  DELIVERED: ['in transit'],
  PARTIALLY_DELIVERED: ['in transit']
}

const JOURNEY_STATUS_TO_MILESTONE: Record<string, string> = {
  BEFORE_ORIGIN: 'en route to loading',
  AT_ORIGIN: 'at origin',
  IN_TRANSIT: 'in transit',
  AT_DESTINATION: 'at destination'
}

/**
 * Hook to fetch orders table data with filters and summary
 */
export function useOrdersTableData({
  selectedFilters,
  selectedOutboundOption,
  globalFilters,
  page = 1,
  pageSize = 1000,
}: UseOrdersTableDataParams): UseOrdersTableDataResult {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const urlSearch = typeof window !== 'undefined' ? window.location.search : ''

  const applyUrlFilters = useCallback((rows: OrderRow[]): OrderRow[] => {
    if (!urlSearch) return rows

    const params = new URLSearchParams(urlSearch)
    const statusFilters = parseCsvParam(params, 'status').map((item) => item.toUpperCase())
    const tripTypeFilters = parseCsvParam(params, 'tripType').map((item) => item.toUpperCase())
    const journeyStatusFilters = parseCsvParam(params, 'journey_status').map((item) => item.toUpperCase())
    const bucketFilters = parseCsvParam(params, 'bucket').map((item) => item.toLowerCase())

    if (
      statusFilters.length === 0 &&
      tripTypeFilters.length === 0 &&
      journeyStatusFilters.length === 0 &&
      bucketFilters.length === 0
    ) {
      return rows
    }

    return rows.filter((row) => {
      const rowStatus = String(row.status || '').toLowerCase()
      const rowTripType = String(row.tripType || '').toUpperCase()
      const rowMilestone = String(row.milestone || '').toLowerCase()

      if (statusFilters.length > 0) {
        const allowedLabels = statusFilters.flatMap((status) => STATUS_TO_LABEL[status] || [status.toLowerCase()])
        if (!allowedLabels.includes(rowStatus)) {
          return false
        }
      }

      if (tripTypeFilters.length > 0 && !tripTypeFilters.includes(rowTripType)) {
        return false
      }

      if (journeyStatusFilters.length > 0) {
        const allowedMilestones = journeyStatusFilters
          .map((status) => JOURNEY_STATUS_TO_MILESTONE[status] || status.toLowerCase())
        if (!allowedMilestones.includes(rowMilestone)) {
          return false
        }
      }

      if (bucketFilters.length > 0) {
        if (!bucketFilters.some((bucket) => rowMilestone.includes(bucket))) {
          return false
        }
      }

      return true
    })
  }, [urlSearch])

  const filterKey = useMemo(() => {
    const dateRange = globalFilters.dateRange
    return [
      Array.from(selectedFilters).sort().join(','),
      selectedOutboundOption ?? '',
      globalFilters.locationId ?? '',
      globalFilters.transporterId ?? '',
      globalFilters.priority?.slice().sort().join(',') ?? '',
      dateRange?.start?.getTime() ?? '',
      dateRange?.end?.getTime() ?? '',
      urlSearch,
      page,
      pageSize
    ].join('|')
  }, [
    selectedFilters,
    selectedOutboundOption,
    globalFilters.locationId,
    globalFilters.transporterId,
    globalFilters.priority,
    globalFilters.dateRange,
    urlSearch,
    page,
    pageSize
  ])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchOrders(
        selectedFilters,
        selectedOutboundOption,
        globalFilters,
        page,
        pageSize
      )
      setOrders(applyUrlFilters(result.orders))
      setSummary(result.summary)
      setPagination(result.pagination)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch orders')
      setError(error)
      console.error('Error loading orders:', error)
      // Clear data on error
      setOrders([])
      setSummary(null)
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }

  const mergeJourneyDoRows = useCallback(() => {
    const journeyRows = getJourneyDoRows()
    if (journeyRows.length === 0) return
    setOrders((prev) => {
      const existingIds = new Set(prev.map(item => item.id))
      const existingOrderIds = new Set(prev.map(item => item.orderId))
      const mapped = journeyRows.map((row) => ({
        id: `do-${row.journeyId}-${row.doNumber}`,
        orderId: row.doNumber,
        soNumber: row.soNumbers.join(', '),
        consignorName: row.consignorName,
        consigneeName: row.consigneeName,
        route: row.route,
        tripType: row.tripType as any,
        stage: row.stage,
        milestone: row.milestone,
        status: row.status as any,
        relatedIdType: row.relatedIdType as any,
        relatedId: row.relatedId,
        deliveryEta: undefined,
        deliveryStatus: '' as any,
        dispatchDate: row.dispatchDate,
        customData: {}
      }))
      const merged = [...prev]
      mapped.forEach((item) => {
        if (!existingIds.has(item.id) && !existingOrderIds.has(item.orderId)) {
          merged.push(item)
        }
      })
      return applyUrlFilters(merged)
    })
  }, [applyUrlFilters])

  useEffect(() => {
    loadData()
  // filterKey captures all relevant dependencies - loadData would cause infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    const unsubscribe = subscribeToJourneySearchUpdates(() => {
      mergeJourneyDoRows()
    })
    mergeJourneyDoRows()
    return unsubscribe
  }, [mergeJourneyDoRows])

  return {
    orders,
    summary,
    pagination,
    isLoading,
    error,
    refetch: loadData,
  }
}
