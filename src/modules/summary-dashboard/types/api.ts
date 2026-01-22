export interface ApiCountResponse {
  count: number
  lastUpdated?: string
}

export interface ApiBatchCountRequest {
  metrics: {
    metricId: string
    endpoint: string
    params: Record<string, unknown>
  }[]
}

export interface ApiBatchCountResponse {
  results: {
    metricId: string
    count: number
    error?: string
  }[]
}

export interface WebhookEvent {
  entityId: string
  entityType: 'journey' | 'order' | 'shipment' | 'invoice'
  status: string
  timestamp: string
  locationId?: string
}
