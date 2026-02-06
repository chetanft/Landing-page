import { useState, useCallback, useMemo } from 'react'
import { QuickFilters, QuickFilter, FilterOption } from 'ft-design-system'
import type { TabData, GlobalFilters } from '../types/metrics'
import type { OrderRow } from '../types/orders'
import { useOrdersTableData } from '../hooks/useOrdersTableData'
import OrderDetailsDrawer from '../components/OrderDetailsDrawer'
import OrdersTableView from '../components/OrdersTableView'
import NewLifecycleBoard from '../components/NewLifecycleBoard'

type ViewMode = 'grid' | 'table'
type QuickFilterId = 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'

interface OrdersContainerProps {
  tabData: TabData | null
  globalFilters: GlobalFilters
  isLoading: boolean
  error: string | null
  onRetry: () => void
  viewMode: ViewMode
  selectedFilters: Set<QuickFilterId>
  selectedOutboundOption: string | null
}

export interface OrdersQuickFiltersProps {
  selectedFilters: Set<'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'>
  selectedOutboundOption: string | null
  quickFilterCounts: {
    inbound: number
    outbound: number
    ftl: number
    ptl: number
    deliveryDelayed: number
  }
  onFilterClick: (filterId: string, optionId?: string) => void
}

export function OrdersQuickFilters({
  selectedFilters,
  selectedOutboundOption,
  quickFilterCounts,
  onFilterClick
}: OrdersQuickFiltersProps) {
  return (
    <QuickFilters onFilterClick={onFilterClick}>
      <QuickFilter
        id="inbound"
        label="Inbound"
        count={quickFilterCounts.inbound}
        selected={selectedFilters.has('inbound')}
      />
      <QuickFilter
        id="outbound"
        label="Outbound"
        count={quickFilterCounts.outbound}
        selected={selectedFilters.has('outbound')}
        selectedOption={selectedOutboundOption || undefined}
      >
        <FilterOption
          id="ftl"
          label="FTL"
          count={quickFilterCounts.ftl}
        />
        <FilterOption
          id="ptl"
          label="PTL"
          count={quickFilterCounts.ptl}
        />
      </QuickFilter>
      <QuickFilter
        id="delivery-delayed"
        label="Delivery delayed"
        count={quickFilterCounts.deliveryDelayed}
        type="warning"
        selected={selectedFilters.has('delivery-delayed')}
      />
    </QuickFilters>
  )
}

export default function OrdersContainer({
  tabData,
  globalFilters,
  isLoading,
  error,
  onRetry,
  viewMode,
  selectedFilters,
  selectedOutboundOption
}: OrdersContainerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)

  const handleOpenOrderDetails = useCallback((order: OrderRow) => {
    setSelectedOrderId(order.orderId || order.id)
    setSelectedOrder(order)
    setIsDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setSelectedOrderId(null)
    setSelectedOrder(null)
  }, [])

  return (
    <>
      <OrderDetailsDrawer
        open={isDrawerOpen}
        orderId={selectedOrderId}
        fallbackOrder={selectedOrder}
        onClose={handleCloseDrawer}
      />

      {viewMode === 'table' ? (
        <OrdersTableView
          selectedFilters={selectedFilters}
          selectedOutboundOption={selectedOutboundOption}
          globalFilters={globalFilters}
          onOpenDetails={handleOpenOrderDetails}
        />
      ) : (
        <NewLifecycleBoard
          tabData={tabData}
          globalFilters={globalFilters}
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
        />
      )}
    </>
  )
}

// Export hook for parent to access quick filter state for rendering controls
export function useOrdersQuickFilters(globalFilters: GlobalFilters) {
  const [selectedFilters, setSelectedFilters] = useState<Set<'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'>>(new Set())
  const [selectedOutboundOption, setSelectedOutboundOption] = useState<string | null>(null)

  const { summary: ordersSummary } = useOrdersTableData({
    selectedFilters: new Set(),
    selectedOutboundOption: null,
    globalFilters,
    page: 1,
    pageSize: 1,
  })

  const quickFilterCounts = useMemo(() => {
    if (!ordersSummary) {
      return {
        inbound: 0,
        outbound: 0,
        ftl: 0,
        ptl: 0,
        deliveryDelayed: 0,
      }
    }

    return {
      inbound: ordersSummary.inbound || 0,
      outbound: ordersSummary.outbound || 0,
      ftl: ordersSummary.ftl || 0,
      ptl: ordersSummary.ptl || 0,
      deliveryDelayed: ordersSummary.deliveryDelayed || 0,
    }
  }, [ordersSummary])

  const handleQuickFilterClick = useCallback((filterId: string, optionId?: string) => {
    if (filterId === 'outbound' && optionId) {
      const newOption = selectedOutboundOption === optionId ? null : optionId
      setSelectedOutboundOption(newOption)

      setSelectedFilters(prev => {
        const newSet = new Set(prev)
        if (newOption) {
          newSet.delete('inbound')
          newSet.add('outbound')
        } else {
          newSet.delete('outbound')
        }
        return newSet
      })
    } else {
      const typedFilterId = filterId as 'inbound' | 'outbound' | 'ftl' | 'ptl' | 'delivery-delayed'
      setSelectedFilters(prev => {
        const newSet = new Set(prev)
        const isCurrentlySelected = newSet.has(typedFilterId)

        if (isCurrentlySelected) {
          newSet.delete(typedFilterId)
          if (typedFilterId === 'outbound') {
            setSelectedOutboundOption(null)
          }
        } else {
          if (typedFilterId === 'inbound') {
            newSet.delete('outbound')
            setSelectedOutboundOption(null)
          } else if (typedFilterId === 'outbound') {
            newSet.delete('inbound')
          }
          newSet.add(typedFilterId)
        }
        return newSet
      })
    }
  }, [selectedOutboundOption])

  return {
    selectedFilters,
    selectedOutboundOption,
    quickFilterCounts,
    handleQuickFilterClick
  }
}
