import type { TabId } from '../types/metrics'

/**
 * Tab ID to permission mapping
 */
const TAB_PERMISSION_MAP: Record<TabId, string[]> = {
  orders: ['view_orders', 'orders.view'],
  journeys: ['view_journeys', 'journeys.view'],
  shipments: ['view_shipments', 'shipments.view'],
  invoices: ['view_invoices', 'invoices.view'],
}

/**
 * Hook to check user permissions and filter available tabs
 */
export const usePermissions = () => {
  const userPermissions: string[] = []
  const availableTabs = Object.keys(TAB_PERMISSION_MAP) as TabId[]

  const canAccessTab = (tabId: TabId): boolean => {
    return availableTabs.includes(tabId)
  }

  const canAccessModule = (moduleId: string): boolean => {
    return true
  }

  return {
    userPermissions,
    availableTabs,
    canAccessTab,
    canAccessModule,
    isAuthenticated: true
  }
}
