import { useCallback, useEffect, useState, useRef } from 'react'
import { Icon, Input, InputField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Typography, Row, Col, DatePicker } from 'ft-design-system'
import type { GlobalFilters } from '../types/metrics'
import { useConsignors } from '../hooks/useConsignors'
import { TokenManager } from '../auth/tokenManager'

interface TitleBarProps {
  globalFilters: GlobalFilters
  onFiltersChange: (filters: Partial<GlobalFilters>) => void
}

// Date calculation helper functions
const getLast3Months = (): { start: Date; end: Date } => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  return { start, end }
}

const getLast1Month = (): { start: Date; end: Date } => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

const getLast2Weeks = (): { start: Date; end: Date } => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 14)
  return { start, end }
}

const getNext2Weeks = (): { start: Date; end: Date } => {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 14)
  return { start, end }
}

export default function TitleBar({ globalFilters, onFiltersChange }: TitleBarProps) {
  const { consignors, isLoading: consignorsLoading } = useConsignors()
  const [localDateRange, setLocalDateRange] = useState(globalFilters.dateRange)
  const injectedOptionsRef = useRef<Set<HTMLElement>>(new Set())
  const observerRef = useRef<MutationObserver | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInteractingRef = useRef<boolean>(false)

  useEffect(() => {
    setLocalDateRange(globalFilters.dateRange)
  }, [globalFilters.dateRange.start, globalFilters.dateRange.end])

  const handleLocationChange = (value: string | number) => {
    const normalizedValue = String(value ?? '')
    const selectedConsignor = consignors.find(c => c.value === normalizedValue)
    const currentContext = TokenManager.getUserContext()

    if (currentContext) {
      const updatedContext = {
        ...currentContext,
        branchId: normalizedValue || ''
      }
      TokenManager.setUserContext(updatedContext)
    }

    onFiltersChange({
      locationId: normalizedValue || undefined,
      locationName: selectedConsignor?.label || 'All Locations'
    })
  }

  const updateDateRange = useCallback(
    (next: { start?: Date; end?: Date }) => {
      setLocalDateRange((prev) => {
        const updated = {
          start: next.start ?? prev.start,
          end: next.end ?? prev.end
        }
        onFiltersChange({ dateRange: updated })
        return updated
      })
    },
    [onFiltersChange]
  )

  const parseDateValue = (value: string): Date | null => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const handleStartDateChange = (value: string) => {
    const newStartDate = parseDateValue(value)
    if (!newStartDate) return
    updateDateRange({ start: newStartDate })
  }

  const handleEndDateChange = (value: string) => {
    const newEndDate = parseDateValue(value)
    if (!newEndDate) return
    updateDateRange({ end: newEndDate })
  }

  // Inject custom date range options into Calendar dropdown
  // Also intercept built-in options to standardize behavior: both require Apply button
  useEffect(() => {
    const injectCustomOptions = () => {
      // Find the portal container
      const portalContainer = document.getElementById('datepicker-portal-container')
      if (!portalContainer) return

      // Find the options container - looking for the div with flex-col and border-r classes
      // Based on DOM path: div#datepicker-portal-container > div.fixed > div > div.flex > div.flex.flex-col.border-r
      // Try multiple selector strategies to find the container
      let optionsContainer = portalContainer.querySelector(
        'div.flex.flex-col.border-r'
      ) as HTMLElement | null

      // If not found, try finding by structure - look for divs with flex-col that contain text like "This week"
      if (!optionsContainer) {
        const allFlexCols = portalContainer.querySelectorAll('div.flex.flex-col')
        for (const element of Array.from(allFlexCols)) {
          const text = element.textContent || ''
          if (text.includes('This week') || text.includes('Next week') || text.includes('This month')) {
            optionsContainer = element as HTMLElement
            break
          }
        }
      }

      if (!optionsContainer) return

      // Map built-in option labels to date calculation functions
      // This allows us to handle built-in options the same way as custom options
      const getBuiltInDateRange = (label: string): { start: Date; end: Date } | null => {
        const normalizedLabel = label.trim().toLowerCase()
        const today = new Date()
        
        if (normalizedLabel === 'today') {
          return { start: today, end: today }
        }
        if (normalizedLabel.includes('this week')) {
          const start = new Date(today)
          const day = start.getDay()
          const diff = start.getDate() - day // Sunday = 0
          start.setDate(diff)
          return { start, end: today }
        }
        if (normalizedLabel.includes('last 7 days') || normalizedLabel.includes('last week')) {
          const end = new Date(today)
          const start = new Date(today)
          start.setDate(start.getDate() - 7)
          return { start, end }
        }
        if (normalizedLabel.includes('next week')) {
          const start = new Date(today)
          const end = new Date(today)
          start.setDate(start.getDate() + 7 - start.getDay())
          end.setDate(start.getDate() + 6)
          return { start, end }
        }
        if (normalizedLabel.includes('this month')) {
          const start = new Date(today.getFullYear(), today.getMonth(), 1)
          return { start, end: today }
        }
        if (normalizedLabel.includes('last month')) {
          const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          const end = new Date(today.getFullYear(), today.getMonth(), 0)
          return { start, end }
        }
        if (normalizedLabel.includes('last 30 days')) {
          const end = new Date(today)
          const start = new Date(today)
          start.setDate(start.getDate() - 30)
          return { start, end }
        }
        
        return null
      }

      // Intercept built-in option clicks to prevent auto-closing dropdown
      // Standardize behavior: all options (built-in and custom) require Apply button
      const interceptBuiltInOptions = () => {
        const builtInButtons = optionsContainer.querySelectorAll('button:not([data-custom-date-option])')
        builtInButtons.forEach((button) => {
          // Skip if already intercepted
          if ((button as HTMLElement).hasAttribute('data-intercepted')) {
            return
          }
          
          (button as HTMLElement).setAttribute('data-intercepted', 'true')
          
          // Intercept click event to handle it the same way as custom options
          const interceptHandler = (event: Event) => {
            const mouseEvent = event as MouseEvent
            mouseEvent.preventDefault()
            mouseEvent.stopImmediatePropagation()
            
            const optionText = (button as HTMLElement).textContent?.trim() || ''
            console.log('Built-in date option clicked (intercepted):', optionText)
            
            // Get date range for this built-in option
            const dateRange = getBuiltInDateRange(optionText)
            if (!dateRange) {
              console.warn('Unknown built-in date option:', optionText)
              return
            }
            
            // Format dates as YYYY-MM-DD strings for the DatePicker input fields
            const formatDateForInput = (date: Date) => {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }
            
            // Update date range via the DatePicker's onChange handlers
            // This ensures the DatePicker's internal state is updated immediately
            // But dropdown stays open (user must click Apply)
            handleStartDateChange(formatDateForInput(dateRange.start))
            handleEndDateChange(formatDateForInput(dateRange.end))
          }
          
          // Add handler in capture phase to intercept before DatePicker's handler
          button.addEventListener('click', interceptHandler, true)
        })
      }
      
      // Intercept built-in options
      interceptBuiltInOptions()

      // Get all children to check current order
      const allChildren = Array.from(optionsContainer.children)
      const last2WeeksElement = allChildren.find(
        (child) => (child as HTMLElement).getAttribute('data-option-label') === 'Last 2 weeks'
      ) as HTMLElement | undefined
      const last1MonthElement = allChildren.find(
        (child) => (child as HTMLElement).getAttribute('data-option-label') === 'Last 1 month'
      ) as HTMLElement | undefined
      const last3MonthsElement = allChildren.find(
        (child) => (child as HTMLElement).getAttribute('data-option-label') === 'Last 3 months'
      ) as HTMLElement | undefined
      const next2WeeksElement = allChildren.find(
        (child) => (child as HTMLElement).getAttribute('data-option-label') === 'Next 2 weeks'
      ) as HTMLElement | undefined

      // Don't re-inject if user is interacting with the dropdown
      if (isInteractingRef.current) {
        return
      }

      // If all 4 custom options exist and are in correct positions, skip reordering
      if (last2WeeksElement && last1MonthElement && last3MonthsElement && next2WeeksElement) {
        const last2WeeksIndex = allChildren.indexOf(last2WeeksElement)
        const last1MonthIndex = allChildren.indexOf(last1MonthElement)
        const last3MonthsIndex = allChildren.indexOf(last3MonthsElement)
        const next2WeeksIndex = allChildren.indexOf(next2WeeksElement)
        
        // Check if options are in correct positions: 
        // Last 2 weeks (1), Last 3 months (2), Last 1 month (3), Next 2 weeks (5)
        // Verify key positions: "Last 3 months" at index 2, "Next 2 weeks" at index 5
        if (last3MonthsIndex === 2 && next2WeeksIndex === 5) {
          // Already in correct order, just ensure they're all tracked
          if (!injectedOptionsRef.current.has(last2WeeksElement)) {
            injectedOptionsRef.current.add(last2WeeksElement)
          }
          if (!injectedOptionsRef.current.has(last1MonthElement)) {
            injectedOptionsRef.current.add(last1MonthElement)
          }
          if (!injectedOptionsRef.current.has(last3MonthsElement)) {
            injectedOptionsRef.current.add(last3MonthsElement)
          }
          if (!injectedOptionsRef.current.has(next2WeeksElement)) {
            injectedOptionsRef.current.add(next2WeeksElement)
          }
          return
        }
      }

      // Remove existing custom options to allow reordering
      const existingCustomOptions = optionsContainer.querySelectorAll('[data-custom-date-option]')
      existingCustomOptions.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }
        injectedOptionsRef.current.delete(element as HTMLElement)
      })

      // Helper function to create a custom option element styled as a DropdownItem (button)
      const createOptionElement = (option: { label: string; getDates: () => { start: Date; end: Date } }) => {
        // Use button element to match DropdownItem component styling
        const optionElement = document.createElement('button')
        optionElement.setAttribute('data-custom-date-option', 'true')
        optionElement.setAttribute('data-option-label', option.label)
        optionElement.type = 'button'
        
        // Match the styling of existing DatePicker options (DropdownItem components)
        // Based on DOM inspection: button.text-left.px-[var(--spacing-x3)].py-[var(--spacing-x3)].leading-[1.4]...
        optionElement.className = 'text-left px-[var(--spacing-x3)] py-[var(--spacing-x3)] leading-[1.4] transition-colors rounded-[var(--radius-md)] bg-[var(--bg-primary)] text-[var(--color-primary)] hover:bg-[var(--border-secondary)] text-sm-rem'
        optionElement.style.cssText = `
          width: 100%;
          border: none;
          background: var(--bg-primary);
          color: var(--color-primary);
          cursor: pointer;
          user-select: none;
          text-align: left;
          pointer-events: auto;
          z-index: 10;
          position: relative;
        `
        optionElement.setAttribute('tabindex', '0')
        optionElement.setAttribute('role', 'button')
        optionElement.setAttribute('aria-label', option.label)
        
        optionElement.textContent = option.label

        // Add click handler with proper event handling
        const handleClick = (event: Event) => {
          const mouseEvent = event as MouseEvent
          mouseEvent.preventDefault()
          mouseEvent.stopImmediatePropagation()
          
          console.log('Custom date option clicked:', option.label) // Debug log
          
          try {
            const { start, end } = option.getDates()
            
            // Format dates as YYYY-MM-DD strings for the DatePicker input fields
            const formatDateForInput = (date: Date) => {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              return `${year}-${month}-${day}`
            }
            
            // Update date range via the DatePicker's onChange handlers
            // This ensures the DatePicker's internal state is updated immediately
            handleStartDateChange(formatDateForInput(start))
            handleEndDateChange(formatDateForInput(end))
            
            // Don't close the dropdown - let the user click Apply button to confirm and close
            // The DatePicker component will handle its own closing logic when Apply is clicked
          } catch (error) {
            console.error('Error handling custom date option click:', error)
          }
        }
        
        // Add hover handlers to prevent re-injection during interaction
        optionElement.addEventListener('mouseenter', () => {
          isInteractingRef.current = true
        }, true)
        
        optionElement.addEventListener('mouseleave', () => {
          // Delay resetting to allow click to complete
          setTimeout(() => {
            isInteractingRef.current = false
          }, 200)
        }, true)
        
        // Add multiple event handlers to ensure clicks are captured
        optionElement.addEventListener('click', handleClick, true) // Capture phase
        optionElement.addEventListener('click', handleClick, false) // Bubble phase
        
        // Handle mousedown to prevent DatePicker from intercepting
        optionElement.addEventListener('mousedown', (event) => {
          event.stopPropagation()
          isInteractingRef.current = true
        }, true)
        
        // Reset interaction flag after click completes
        optionElement.addEventListener('mouseup', () => {
          setTimeout(() => {
            isInteractingRef.current = false
          }, 300)
        }, true)
        
        // Handle keyboard for accessibility
        optionElement.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleClick(event)
          }
        })

        return optionElement
      }

      // Get all existing children (default presets only, excluding any custom options)
      const existingChildren = Array.from(optionsContainer.children).filter(
        (child) => !(child as HTMLElement).hasAttribute('data-custom-date-option')
      )
      
      // Insert all 4 custom options in order:
      // Order: Last 2 weeks (1), Last 1 month (2), Last 3 months (3), Next 2 weeks (5)
      
      // Insert "Last 2 weeks" at index 1
      if (existingChildren.length >= 1) {
        const last2WeeksElement = createOptionElement({ label: 'Last 2 weeks', getDates: getLast2Weeks })
        optionsContainer.insertBefore(last2WeeksElement, existingChildren[1] || null)
        injectedOptionsRef.current.add(last2WeeksElement)
      }
      
      // Refresh to get current state (including "Last 2 weeks")
      let currentChildren = Array.from(optionsContainer.children).filter(
        (child) => {
          const hasCustom = (child as HTMLElement).hasAttribute('data-custom-date-option')
          if (!hasCustom) return true
          return (child as HTMLElement).getAttribute('data-option-label') === 'Last 2 weeks'
        }
      )
      
      // Insert "Last 1 month" at index 2 (before Last 3 months)
      if (currentChildren.length >= 2) {
        const last1MonthElement = createOptionElement({ label: 'Last 1 month', getDates: getLast1Month })
        optionsContainer.insertBefore(last1MonthElement, currentChildren[2] || null)
        injectedOptionsRef.current.add(last1MonthElement)
      }
      
      // Refresh again
      currentChildren = Array.from(optionsContainer.children).filter(
        (child) => {
          const hasCustom = (child as HTMLElement).hasAttribute('data-custom-date-option')
          if (!hasCustom) return true
          const label = (child as HTMLElement).getAttribute('data-option-label')
          return ['Last 2 weeks', 'Last 1 month'].includes(label || '')
        }
      )
      
      // Insert "Last 3 months" after "Last 1 month" (at index 3)
      if (currentChildren.length >= 3) {
        const last3MonthsElement = createOptionElement({ label: 'Last 3 months', getDates: getLast3Months })
        optionsContainer.insertBefore(last3MonthsElement, currentChildren[3] || null)
        injectedOptionsRef.current.add(last3MonthsElement)
      }
      
      // Insert "Next 2 weeks" at index 5 (as per user requirement)
      // Use original existingChildren reference to find position
      if (existingChildren.length >= 5) {
        const next2WeeksElement = createOptionElement({ label: 'Next 2 weeks', getDates: getNext2Weeks })
        // Insert before the element that was originally at index 4
        const targetElement = existingChildren[4] || null
        optionsContainer.insertBefore(next2WeeksElement, targetElement)
        injectedOptionsRef.current.add(next2WeeksElement)
      }
    }

    // Set up MutationObserver to watch for portal container changes
    const portalContainer = document.getElementById('datepicker-portal-container')
    if (!portalContainer) {
      // If portal doesn't exist yet, try again after a short delay
      const timeoutId = setTimeout(() => {
        injectCustomOptions()
      }, 100)
      return () => clearTimeout(timeoutId)
    }

    // Create observer to watch for changes in the portal container
    // Debounce to avoid interfering with DatePicker interactions
    observerRef.current = new MutationObserver(() => {
      // Don't inject if user is interacting
      if (isInteractingRef.current) {
        return
      }
      // Debounce the injection to avoid interfering with DatePicker clicks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(() => {
        // Double-check interaction state before injecting
        if (!isInteractingRef.current) {
          // This will re-inject custom options and re-intercept built-in options
          injectCustomOptions()
        }
      }, 200)
    })

    observerRef.current.observe(portalContainer, {
      childList: true,
      subtree: true,
    })

    // Initial injection attempt
    injectCustomOptions()

    // Also try injecting periodically in case the observer misses it
    // But only if not interacting
    const intervalId = setInterval(() => {
      if (!isInteractingRef.current) {
        injectCustomOptions()
      }
    }, 1000)

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      clearInterval(intervalId)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
      
      // Remove injected elements
      injectedOptionsRef.current.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })
      injectedOptionsRef.current.clear()
    }
  }, [updateDateRange])

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', padding: 'var(--spacing-x5)', borderBottom: 'calc(var(--spacing-x1) / 4) solid var(--border-secondary)' }}>
      <Row align="middle" justify="space-between" style={{ flexWrap: 'nowrap' }}>
        {/* Title Container */}
        <Col flex="0 0 auto" style={{ width: 'fit-content', display: 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-x3)' }}>
            <Icon name="dashboard" size={24} color="var(--primary)" />
            <Typography variant="title-primary">Summary Dashboard</Typography>
          </div>
        </Col>

        {/* Filter and Search Container */}
        <Col flex="1 1 auto" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-x3)', alignItems: 'center', maxWidth: 'calc(var(--spacing-x24) * 10)', width: '100%' }}>
            {/* Location Filter */}
            <Select
              value={globalFilters.locationId || ''}
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

            {/* Date Range Picker */}
            <div className="date-picker-wrapper" style={{ width: '100%' }}>
              <DatePicker
                range
                startValue={localDateRange.start}
                endValue={localDateRange.end}
                onStartChange={handleStartDateChange}
                onEndChange={handleEndDateChange}
                placeholder="Select date range"
                includeDropdown
              />
            </div>

            {/* Search Input */}
            <div className="search-input-wrapper" style={{ width: '100%', flex: '1 1 auto' }}>
              <Input>
                <InputField
                  type="search"
                  placeholder="Search..."
                  style={{ width: '100%' }}
                  leadingIcon="search"
                  leadingIconSize={16}
                />
              </Input>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  )
}
