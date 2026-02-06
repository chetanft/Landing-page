import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'ft-design-system'
import { useConsignors } from '../../hooks/useConsignors'
import { TokenManager } from '../../auth/tokenManager'

interface LocationFilterProps {
  value: string | undefined
  onChange: (locationId: string | undefined, locationName: string) => void
}

export default function LocationFilter({ value, onChange }: LocationFilterProps) {
  const { consignors, isLoading: consignorsLoading } = useConsignors()

  const handleLocationChange = (selectedValue: string | number) => {
    const normalizedValue = String(selectedValue ?? '')
    const selectedConsignor = consignors.find(c => c.value === normalizedValue)
    const currentContext = TokenManager.getUserContext()

    if (currentContext) {
      const updatedContext = {
        ...currentContext,
        branchId: normalizedValue || ''
      }
      TokenManager.setUserContext(updatedContext)
    }

    onChange(
      normalizedValue || undefined,
      selectedConsignor?.label || 'All Locations'
    )
  }

  return (
    <Select
      value={value || ''}
      onValueChange={handleLocationChange}
    >
      <SelectTrigger className="min-w-[var(--spacing-x24)]" style={{ width: '100%' }}>
        <SelectValue placeholder={consignorsLoading ? 'Loading...' : 'All Locations'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">All Locations</SelectItem>
        {consignors.map((consignor) => (
          <SelectItem key={consignor.value} value={consignor.value}>
            {consignor.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
