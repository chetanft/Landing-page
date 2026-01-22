import { useState, useRef, useEffect } from 'react'
import { Button } from 'ft-design-system'
import { useCompanyHierarchy, useUserSettings } from '../hooks/useRealApiData'

interface LocationSelectorProps {
  value?: string
  displayValue?: string
  onChange: (locationId: string | undefined, locationName: string) => void
}

interface BranchOption {
  id: string | undefined
  name: string
  shortCode?: string
  isCompany?: boolean
}

export default function LocationSelector({
  value,
  displayValue = 'All Locations',
  onChange,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: hierarchyData, isLoading: hierarchyLoading } = useCompanyHierarchy()
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings()

  // Build locations list from API data
  const locations: BranchOption[] = [
    { id: undefined, name: 'All Locations' }
  ]

  if (hierarchyData?.data?.total_branches) {
    // Add company first
    const company = hierarchyData.data.total_branches.find(branch => !branch.short_code)
    if (company) {
      locations.push({
        id: company.fteid,
        name: company.name,
        isCompany: true
      })
    }

    // Add branches
    const branches = hierarchyData.data.total_branches.filter(branch => branch.short_code)
    branches.forEach(branch => {
      locations.push({
        id: branch.fteid,
        name: branch.name,
        shortCode: branch.short_code
      })
    })
  }

  // Auto-select default branch from user settings
  useEffect(() => {
    if (userSettings?.data?.lastSelectedBranch && !value) {
      const defaultBranch = locations.find(loc => loc.id === userSettings.data.lastSelectedBranch)
      if (defaultBranch) {
        onChange(defaultBranch.id, defaultBranch.name)
      }
    }
  }, [userSettings?.data?.lastSelectedBranch, value, locations, onChange])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (locationId: string | undefined, locationName: string) => {
    onChange(locationId, locationName)
    setIsOpen(false)
  }

  const isLoading = hierarchyLoading || settingsLoading

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-x2 px-x3 py-x2 bg-bg-primary border border-border-primary rounded-md cursor-pointer hover:bg-bg-secondary min-w-x24"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-sm-rem">📍</span>
        <span className="flex-1 text-left text-sm-rem text-primary truncate">
          {isLoading ? 'Loading...' : displayValue}
        </span>
        <span className="text-xs-rem text-tertiary">{isOpen ? '▲' : '▼'}</span>
      </Button>

      {isOpen && !isLoading && (
        <ul className="absolute top-full mt-x1 left-x0 right-x0 bg-bg-primary border border-border-primary rounded-md shadow-lg list-none p-x1 m-x0 z-50 max-h-x24 overflow-y-auto" role="listbox">
          {locations.map((location) => (
            <li
              key={location.id ?? 'all'}
              className={`px-x3 py-x3 text-sm-rem text-primary cursor-pointer rounded hover:bg-bg-secondary ${
                value === location.id ? 'bg-primary-100 text-primary font-medium' : ''
              } ${location.isCompany ? 'border-b border-border-secondary mb-x1 pb-x2' : ''}`}
              role="option"
              aria-selected={value === location.id}
              onClick={() => handleSelect(location.id, location.name)}
            >
              <div className="flex justify-between items-center">
                <span>{location.name}</span>
                {location.shortCode && (
                  <span className="text-xs-rem text-tertiary bg-bg-secondary px-x2 py-x1 rounded">
                    {location.shortCode}
                  </span>
                )}
                {location.isCompany && (
                  <span className="text-xs-rem text-tertiary">Company</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
