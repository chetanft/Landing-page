import { useMemo } from 'react'
import { BarChart } from 'ft-design-system'
import type { AlertOptionId, TransporterAlertBreakdown } from '../../hooks/useDelayedJourneysAnalytics'
import { buildChartData, buildChartOptions } from './chartDataUtils'

interface TransporterAlertBarChartProps {
  transporters: TransporterAlertBreakdown[]
  selectedAlert: AlertOptionId
}

export default function TransporterAlertBarChart({
  transporters,
  selectedAlert
}: TransporterAlertBarChartProps) {
  const isStacked = false

  const data = useMemo(
    () => buildChartData(transporters, selectedAlert),
    [transporters, selectedAlert]
  )

  const options = useMemo(
    () => buildChartOptions(isStacked),
    [isStacked]
  )

  if (transporters.length === 0) {
    return null
  }

  return (
    <div style={{ height: 220, width: '100%' }}>
      <BarChart
        data={data}
        options={options}
        stacked={isStacked}
        height={220}
        borderRadius={4}
      />
    </div>
  )
}
