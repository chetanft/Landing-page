import type { OrderStatusCountsResponse } from './realTypes'

/**
 * Computed metrics from API data
 * Transforms order status counts into dashboard metrics
 */
export const computeMetricsFromApiData = (orderCounts: OrderStatusCountsResponse['data']['counts']) => {
  const total = Object.values(orderCounts).reduce((sum, count) => sum + (count ?? 0), 0)
  const validationCount = (orderCounts.VALIDATION_IN_PROGRESS ?? 0)
    + (orderCounts.VALIDATION_SUCCESS ?? 0)
    + (orderCounts.VALIDATION_FAILURE ?? 0)
  const active = orderCounts.UNPLANNED
    + orderCounts.IN_PROGRESS
    + orderCounts.PLANNED
    + orderCounts.PARTIALLY_PLANNED
    + validationCount
  const completed = orderCounts.DELIVERED + orderCounts.PARTIALLY_DELIVERED
  const inTransit = orderCounts.DISPATCHED
  const issues = orderCounts.FAILED + orderCounts.DELETED + (orderCounts.PLANNING_CORE_FAILED ?? 0)

  return {
    totalOrders: total,
    activeOrders: active,
    completedOrders: completed,
    inTransitOrders: inTransit,
    issueOrders: issues,
    plannedOrders: orderCounts.PLANNED,
    unplannedOrders: orderCounts.UNPLANNED,
    inProgressOrders: orderCounts.IN_PROGRESS,
    partiallyPlannedOrders: orderCounts.PARTIALLY_PLANNED,
    dispatchedOrders: orderCounts.DISPATCHED,
    deliveredOrders: orderCounts.DELIVERED,
    partiallyDeliveredOrders: orderCounts.PARTIALLY_DELIVERED,
    failedOrders: orderCounts.FAILED,
    deletedOrders: orderCounts.DELETED
  }
}

export type ComputedMetrics = ReturnType<typeof computeMetricsFromApiData>
