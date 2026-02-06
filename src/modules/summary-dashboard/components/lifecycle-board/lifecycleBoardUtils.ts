import type { IconName } from 'ft-design-system'

export const thinBorder = 'calc(var(--spacing-x1) / 4) solid var(--border-primary)'

// Group metrics by groupKey for universal sub-section support
export interface MetricGroup {
  groupKey: string
  groupLabel: string | null
  groupOrder: number
  items: any[]
}

export function groupMetrics(metrics: any[]): MetricGroup[] {
  // Filter out summary metrics (groupKey === 'summary') as they're redundant with the header
  const nonZeroMetrics = metrics.filter(m => m.groupKey !== 'summary')

  if (nonZeroMetrics.length === 0) {
    return []
  }

  // Check if any metrics have groupKey
  const hasGrouping = nonZeroMetrics.some(m => m.groupKey)

  if (!hasGrouping) {
    // No grouping - return single ungrouped group
    return [{
      groupKey: 'ungrouped',
      groupLabel: null,
      groupOrder: 0,
      items: nonZeroMetrics
    }]
  }

  // Group by groupKey
  const grouped = new Map<string, MetricGroup>()

  nonZeroMetrics.forEach(metric => {
    const key = metric.groupKey || 'ungrouped'
    const label = metric.groupLabel || null
    const order = metric.groupOrder ?? 999

    if (!grouped.has(key)) {
      grouped.set(key, {
        groupKey: key,
        groupLabel: label,
        groupOrder: order,
        items: []
      })
    }

    grouped.get(key)!.items.push(metric)
  })

  // Convert to array and sort by groupOrder, then by groupLabel/groupKey
  const groups = Array.from(grouped.values()).sort((a, b) => {
    if (a.groupOrder !== b.groupOrder) {
      return a.groupOrder - b.groupOrder
    }
    const aLabel = a.groupLabel || a.groupKey
    const bLabel = b.groupLabel || b.groupKey
    return aLabel.localeCompare(bLabel)
  })

  return groups
}

// Map stage titles to appropriate FT Design System icons
export function getStageIcon(title: string): IconName | undefined {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('vehicle procurement')) return undefined
  if (lowerTitle.includes('en route') || lowerTitle.includes('loading')) return 'arrow-top-right'
  if (lowerTitle.includes('in yard')) return 'arrow-top-right'
  if (lowerTitle.includes('at loading')) return 'plant'
  if (lowerTitle.includes('booked')) return 'arrow-top-right'
  if (lowerTitle.includes('picked up')) return 'plant'
  if (lowerTitle.includes('in transit')) return 'road'
  if (lowerTitle.includes('at unloading')) return 'warehouse'
  if (lowerTitle.includes('delivered')) return 'check'
  if (lowerTitle.includes('planned')) return 'planning'
  if (lowerTitle.includes('completed')) return 'check'
  if (lowerTitle.includes('closed')) return 'check'
  return undefined
}

// Get description/tooltip for each stage
export function getStageDescription(title: string): string {
  const lowerTitle = title.toLowerCase()

  // Vehicle/Indent stages
  if (lowerTitle.includes('vehicle procurement')) return 'Vehicles requested and awaiting assignment'
  if (lowerTitle.includes('planned')) return 'Scheduled but not yet started'
  if (lowerTitle.includes('en route') && lowerTitle.includes('loading')) return 'Vehicle traveling to pickup location'
  if (lowerTitle.includes('in yard')) return 'Vehicle waiting at yard or depot'
  if (lowerTitle.includes('at loading')) return 'Vehicle at loading point, ready for pickup'

  // Journey/Shipment stages
  if (lowerTitle.includes('booked')) return 'Order confirmed and scheduled for transport'
  if (lowerTitle.includes('picked up')) return 'Cargo collected from origin'
  if (lowerTitle.includes('in transit')) return 'Currently being transported to destination'
  if (lowerTitle.includes('at unloading')) return 'Arrived at destination, awaiting unloading'
  if (lowerTitle.includes('delivered')) return 'Successfully delivered to final destination'

  // Generic stages
  if (lowerTitle.includes('new')) return 'Newly created, awaiting processing'
  if (lowerTitle.includes('processing')) return 'Currently being processed'
  if (lowerTitle.includes('dispatched')) return 'Dispatched from origin location'
  if (lowerTitle.includes('completed')) return 'Successfully completed'
  if (lowerTitle.includes('closed')) return 'Closed and finalized'
  if (lowerTitle.includes('cancelled')) return 'Cancelled and no longer active'

  // Default
  return `Current status: ${title}`
}
