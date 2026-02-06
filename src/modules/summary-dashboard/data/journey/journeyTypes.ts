import type { TabData, MetricData, LifecycleStage, GlobalFilters } from '../../types/metrics'

// Re-export types that are used externally
export type { TabData, MetricData, LifecycleStage, GlobalFilters }

// API response types based on the provided structure
export interface JourneyApiMilestone {
  count: number
  alerts: {
    count?: number
    long_stoppage?: { count: number }
    eway_bill?: { count: number }
    route_deviation?: { count: number }
  }
  analytics: {
    count?: number
    delay_in_minutes?: {
      count: number
      time_bucket: {
        '0-6h': number
        '6-12h': number
        '12h': number
      }
    }
    expected_arrival?: {
      count: number
      time_bucket: {
        '0-12h': number
        '12h': number
      }
    }
    epod_status?: {
      count: number
      time_bucket: {
        pending_submission: number
        approval_pending: number
        verified_as_unclean: number
        verified_as_clean: number
      }
    }
  }
}

export type JourneyMilestoneKey =
  | 'PLANNED'
  | 'BEFORE_ORIGIN'
  | 'AT_ORIGIN'
  | 'IN_TRANSIT'
  | 'AT_DESTINATION'
  | 'IN_RETURN'
  | 'AFTER_DESTINATION'
  | 'CLOSED'

export type JourneyMilestones = Partial<Record<JourneyMilestoneKey, JourneyApiMilestone>>

export interface JourneyApiResponse {
  success: boolean
  data: {
    milestone: JourneyMilestones
  }
}

export interface JourneySearchItem {
  journey_status?: string
  journey_fteid?: string
  pickups?: unknown[]
  drops?: unknown[]
  [key: string]: unknown
}

export interface JourneySearchResponse {
  success: boolean
  data?: {
    journey_data?: JourneySearchItem[]
    pagination?: {
      totalItems?: number
      total?: number
      total_count?: number
      total_records?: number
    }
  }
  pagination?: {
    totalItems?: number
    total?: number
    total_count?: number
    total_records?: number
  }
}

export interface JourneySearchSummary {
  status: JourneyMilestoneKey
  total: number
  atDrop: number
  atPickup: number
  atDropPickup: number
  isComplete: boolean
}

export interface EpodListApiResponse {
  success?: boolean
  data?: {
    epods?: unknown[]
    pagination?: {
      totalItems?: number
      total?: number
      total_count?: number
      total_records?: number
    }
    totalItems?: number
    total?: number
    total_count?: number
    total_records?: number
  }
  pagination?: {
    totalItems?: number
    total?: number
    total_count?: number
    total_records?: number
  }
}

export interface EpodSummary {
  awaitingApproval: number
  pendingSubmission: number
  verifiedRejected: number
  approved: number
  deliveredClean: number
  deliveredUnclean: number
}

export interface EpodSummaryResult {
  summary: EpodSummary
  isMissing: boolean
}

export interface JourneyLoadInvoice {
  so_number?: string
  do_number?: string
  associated_so_numbers?: string[] | null
  associated_do_numbers?: string[] | null
}

export interface JourneyLoad {
  load_id: number | string
  status?: string
  from?: {
    label?: string
    address?: string
  }
  to?: {
    label?: string
    address?: string
  }
  invoices?: JourneyLoadInvoice[]
  eta?: string | null
  sta?: string | null
}

export interface JourneyLoadsResponse {
  success: boolean
  data?: {
    loads?: JourneyLoad[]
  }
}

// Map API milestones to lifecycle stages
export const MILESTONE_TO_STAGE_MAPPING = {
  BEFORE_ORIGIN: {
    title: 'En route to loading',
    id: 'en-route-loading'
  },
  AT_ORIGIN: {
    title: 'At Loading',
    id: 'at-loading'
  },
  IN_TRANSIT: {
    title: 'In Transit',
    id: 'in-transit'
  },
  AT_DESTINATION: {
    title: 'At Destination',
    id: 'at-destination'
  },
  IN_RETURN: {
    title: 'In Return',
    id: 'return-journey'
  },
  AFTER_DESTINATION: {
    title: 'Delivered',
    id: 'delivered'
  },
  CLOSED: {
    title: 'Delivered',
    id: 'delivered'
  }
} as const

// Map point interface for journey locations
export interface JourneyMapPoint {
  journey_fteid: string
  lat: number
  lng: number
  journey_status: string
  isDelayed?: boolean
  eta?: string
  sta?: string
  vehicle_number?: string
  tracking_health?: string
}

export interface JourneyDoRow {
  journeyId: string
  journeyStatus: JourneyMilestoneKey
  doNumber: string
  soNumbers: string[]
  consignorName: string
  consigneeName: string
  route: string
  tripType: string
  stage: string
  milestone: string
  status: string
  relatedIdType: string
  relatedId: string
  deliveryStatus: string
  dispatchDate?: string
}
