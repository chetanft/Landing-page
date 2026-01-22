/**
 * Module navigation configuration for FreightTiger TMS
 */

export interface ModuleConfig {
  id: string
  label: string
  url: string
  description: string
  permissions: string[]
}

/**
 * FreightTiger TMS module URLs
 */
export const MODULE_URLS = {
  journeys: '/app/journeys',
  orders: '/app/orders',
  indents: '/app/indents',
  shipments: '/app/shipments',
  invoices: '/app/invoices',
  epod: '/app/epod',
  reports: '/app/reports',
  analytics: '/app/analytics',
  settings: '/app/settings'
} as const

/**
 * Module configurations with navigation details
 */
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  journeys: {
    id: 'journeys',
    label: 'Journeys',
    url: MODULE_URLS.journeys,
    description: 'Track vehicle journeys and real-time status',
    permissions: ['view_journeys', 'journeys.view']
  },
  orders: {
    id: 'orders',
    label: 'Orders',
    url: MODULE_URLS.orders,
    description: 'Manage customer orders and fulfillment',
    permissions: ['view_orders', 'orders.view']
  },
  indents: {
    id: 'indents',
    label: 'Indents',
    url: MODULE_URLS.indents,
    description: 'Handle indent requests and approvals',
    permissions: ['view_indents', 'indents.view']
  },
  shipments: {
    id: 'shipments',
    label: 'Shipments',
    url: MODULE_URLS.shipments,
    description: 'Monitor shipment status and delivery',
    permissions: ['view_shipments', 'shipments.view']
  },
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    url: MODULE_URLS.invoices,
    description: 'Manage billing and invoice processing',
    permissions: ['view_invoices', 'invoices.view']
  },
  epod: {
    id: 'epod',
    label: 'ePOD',
    url: MODULE_URLS.epod,
    description: 'Electronic Proof of Delivery management',
    permissions: ['view_epod', 'epod.view']
  }
}

/**
 * Quick action configurations for dashboard cards
 */
export const QUICK_ACTIONS = {
  createJourney: {
    label: 'Create Journey',
    url: `${MODULE_URLS.journeys}/create`,
    permissions: ['create_journey', 'journeys.create']
  },
  createOrder: {
    label: 'Create Order',
    url: `${MODULE_URLS.orders}/create`,
    permissions: ['create_order', 'orders.create']
  },
  createIndent: {
    label: 'Create Indent',
    url: `${MODULE_URLS.indents}/create`,
    permissions: ['create_indent', 'indents.create']
  },
  viewReports: {
    label: 'View Reports',
    url: MODULE_URLS.reports,
    permissions: ['view_reports', 'reports.view']
  }
} as const

/**
 * Check if user has permission to access a module
 */
export const hasModulePermission = (
  moduleId: string,
  userPermissions: string[]
): boolean => {
  const moduleConfig = MODULE_CONFIGS[moduleId]
  if (!moduleConfig) return false

  return moduleConfig.permissions.some(permission =>
    userPermissions.includes(permission)
  )
}

/**
 * Get available modules based on user permissions
 */
export const getAvailableModules = (userPermissions: string[]): ModuleConfig[] => {
  return Object.values(MODULE_CONFIGS).filter(module =>
    hasModulePermission(module.id, userPermissions)
  )
}

/**
 * Navigation helper functions
 */
export const navigationUtils = {
  /**
   * Navigate to a module
   */
  navigateToModule: (moduleId: string): void => {
    const moduleConfig = MODULE_CONFIGS[moduleId]
    if (moduleConfig) {
      window.location.href = moduleConfig.url
    }
  },

  /**
   * Navigate to module with filters
   */
  navigateToModuleWithFilters: (
    moduleId: string,
    filters: Record<string, string>
  ): void => {
    const moduleConfig = MODULE_CONFIGS[moduleId]
    if (moduleConfig) {
      const url = new URL(moduleConfig.url, window.location.origin)
      Object.entries(filters).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      window.location.href = url.toString()
    }
  },

  /**
   * Open module in new tab
   */
  openModuleInNewTab: (moduleId: string): void => {
    const moduleConfig = MODULE_CONFIGS[moduleId]
    if (moduleConfig) {
      window.open(moduleConfig.url, '_blank', 'noopener,noreferrer')
    }
  },

  /**
   * Get module URL for target links
   */
  getModuleUrl: (moduleId: string): string => {
    return MODULE_CONFIGS[moduleId]?.url || '#'
  },

  /**
   * Check if current page is a module
   */
  isCurrentModule: (moduleId: string): boolean => {
    const moduleConfig = MODULE_CONFIGS[moduleId]
    return moduleConfig ? window.location.pathname.startsWith(moduleConfig.url) : false
  }
}