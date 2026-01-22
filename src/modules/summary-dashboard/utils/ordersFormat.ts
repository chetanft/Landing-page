/**
 * Utility functions for formatting order-related data
 */

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`
}

/**
 * Format date to display format (e.g., "3 PM, 10 Feb 24")
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')

  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear().toString().slice(-2)

  return `${displayHours}:${displayMinutes} ${ampm}, ${day} ${month} ${year}`
}

/**
 * Format date only (e.g., "10 Feb 24")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear().toString().slice(-2)
  return `${day} ${month} ${year}`
}

/**
 * Format duration in minutes to human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours} hr`
    }
    return `${hours} hr ${remainingMinutes} min`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (remainingHours === 0) {
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  return `${days} ${days === 1 ? 'day' : 'days'} ${remainingHours} hr`
}

/**
 * Format delay message
 */
export function formatDelay(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null

  const days = Math.floor(minutes / (24 * 60))
  const hours = Math.floor((minutes % (24 * 60)) / 60)
  const mins = minutes % 60

  if (days > 0) {
    return `Delayed by ${days} ${days === 1 ? 'day' : 'days'}`
  } else if (hours > 0) {
    return `Delayed by ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  } else {
    return `Delayed by ${mins} ${mins === 1 ? 'minute' : 'minutes'}`
  }
}

/**
 * Format weight with unit
 */
export function formatWeight(weight: number, unit: string = 'Ton'): string {
  return `${weight} ${unit}`
}
