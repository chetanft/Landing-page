# Date Picker Implementation Comparison: "This week" vs "Last 2 weeks"

## Overview
This document explains the key differences between how built-in DatePicker options (like "This week") work versus custom injected options (like "Last 2 weeks").

## Built-in Options (e.g., "This week")

### How They Work:
1. **Native Component Integration**: Built-in options are part of the `ft-design-system` DatePicker component
2. **Internal Handling**: When clicked, the DatePicker component:
   - Updates its internal state directly
   - Calls `onStartChange` and `onEndChange` props automatically
   - Handles the date formatting internally
   - Closes the dropdown automatically (or shows Apply button)
   - Manages all event handling internally

### Code Location:
- Defined inside the `ft-design-system` DatePicker component
- No custom code needed in our application

### Flow:
```
User clicks "This week" 
  → DatePicker internal handler fires
  → Dates calculated internally
  → onStartChange/onEndChange called automatically
  → Dropdown closes or shows Apply button
  → UI updates seamlessly
```

---

## Custom Options (e.g., "Last 2 weeks")

### How They Work:
1. **DOM Manipulation**: Custom options are injected via DOM manipulation using `useEffect` and `MutationObserver`
2. **Manual Event Handling**: When clicked:
   - We manually create a button element
   - We manually attach click event listeners
   - We manually format dates (YYYY-MM-DD)
   - We manually call `handleStartDateChange` and `handleEndDateChange`
   - We manually prevent default behavior and stop propagation
   - We DON'T close the dropdown (user must click Apply)

### Code Location:
- `src/modules/summary-dashboard/components/TitleBar.tsx`
- Lines 104-415: `injectCustomOptions` function
- Lines 189-288: `createOptionElement` function

### Flow:
```
User clicks "Last 2 weeks"
  → Our custom click handler fires
  → We prevent default behavior
  → We calculate dates using getLast2Weeks()
  → We format dates as YYYY-MM-DD strings
  → We manually call handleStartDateChange() and handleEndDateChange()
  → Dropdown stays open (user must click Apply)
  → UI updates via props
```

---

## Key Differences

| Aspect | Built-in ("This week") | Custom ("Last 2 weeks") |
|--------|----------------------|------------------------|
| **Implementation** | Part of DatePicker component | DOM manipulation + event listeners |
| **Event Handling** | Internal to DatePicker | Manual event listeners |
| **Date Formatting** | Handled internally | Manual YYYY-MM-DD formatting |
| **State Management** | Direct component state | Via props (handleStartDateChange/handleEndDateChange) |
| **Dropdown Closing** | Automatic | Manual (stays open for Apply button) |
| **Code Complexity** | Simple (no code needed) | Complex (100+ lines of DOM manipulation) |
| **Maintenance** | Low (handled by library) | High (needs MutationObserver, debouncing, etc.) |
| **Reliability** | High (tested by library) | Medium (custom implementation) |

---

## Why The Difference?

### Built-in Options:
- **Advantages**: 
  - Clean, simple, maintainable
  - Fully integrated with DatePicker
  - Automatic state management
  - Tested by the library maintainers

### Custom Options:
- **Why Needed**: 
  - The `ft-design-system` DatePicker doesn't support adding custom presets via props
  - We need options that aren't in the default set
  - We need specific positioning (e.g., "Last 2 weeks" at index 1)

- **Disadvantages**:
  - Complex DOM manipulation code
  - Requires MutationObserver to handle dynamic updates
  - Needs debouncing to prevent flickering
  - Manual event handling prone to bugs
  - Harder to maintain

---

## Current Implementation Issues

1. **Inconsistent Behavior**: Built-in options might close immediately, while custom options require Apply button
2. **Complex Code**: 300+ lines of code just to inject 4 custom options
3. **Fragile**: Relies on DOM structure that could change if DatePicker updates
4. **Performance**: MutationObserver runs frequently, needs debouncing

---

## Recommended Solution

**Option 1: Request Feature from Library**
- Ask `ft-design-system` to support custom presets via props
- Example: `<DatePicker presets={customPresets} />`

**Option 2: Fork/Extend Component**
- Create a wrapper component that extends DatePicker
- Add custom presets as first-class options

**Option 3: Keep Current Approach (with improvements)**
- Standardize behavior: make custom options work exactly like built-in ones
- Add automatic dropdown closing after date selection
- Simplify the code where possible

---

## Code Comparison

### Built-in Option Click (Simplified):
```typescript
// Inside DatePicker component (ft-design-system)
const handlePresetClick = (preset) => {
  const { start, end } = preset.getDates()
  onStartChange(start)  // Automatic
  onEndChange(end)      // Automatic
  closeDropdown()       // Automatic
}
```

### Custom Option Click (Current):
```typescript
// Our custom implementation
const handleClick = (event: Event) => {
  event.preventDefault()
  event.stopImmediatePropagation()
  
  const { start, end } = option.getDates()
  
  // Manual formatting
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Manual prop calls
  handleStartDateChange(formatDateForInput(start))
  handleEndDateChange(formatDateForInput(end))
  
  // Manual dropdown management (stays open)
}
```

---

## Conclusion

Both options serve the same purpose (selecting a date range), but:
- **Built-in options** are simple, clean, and integrated
- **Custom options** are complex, fragile, and require extensive DOM manipulation

The ideal solution would be to have custom options work exactly like built-in ones, but that requires either:
1. Library support for custom presets
2. A wrapper component that extends DatePicker
3. Standardizing the current custom implementation to match built-in behavior
