import type { GlobalFilters } from '../../types/metrics'

// Re-export for convenience
export type { GlobalFilters }

// Shipments API response types
export interface ShipmentMilestoneSummary {
  REGISTERED?: number
  BOOKED?: number
  PICKED_UP?: number
  IN_TRANSIT?: number
  OUT_FOR_DELIVERY?: number
  DELIVERED?: number
  UNDELIVERED?: number
  RTO?: number
  EXCEPTIONS?: number
  AWAITING_UPDATES?: number
  NO_UPDATES?: number
}

export interface ShipmentSummaryApiResponse {
  success: boolean
  data: {
    bucket_summary: Record<string, any>
    milestone_summary: ShipmentMilestoneSummary
  }
}

export interface ShipmentSpecificBucketSummary {
  // For ACTIVE bucket
  ofd_summary?: {
    today: string
    tomorrow: string
  }
  delayed_summary?: {
    '1 day': string
    '2-4 days': string
    '4+ days': string
  }
  // For other buckets (legacy structure)
  transit_status_summary?: {
    indeterminate: number
    delayed: number
    on_time: number
  }
  pod_summary?: {
    pod_available: string
    pod_pending: string
  }
  priority_summary?: {
    high: number
    standard: number
    low: number
  }
}

export interface ShipmentListApiResponse {
  success: boolean
  data: {
    shipments: Array<{
      fteid: string
    }>
    pagination?: {
      totalItems?: number
      total?: number
      total_count?: number
    }
  }
}

export interface ShipmentSpecificSummaryApiResponse {
  success: boolean
  data: ShipmentSpecificBucketSummary
}

export interface OrdersBucketSummary {
  SERVICEABLE: number
  UNSERVICEABLE: number
  PROCESSING: number
  BOOKED: number
  FAILED: number
  CANCELLED: number
}

// Map shipment milestones to lifecycle stages
export const SHIPMENT_MILESTONE_MAPPING = {
  REGISTERED: {
    title: 'Registered',
    id: 'shipment-registered'
  },
  BOOKED: {
    title: 'Booked',
    id: 'shipment-booked'
  },
  PICKED_UP: {
    title: 'Picked Up',
    id: 'shipment-picked-up'
  },
  IN_TRANSIT: {
    title: 'In Transit',
    id: 'shipment-in-transit'
  },
  OUT_FOR_DELIVERY: {
    title: 'Out for Delivery',
    id: 'shipment-out-for-delivery'
  },
  DELIVERED: {
    title: 'Delivered',
    id: 'shipment-delivered'
  },
  UNDELIVERED: {
    title: 'Undelivered',
    id: 'shipment-undelivered'
  },
  RTO: {
    title: 'RTO',
    id: 'shipment-rto'
  },
  EXCEPTIONS: {
    title: 'Exceptions',
    id: 'shipment-exceptions'
  },
  AWAITING_UPDATES: {
    title: 'Awaiting Updates',
    id: 'shipment-awaiting-updates'
  },
  NO_UPDATES: {
    title: 'No Updates',
    id: 'shipment-no-updates'
  }
} as const
