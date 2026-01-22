export type TabId = 'orders' | 'journeys' | 'shipments' | 'invoices'

export type StatusType = 'neutral' | 'warning' | 'critical' | 'positive'

export interface MetricTarget {
  path: string
  defaultFilters: Record<string, string | string[] | boolean>
}

export interface MetricDefinition {
  metricId: string
  tab: TabId
  title: string
  source: string
  requestParams: Record<string, unknown>
  target: MetricTarget
  statusType?: StatusType
  group?: string
  order?: number
}

export interface MetricData {
  metricId: string
  label: string
  count: number
  statusType: StatusType
  target: MetricTarget
  isLoading?: boolean
  error?: string | null
  groupKey?: string
  groupLabel?: string
  groupOrder?: number
}

export interface LifecycleStage {
  id: string
  title: string
  metrics: MetricData[]
  exceptions?: MetricData[]
  status?: MetricData[]
}

export interface TabData {
  id: TabId
  label: string
  quickKPIs: MetricData[]
  lifecycleStages: LifecycleStage[]
}

export interface GlobalFilters {
  locationId?: string
  locationName?: string
  transporterId?: string
  transporterName?: string
  dateRange: {
    start: Date
    end: Date
  }
  entityType?: string
  priority?: Array<'high' | 'standard' | 'low'>
}
