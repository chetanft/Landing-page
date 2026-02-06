import type { ChartData, ChartOptions } from 'chart.js'
import type { AlertOptionId, TransporterAlertBreakdown } from '../../hooks/useDelayedJourneysAnalytics'
import { getAlertLabel } from '../../hooks/useDelayedJourneysAnalytics'

// Alert types in display order
const ALERT_TYPES: Exclude<AlertOptionId, 'all'>[] = [
  'long_stoppage',
  'stop_breach',
  'route_deviation',
  'eway_bill',
  'diversion'
]

// Colors that work with Chart.js (hex values, not CSS vars)
const CHART_ALERT_COLORS: Record<Exclude<AlertOptionId, 'all'>, string> = {
  long_stoppage: '#EF4444',  // red-500 (critical)
  stop_breach: '#F59E0B',    // amber-500 (warning)
  route_deviation: '#DC2626', // red-600 (critical)
  eway_bill: '#6366F1',      // indigo-500 (secondary)
  diversion: '#22C55E'       // green-500 (positive)
}

const DEFAULT_BAR_COLOR = '#F59E0B' // amber-500 (warning/delayed)

interface PreparedDisplayData {
  transporter: string
  counts: Record<Exclude<AlertOptionId, 'all'>, number>
  total: number
}

const getMetricValue = (
  item: TransporterAlertBreakdown,
  selectedAlert: AlertOptionId
): number => {
  if (selectedAlert === 'all') {
    return item.total
  }
  return item.counts[selectedAlert]
}

/**
 * Prepare display data: sort by total, limit to top 5, aggregate rest into "Others"
 */
export function prepareDisplayData(
  transporters: TransporterAlertBreakdown[],
  selectedAlert: AlertOptionId
): PreparedDisplayData[] {
  const totals = transporters.map((item) => ({
    ...item,
    total: getMetricValue(item, selectedAlert)
  })).filter((item) => item.total > 0)

  const sorted = [...totals].sort((a, b) => b.total - a.total)
  const existingOthers = sorted.find(item => item.transporter === 'Others')
  const sortedWithoutOthers = sorted.filter(item => item.transporter !== 'Others')
  const top = sortedWithoutOthers.slice(0, 5)
  const rest = sortedWithoutOthers.slice(5)

  const restTotal = rest.reduce((sum, item) => sum + item.total, 0)
  const restCounts = rest.reduce((acc, item) => {
    ALERT_TYPES.forEach((key) => {
      acc[key] += item.counts[key]
    })
    return acc
  }, {
    long_stoppage: 0,
    stop_breach: 0,
    route_deviation: 0,
    eway_bill: 0,
    diversion: 0
  } as Record<Exclude<AlertOptionId, 'all'>, number>)

  const displayTotals: PreparedDisplayData[] = [...top]
  const othersTotal = (existingOthers?.total ?? 0) + restTotal

  if (othersTotal > 0) {
    const othersCounts = {
      long_stoppage: (existingOthers?.counts.long_stoppage ?? 0) + restCounts.long_stoppage,
      stop_breach: (existingOthers?.counts.stop_breach ?? 0) + restCounts.stop_breach,
      route_deviation: (existingOthers?.counts.route_deviation ?? 0) + restCounts.route_deviation,
      eway_bill: (existingOthers?.counts.eway_bill ?? 0) + restCounts.eway_bill,
      diversion: (existingOthers?.counts.diversion ?? 0) + restCounts.diversion
    }
    displayTotals.push({
      transporter: 'Others',
      counts: othersCounts,
      total: othersTotal
    })
  }

  return displayTotals
}

/**
 * Build Chart.js data structure for BarChart
 */
export function buildChartData(
  transporters: TransporterAlertBreakdown[],
  selectedAlert: AlertOptionId
): ChartData<'bar'> {
  const displayData = prepareDisplayData(transporters, selectedAlert)
  const labels = displayData.map(t => t.transporter)

  if (selectedAlert === 'all') {
    // "All" represents delayed journeys, so use transporter delayed totals.
    return {
      labels,
      datasets: [{
        label: 'Delayed Journeys',
        data: displayData.map(t => t.total),
        backgroundColor: DEFAULT_BAR_COLOR,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8
      }]
    }
  }

  // Single alert mode: one dataset
  return {
    labels,
    datasets: [{
      label: getAlertLabel(selectedAlert),
      data: displayData.map(t => t.counts[selectedAlert]),
      backgroundColor: CHART_ALERT_COLORS[selectedAlert] ?? DEFAULT_BAR_COLOR,
      borderRadius: 4,
      barPercentage: 0.7,
      categoryPercentage: 0.8
    }]
  }
}

/**
 * Build Chart.js options for the transporter alert chart
 */
export function buildChartOptions(stacked: boolean): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: stacked,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          padding: 16,
          font: { size: 10 }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 8,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        stacked,
        grid: {
          display: true,
          color: 'rgba(148, 163, 184, 0.15)',
          lineWidth: 1
        },
        border: {
          display: false
        },
        ticks: {
          font: { size: 10 },
          color: 'rgba(100, 116, 139, 1)',
          maxRotation: 0,
          callback: function(_, index) {
            const label = this.getLabelForValue(index)
            // Truncate long names
            return typeof label === 'string' && label.length > 12
              ? label.substring(0, 10) + '...'
              : label
          }
        }
      },
      y: {
        stacked,
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(148, 163, 184, 0.15)',
          lineWidth: 1
        },
        border: {
          display: false
        },
        ticks: {
          font: { size: 10 },
          color: 'rgba(100, 116, 139, 1)',
          stepSize: undefined,
          precision: 0
        }
      }
    }
  }
}
