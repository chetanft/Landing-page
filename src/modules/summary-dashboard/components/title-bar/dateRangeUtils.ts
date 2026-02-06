export interface DateRange {
  start: Date
  end: Date
}

export const getLast3Months = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  return { start, end }
}

export const getLast1Month = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start, end }
}

export const getLast2Weeks = (): DateRange => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 14)
  return { start, end }
}

export const getNext2Weeks = (): DateRange => {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 14)
  return { start, end }
}

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseDateValue = (value: string): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const getBuiltInDateRange = (label: string): DateRange | null => {
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
