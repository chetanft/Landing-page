import type { TabId } from '../types/metrics'

/**
 * Mock counts for each metric - these simulate what the API would return
 * Replace with actual API calls when backend is ready
 * Note: Orders counts removed - now using real API only
 */
export const mockMetricCounts: Record<string, number> = {
  // Journeys
  'journeys.total': 1247,
  'journeys.active': 342,
  'journeys.delayed': 28,
  'journeys.exceptions': 15,
  'journeys.planned': 89,
  'journeys.planned.on_time': 77,
  'journeys.planned.late_start': 12,
  'journeys.planned.pending_vehicle': 12,
  'journeys.in_transit': 253,
  'journeys.in_transit.on_time': 225,
  'journeys.in_transit.delayed': 28,
  'journeys.in_transit.route_deviation': 7,
  'journeys.in_transit.long_stoppage': 5,
  'journeys.in_transit.eway_bill': 3,
  'journeys.completed': 678,
  'journeys.completed.on_time': 621,
  'journeys.completed.late': 57,
  'journeys.closed': 227,

  // Orders - removed (now using real API only)

  // Shipments
  'shipments.total': 8932,
  'shipments.in_transit': 1234,
  'shipments.delayed': 89,
  'shipments.delivered': 6543,
  'shipments.lifecycle.booked': 456,
  'shipments.lifecycle.picked_up': 778,
  'shipments.lifecycle.in_transit': 1234,
  'shipments.lifecycle.delivered': 6543,

  // Invoices
  'invoices.total': 2341,
  'invoices.pending_approval': 156,
  'invoices.disputed': 23,
  'invoices.paid': 1987,
  'invoices.lifecycle.draft': 89,
  'invoices.lifecycle.pending': 156,
  'invoices.lifecycle.approved': 86,
  'invoices.lifecycle.paid': 1987,
}

/**
 * Lifecycle stage configuration per tab
 */
export const lifecycleStagesConfig: Record<TabId, { id: string; title: string; groupPrefix: string }[]> = {
  journeys: [
    { id: 'planned', title: 'Planned', groupPrefix: 'lifecycle.planned' },
    { id: 'in_transit', title: 'In Transit', groupPrefix: 'lifecycle.in_transit' },
    { id: 'completed', title: 'Completed', groupPrefix: 'lifecycle.completed' },
    { id: 'closed', title: 'Closed', groupPrefix: 'lifecycle.closed' },
  ],
  orders: [
    { id: 'new', title: 'New', groupPrefix: 'lifecycle.new' },
    { id: 'processing', title: 'Processing', groupPrefix: 'lifecycle.processing' },
    { id: 'dispatched', title: 'Dispatched', groupPrefix: 'lifecycle.dispatched' },
    { id: 'delivered', title: 'Delivered', groupPrefix: 'lifecycle.delivered' },
  ],
  shipments: [
    { id: 'booked', title: 'Booked', groupPrefix: 'lifecycle.booked' },
    { id: 'picked_up', title: 'Picked Up', groupPrefix: 'lifecycle.picked_up' },
    { id: 'in_transit', title: 'In Transit', groupPrefix: 'lifecycle.in_transit' },
    { id: 'delivered', title: 'Delivered', groupPrefix: 'lifecycle.delivered' },
  ],
  invoices: [
    { id: 'draft', title: 'Draft', groupPrefix: 'lifecycle.draft' },
    { id: 'pending', title: 'Pending Approval', groupPrefix: 'lifecycle.pending' },
    { id: 'approved', title: 'Approved', groupPrefix: 'lifecycle.approved' },
    { id: 'paid', title: 'Paid', groupPrefix: 'lifecycle.paid' },
  ],
}

/**
 * Simulate API delay for realistic loading states
 */
export const simulateApiDelay = (minMs = 300, maxMs = 800): Promise<void> => {
  const delay = Math.random() * (maxMs - minMs) + minMs
  return new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Simulate occasional API failures for testing error states
 */
export const simulateRandomFailure = (failureRate = 0): boolean => {
  return Math.random() < failureRate
}
