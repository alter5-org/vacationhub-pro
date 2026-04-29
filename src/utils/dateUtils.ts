import {
  format,
  isWeekend,
  eachDayOfInterval,
  parseISO,
  differenceInDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { getHolidaysByYear, isHoliday } from '@/data/holidays'

type DateInput = string | Date

export const formatDate = (
  dateString: DateInput,
  formatStr = 'dd MMM yyyy'
): string => {
  const date =
    typeof dateString === 'string' ? parseISO(dateString) : dateString
  return format(date, formatStr, { locale: es })
}

export const formatDateRange = (
  startDate: DateInput,
  endDate: DateInput
): string => {
  return `${formatDate(startDate, 'dd MMM')} - ${formatDate(
    endDate,
    'dd MMM yyyy'
  )}`
}

export const isWeekendDay = (date: DateInput): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isWeekend(d)
}

export const calculateWorkingDays = (
  startDate: DateInput,
  endDate: DateInput
): number => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  const year = start.getFullYear()

  const days = eachDayOfInterval({ start, end })

  return days.filter((day) => {
    const dateString = format(day, 'yyyy-MM-dd')
    return !isWeekendDay(day) && !isHoliday(dateString, year)
  }).length
}

export const getHolidaysInRange = (
  startDate: DateInput,
  endDate: DateInput
) => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  const year = start.getFullYear()

  const holidays = getHolidaysByYear(year)

  return holidays.filter((h: { date: string }) => {
    const holidayDate = parseISO(h.date)
    return holidayDate >= start && holidayDate <= end
  })
}

export const getDaysUntil = (dateString: DateInput): number => {
  const date =
    typeof dateString === 'string' ? parseISO(dateString) : dateString
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInDays(date, today)
}

export const isToday = (date: DateInput): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export const toDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd')
}

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}


