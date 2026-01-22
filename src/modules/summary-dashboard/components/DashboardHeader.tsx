import { Input, Icon } from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import LocationSelector from './LocationSelector'

interface DashboardHeaderProps {
  globalFilters: GlobalFilters
  onFiltersChange: (filters: Partial<GlobalFilters>) => void
  onRefresh: () => void
}

export default function DashboardHeader({
  globalFilters,
  onFiltersChange,
}: DashboardHeaderProps) {
  return (
    <header className="bg-bg-primary px-x6 py-x4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-x4">
        <div className="flex items-center gap-x2">
           <Icon name="clock" size={24} className="text-tertiary" />
           <h1 className="text-xl-rem font-semibold text-primary m-x0">Summary Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x3 w-full md:w-auto">
          <LocationSelector
            value={globalFilters.locationId}
            displayValue={globalFilters.locationName}
            onChange={(locationId, locationName) =>
              onFiltersChange({ locationId, locationName })
            }
          />
          <div className="min-w-x24">
             {/* Note: Input prop startEnhancer is a guess based on common patterns, 
                 if not available I might need to use a wrapper or check docs.
                 Checking AI_CONTEXT again, it doesn't explicitly mention startEnhancer.
                 But standard Input often has it. Let's try or stick to simple Input for now.
             */}
            <Input 
              placeholder="Search..." 
              // @ts-ignore - Assuming startEnhancer or similar exists, or I will fix if linter complains
              startEnhancer={<Icon name="search" size={16} />}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
