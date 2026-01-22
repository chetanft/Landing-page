import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import type { TabId } from '../types/metrics'
import type { WebhookEvent } from '../types/api'

/**
 * Map entity types to their corresponding tabs
 */
const ENTITY_TO_TAB: Record<string, TabId> = {
  journey: 'journeys',
  order: 'orders',
  shipment: 'shipments',
  invoice: 'invoices',
}

/**
 * Webhook event types that should trigger metric refresh
 */
const REFRESH_EVENTS = [
  'journey.status.changed',
  'journey.alert.created',
  'shipment.status.changed',
  'invoice.status.changed',
  'order.status.changed',
]

/**
 * Hook to handle webhook events and invalidate relevant queries
 * Replace the mock WebSocket connection with actual implementation
 */
export const useDashboardWebhooks = () => {
  const queryClient = useQueryClient()

  const handleWebhookEvent = useCallback(
    (event: WebhookEvent) => {
      const tab = ENTITY_TO_TAB[event.entityType]
      if (tab) {
        // Invalidate all queries for this tab
        queryClient.invalidateQueries({
          queryKey: ['metrics', tab],
        })
      }
    },
    [queryClient]
  )

  useEffect(() => {
    // Mock WebSocket connection - replace with actual implementation
    // Example:
    // const ws = new WebSocket('wss://api.example.com/webhooks')
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   if (REFRESH_EVENTS.includes(data.type)) {
    //     handleWebhookEvent(data.payload)
    //   }
    // }
    // return () => ws.close()

    // For now, we just log that webhooks would be connected
    console.log('[Webhooks] Ready to connect. Supported events:', REFRESH_EVENTS)

    return () => {
      console.log('[Webhooks] Disconnected')
    }
  }, [handleWebhookEvent])

  return { handleWebhookEvent }
}

/**
 * Manual trigger for testing webhook handling
 */
export const simulateWebhookEvent = (
  queryClient: ReturnType<typeof useQueryClient>,
  entityType: WebhookEvent['entityType'],
  _status: string
) => {
  const tab = ENTITY_TO_TAB[entityType]
  if (tab) {
    queryClient.invalidateQueries({
      queryKey: ['metrics', tab],
    })
  }
}
