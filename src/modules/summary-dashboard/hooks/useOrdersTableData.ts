import { useState, useEffect, useMemo } from 'react'
import { fetchOrders } from '../data/ordersApiService'
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

/**
 * Hook to fetch orders table data with filters and summary
 */
export function useOrdersTableData({
  selectedFilters,
  selectedOutboundOption,
  globalFilters,
  page = 1,
  pageSize = 50,
}: UseOrdersTableDataParams): UseOrdersTableDataResult {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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
      setOrders(result.orders)
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

  useEffect(() => {
    loadData()
  }, [filterKey])

  return {
    orders,
    summary,
    pagination,
    isLoading,
    error,
    refetch: loadData,
  }
}
