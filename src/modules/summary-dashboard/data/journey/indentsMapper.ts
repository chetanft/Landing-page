import type { TabData, MetricData, LifecycleStage } from './journeyTypes'
import { MODULE_URLS } from '../../config/moduleNavigation'

// Combine journey data with indents data
export function combineJourneyAndIndentsData(journeyData: TabData, indentsData: any[]): TabData {
  // Create indents stage from the indents API data
  const indentsStage = createIndentsLifecycleStage(indentsData)

  // Add indents stage at the beginning of the lifecycle stages
  const updatedLifecycleStages = [indentsStage, ...journeyData.lifecycleStages]

  // Update quick KPIs to include indents data
  const totalIndents = indentsData.reduce((sum, item) => sum + item.count, 0)
  const activeIndents = indentsData
    .filter(item => ['OPEN', 'SCHEDULED', 'DRAFT'].includes(item.key))
    .reduce((sum, item) => sum + item.count, 0)

  const updatedQuickKPIs: MetricData[] = [
    {
      metricId: 'total-indents',
      label: 'Total Indents',
      count: totalIndents,
      statusType: 'neutral',
      target: { path: MODULE_URLS.indents, defaultFilters: {} }
    },
    {
      metricId: 'active-indents',
      label: 'Active Indents',
      count: activeIndents,
      statusType: 'positive',
      target: { path: MODULE_URLS.indents, defaultFilters: { status: 'active' } }
    },
    ...journeyData.quickKPIs
  ]

  return {
    ...journeyData,
    quickKPIs: updatedQuickKPIs,
    lifecycleStages: updatedLifecycleStages
  }
}

// Create lifecycle stage for indents data
export function createIndentsLifecycleStage(indentsData: any[]): LifecycleStage {
  const metrics: MetricData[] = []
  const exceptions: MetricData[] = []

  const normalizeText = (text?: string) => (text ?? '').trim().toLowerCase()
  const lookup = new Map<string, { count: number; key?: string }>()

  const addItem = (text?: string, key?: string, count?: number) => {
    if (!text) return
    const normalized = normalizeText(text)
    const existing = lookup.get(normalized)
    const nextCount = (existing?.count ?? 0) + (typeof count === 'number' ? count : 0)
    lookup.set(normalized, { count: nextCount, key: existing?.key ?? key })
  }

  indentsData.forEach(item => {
    addItem(item.text, item.key, item.count)
    if (item.child && item.child.length > 0) {
      item.child.forEach((childItem: any) => {
        addItem(childItem.text, childItem.key, childItem.count)
      })
    }
  })

  const makeIndentMetric = (label: string, metricId: string, statusType: MetricData['statusType']): MetricData => {
    const entry = lookup.get(normalizeText(label))
    const count = entry?.count ?? 0
    const isMissing = !entry
    const targetPath = entry?.key ? `/indents/${entry.key.toLowerCase()}` : MODULE_URLS.indents
    return {
      metricId,
      label,
      count,
      statusType,
      target: { path: targetPath, defaultFilters: {} },
      isMissing
    }
  }

  const milestoneMetrics: MetricData[] = [
    makeIndentMetric('Pending Acceptance', 'indents-pending-acceptance', 'warning'),
    makeIndentMetric('In Assignment', 'indents-in-assignment', 'warning'),
    makeIndentMetric('In Reporting', 'indents-in-reporting', 'warning')
  ]

  const exceptionMetrics: MetricData[] = [
    makeIndentMetric('Expired', 'indents-expired', 'critical'),
    makeIndentMetric('Rejected By Transporter', 'indents-rejected-by-transporter', 'critical')
  ]

  const summaryCount = milestoneMetrics.reduce((sum, metric) => sum + metric.count, 0)
  const summaryMissing = milestoneMetrics.every(metric => metric.isMissing)

  metrics.push({
    metricId: 'indents-summary',
    label: 'Total',
    count: summaryCount,
    statusType: 'neutral',
    target: { path: MODULE_URLS.indents, defaultFilters: {} },
    groupKey: 'summary',
    isMissing: summaryMissing
  })
  metrics.push(...milestoneMetrics)
  exceptions.push(...exceptionMetrics)

  return {
    id: 'indents',
    title: 'Vehicle procurement',
    metrics,
    exceptions,
    status: undefined
  }
}
