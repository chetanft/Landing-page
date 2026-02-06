import { useEffect, useRef } from 'react'
import {
  getLast3Months,
  getLast1Month,
  getLast2Weeks,
  getNext2Weeks,
  formatDateForInput,
  getBuiltInDateRange,
  type DateRange
} from './dateRangeUtils'

interface UseDatePickerCustomOptionsProps {
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
}

interface CustomDateOption {
  label: string
  getDates: () => DateRange
}

export function useDatePickerCustomOptions({
  onStartChange,
  onEndChange
}: UseDatePickerCustomOptionsProps) {
  const injectedOptionsRef = useRef<Set<HTMLElement>>(new Set())
  const observerRef = useRef<MutationObserver | null>(null)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInteractingRef = useRef<boolean>(false)

  useEffect(() => {
    const injectCustomOptions = () => {
      // Find the portal container
      const portalContainer = document.getElementById('datepicker-portal-container')
      if (!portalContainer) return

      // Find the options container - looking for the div with flex-col and border-r classes
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

      // Intercept built-in option clicks to prevent auto-closing dropdown
      const interceptBuiltInOptions = () => {
        const builtInButtons = optionsContainer!.querySelectorAll('button:not([data-custom-date-option])')
        builtInButtons.forEach((button) => {
          if ((button as HTMLElement).hasAttribute('data-intercepted')) {
            return
          }

          (button as HTMLElement).setAttribute('data-intercepted', 'true')

          const interceptHandler = (event: Event) => {
            const mouseEvent = event as MouseEvent
            mouseEvent.preventDefault()
            mouseEvent.stopImmediatePropagation()

            const optionText = (button as HTMLElement).textContent?.trim() || ''
            const dateRange = getBuiltInDateRange(optionText)
            if (!dateRange) {
              return
            }

            onStartChange(formatDateForInput(dateRange.start))
            onEndChange(formatDateForInput(dateRange.end))
          }

          button.addEventListener('click', interceptHandler, true)
        })
      }

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
        const last3MonthsIndex = allChildren.indexOf(last3MonthsElement)
        const next2WeeksIndex = allChildren.indexOf(next2WeeksElement)

        if (last3MonthsIndex === 2 && next2WeeksIndex === 5) {
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

      // Helper function to create a custom option element
      const createOptionElement = (option: CustomDateOption) => {
        const optionElement = document.createElement('button')
        optionElement.setAttribute('data-custom-date-option', 'true')
        optionElement.setAttribute('data-option-label', option.label)
        optionElement.type = 'button'

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

        const handleClick = (event: Event) => {
          const mouseEvent = event as MouseEvent
          mouseEvent.preventDefault()
          mouseEvent.stopImmediatePropagation()

          try {
            const { start, end } = option.getDates()
            onStartChange(formatDateForInput(start))
            onEndChange(formatDateForInput(end))
          } catch (error) {
            console.error('Error handling custom date option click:', error)
          }
        }

        optionElement.addEventListener('mouseenter', () => {
          isInteractingRef.current = true
        }, true)

        optionElement.addEventListener('mouseleave', () => {
          setTimeout(() => {
            isInteractingRef.current = false
          }, 200)
        }, true)

        optionElement.addEventListener('click', handleClick, true)
        optionElement.addEventListener('click', handleClick, false)

        optionElement.addEventListener('mousedown', (event) => {
          event.stopPropagation()
          isInteractingRef.current = true
        }, true)

        optionElement.addEventListener('mouseup', () => {
          setTimeout(() => {
            isInteractingRef.current = false
          }, 300)
        }, true)

        optionElement.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleClick(event)
          }
        })

        return optionElement
      }

      // Get all existing children (default presets only)
      const existingChildren = Array.from(optionsContainer.children).filter(
        (child) => !(child as HTMLElement).hasAttribute('data-custom-date-option')
      )

      // Insert "Last 2 weeks" at index 1
      if (existingChildren.length >= 1) {
        const element = createOptionElement({ label: 'Last 2 weeks', getDates: getLast2Weeks })
        optionsContainer.insertBefore(element, existingChildren[1] || null)
        injectedOptionsRef.current.add(element)
      }

      // Refresh to get current state
      let currentChildren = Array.from(optionsContainer.children).filter(
        (child) => {
          const hasCustom = (child as HTMLElement).hasAttribute('data-custom-date-option')
          if (!hasCustom) return true
          return (child as HTMLElement).getAttribute('data-option-label') === 'Last 2 weeks'
        }
      )

      // Insert "Last 1 month" at index 2
      if (currentChildren.length >= 2) {
        const element = createOptionElement({ label: 'Last 1 month', getDates: getLast1Month })
        optionsContainer.insertBefore(element, currentChildren[2] || null)
        injectedOptionsRef.current.add(element)
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

      // Insert "Last 3 months" at index 3
      if (currentChildren.length >= 3) {
        const element = createOptionElement({ label: 'Last 3 months', getDates: getLast3Months })
        optionsContainer.insertBefore(element, currentChildren[3] || null)
        injectedOptionsRef.current.add(element)
      }

      // Insert "Next 2 weeks" at index 5
      if (existingChildren.length >= 5) {
        const element = createOptionElement({ label: 'Next 2 weeks', getDates: getNext2Weeks })
        const targetElement = existingChildren[4] || null
        optionsContainer.insertBefore(element, targetElement)
        injectedOptionsRef.current.add(element)
      }
    }

    // Set up MutationObserver to watch for portal container changes
    const portalContainer = document.getElementById('datepicker-portal-container')
    if (!portalContainer) {
      const timeoutId = setTimeout(() => {
        injectCustomOptions()
      }, 100)
      return () => clearTimeout(timeoutId)
    }

    // Create observer with debounce
    observerRef.current = new MutationObserver(() => {
      if (isInteractingRef.current) {
        return
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      debounceTimeoutRef.current = setTimeout(() => {
        if (!isInteractingRef.current) {
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

    // Periodic injection (only if not interacting)
    const intervalId = setInterval(() => {
      if (!isInteractingRef.current) {
        injectCustomOptions()
      }
    }, 1000)

    // Capture ref for cleanup
    const injectedElements = injectedOptionsRef.current

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

      injectedElements.forEach((element) => {
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })
      injectedElements.clear()
    }
  }, [onStartChange, onEndChange])
}
