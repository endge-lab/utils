import { endOfDay, format, isAfter, isBefore, isEqual, startOfDay } from 'date-fns'
import { getTimezoneOffset, utcToZonedTime } from 'date-fns-tz'

export interface DateRange {
  start: Date
  end: Date
}

export function isAfterOrEqual(dateA: Date, dateB: Date) {
  return isAfter(dateA, dateB) || isEqual(dateA, dateB)
}

export function isDateRangeOverlap(s1: Date, s2: Date, validFrom: Date, validTo: Date): boolean {
  const start1 = startOfDay(s1)
  const end1 = startOfDay(s2)
  const start2 = startOfDay(validFrom)
  const end2 = startOfDay(validTo)

  return !isBefore(end1, start2) && !isAfter(start1, end2)
}

export function isDateInRange(date: Date, validFrom: Date, validTo: Date): boolean {
  return !isBefore(date, startOfDay(validFrom)) && !isAfter(date, endOfDay(validTo))
}

export const parseDate = (isoString: string) => isoString && new Date(isoString)

export function formatDatetime(date: Date, formatString = 'HH:mm dd.MM.yyyy', options = {}) {
  return date && format(date, formatString, options)
}

// Format ISO datetime to timezone datetime
export function formatDatetimeTZ(
  date: Date | string | object,
  formatString = 'HH:mm dd.MM.yyyy',
  options = {},
  isLocalTime = true,
) {
  // const { isLocalTime } = storeToRefs(useAppStore())

  if (!date) {
    return ''
  }

  if (!date || date === '') {
    return ''
  }

  if (typeof date == 'string') {
    date = new Date(date)
  } else if (date instanceof Date) {
    if (isNaN(date as Date)) {
      return ''
    }
  } else {
    date = new Date(date.toString())
  }

  if (isLocalTime) {
    return format(date as Date, formatString, options)
  }
  return format(utcToZonedTime(date as Date, 'utc'), formatString, options)
}

export function getDayOfWeek(date) {
  const options = { weekday: 'short' }
  const dayOfWeek = new Intl.DateTimeFormat('ru-RU', options).format(date)

  // Преобразуем первую букву в верхний регистр
  return dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)
}

// Вспомогательная функция форматирования даты в московскую локаль
export function formatDateToMSK(date) {
  const userDate = new Date(date)

  const utcTime = userDate.getTime() + userDate.getTimezoneOffset() * 6000

  const moscowTime = new Date(utcTime + 3 * 60 * 6000)

  const day = String(moscowTime.getDate()).padStart(2, '0')
  const month = String(moscowTime.getMonth() + 1).padStart(2, '0')
  const year = moscowTime.getFullYear()

  return `${day}.${month}.${year}`
}

export function extractTime(date: Date | string | object, isLocalTime = true) {
  return formatDatetimeTZ(date, 'HH:mm', {}, isLocalTime)
}

export function findMinMaxDates(dates: Set<Date>): { minDate: Date; maxDate: Date } {
  const dateArray = Array.from(dates)
  const minTime = Math.min(...dateArray.map((date) => date.getTime()))
  const maxTime = Math.max(...dateArray.map((date) => date.getTime()))
  return {
    minDate: new Date(minTime),
    maxDate: new Date(maxTime),
  }
}

/**
 * Возвращает первую найденную IANA-таймзону с данным смещением (например, "+03:00").
 */
export function parseOffsetToTimezone(offsetStr: string): string | null {
  const now = new Date()

  try {
    const targetOffset = getTimezoneOffset(offsetStr, now)

    const timezones = Intl.supportedValuesOf('timeZone')
    for (const tz of timezones) {
      if (getTimezoneOffset(tz, now) === targetOffset) {
        return tz
      }
    }
  } catch {
    return null // если передан невалидный offset
  }

  return null
}

/*
 * Возвращает смещение таймзоны в часах относительно UTC.
 */
export function getTimezoneOffsetMs(timezone: string): number {
  const offsetMinutes = getTimezoneOffset(timezone, new Date())
  return offsetMinutes
}
