import { useState, useRef, useEffect } from 'react'
import { Button } from 'ft-design-system'

interface DateRange {
  start: Date
  end: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (dateRange: DateRange) => void
}

const PRESETS = [
  { label: 'Today', getDates: () => ({ start: new Date(), end: new Date() }) },
  {
    label: 'Last 7 days',
    getDates: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return { start, end }
    },
  },
  {
    label: 'Last 30 days',
    getDates: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return { start, end }
    },
  },
  {
    label: 'This month',
    getDates: () => {
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      return { start, end }
    },
  },
  {
    label: 'Last month',
    getDates: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start, end }
    },
  },
]

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePresetSelect = (preset: (typeof PRESETS)[number]) => {
    onChange(preset.getDates())
    setIsOpen(false)
  }

  const displayValue = `${formatDate(value.start)} - ${formatDate(value.end)}`

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-x2 px-x3 py-x2 bg-bg-primary border border-border-primary rounded-md cursor-pointer hover:bg-bg-secondary min-w-x24"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-sm-rem">📅</span>
        <span className="flex-1 text-left text-sm-rem text-primary truncate">{displayValue}</span>
        <span className="text-xs-rem text-tertiary">{isOpen ? '▲' : '▼'}</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-x1 left-x0 bg-bg-primary border border-border-primary rounded-lg shadow-lg z-50 min-w-x24 p-x2">
          <div className="flex flex-col gap-x1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="w-full px-x3 py-x3 text-sm-rem text-primary bg-transparent border-0 rounded cursor-pointer text-left transition-colors hover:bg-bg-secondary focus:outline-none focus:ring focus:ring-focus-ring"
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
