import {
  differenceInCalendarDays,
  differenceInSeconds,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
} from 'date-fns'
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
  const minTime = Math.min(...dateArray.map(date => date.getTime()))
  const maxTime = Math.max(...dateArray.map(date => date.getTime()))
  return {
    minDate: new Date(minTime),
    maxDate: new Date(maxTime),
  }
}

export function diffDuration(d1: Date, d2: Date): string {
  const diffSeconds = differenceInSeconds(d1, d2)
  const { hours, minutes } = secondsToClockParts(diffSeconds)

  if (hours || minutes)
    return `${diffSeconds > 0 ? '-' : '+'}${pad2(hours)}:${pad2(minutes)}`

  return ''
}

export function diffDurationTable(d1: Date, d2: Date): string {
  const diffSeconds = differenceInSeconds(d1, d2)
  const { hours, minutes } = secondsToClockParts(diffSeconds)

  if (hours || minutes)
    return `${diffSeconds > 0 ? '-' : ''}${pad2(hours)}:${pad2(minutes)}`

  return ''
}

export function removeTime(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getDateOnlyDiffFactor(d1: Date, d2: Date): { variant: 'red' | 'blue'; value: string } | null {
  const diff = differenceInCalendarDays(removeTime(d1), removeTime(d2))

  if (!diff)
    return null

  if (diff > 7) {
    return {
      variant: 'red',
      value: '>7',
    }
  }

  if (diff < -7) {
    return {
      variant: 'blue',
      value: '>7',
    }
  }

  if (diff > 0) {
    return {
      variant: 'red',
      value: `+${diff}`,
    }
  }

  return {
    variant: 'blue',
    value: `${diff}`,
  }
}

export function toIsoZDate(value: string): string | null {
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match)
    return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function toIsoZDateTime(value: string): string | null {
  const text = String(value ?? '').trim()
  if (!text)
    return null

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    const hours = Number(match[4])
    const minutes = Number(match[5])
    const seconds = match[6] != null ? Number(match[6]) : 0
    const date = new Date(year, month, day, hours, minutes, seconds, 0)

    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function isoToDateInput(value: unknown): string {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, 10) : ''
}

export function isoToDateTimeLocalInput(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text)
    return ''

  const date = new Date(text)
  if (Number.isNaN(date.getTime()))
    return text.slice(0, 16)

  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  const hours = pad2(date.getHours())
  const minutes = pad2(date.getMinutes())

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function timeToTimeInput(value: unknown): string {
  if (value == null)
    return ''

  const text = String(value).trim()
  if (!text)
    return ''

  const withSeconds = text.match(/^(\d{2}):(\d{2}):(\d{2})$/)
  if (withSeconds)
    return `${withSeconds[1]}:${withSeconds[2]}`

  const withoutSeconds = text.match(/^(\d{2}):(\d{2})$/)
  if (withoutSeconds)
    return `${withoutSeconds[1]}:${withoutSeconds[2]}`

  return ''
}

export function toTimeHHMMSS(value: unknown): string | null {
  if (value == null)
    return null

  const text = String(value).trim()
  if (!text)
    return null

  const withSeconds = text.match(/^(\d{2}):(\d{2}):(\d{2})$/)
  if (withSeconds)
    return `${withSeconds[1]}:${withSeconds[2]}:${withSeconds[3]}`

  const withoutSeconds = text.match(/^(\d{2}):(\d{2})$/)
  if (withoutSeconds)
    return `${withoutSeconds[1]}:${withoutSeconds[2]}:00`

  return null
}

export function parseDuration(duration: string): string {
  const seconds = parseDurationToSeconds(duration)
  const sign = Math.sign(seconds) >= 0 ? '' : '-'
  const { hours, minutes } = secondsToClockParts(seconds)

  return `${sign}${pad2(hours)}:${pad2(minutes)}`
}

export function formatDatetimeTZSpecial(
  date: Date | string | object | null = null,
  formatString = 'dd',
  options = {},
): string {
  const normalizedDate = normalizeDateInput(date)
  if (!normalizedDate)
    return ''

  const currentDate = new Date()
  const dateAdopted = new Date(normalizedDate)

  currentDate.setHours(0, 0, 0, 0)
  dateAdopted.setHours(0, 0, 0, 0)

  if (dateAdopted.toDateString() === currentDate.toDateString())
    return ''

  return `/${format(normalizedDate, formatString, options)}`
}

function normalizeDateInput(date: Date | string | object | null): Date | null {
  if (!date || date === '')
    return null

  const normalizedDate = typeof date === 'string'
    ? new Date(date)
    : date instanceof Date
      ? date
      : new Date(date.toString())

  return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate
}

function secondsToClockParts(seconds: number): { hours: number; minutes: number } {
  const absSeconds = Math.abs(seconds)

  return {
    hours: Math.floor(absSeconds / 3600) % 24,
    minutes: Math.floor(absSeconds / 60) % 60,
  }
}

function parseDurationToSeconds(duration: string): number {
  const text = String(duration ?? '').trim()
  if (!text)
    return 0

  const clock = text.match(/^(-)?(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (clock) {
    const sign = clock[1] ? -1 : 1
    return sign * ((Number(clock[2]) * 3600) + (Number(clock[3]) * 60) + Number(clock[4] ?? 0))
  }

  const iso = text.match(/^(-)?P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i)
  if (iso) {
    const sign = iso[1] ? -1 : 1
    const days = Number(iso[2] ?? 0)
    const hours = Number(iso[3] ?? 0)
    const minutes = Number(iso[4] ?? 0)
    const seconds = Number(iso[5] ?? 0)

    return sign * ((days * 86400) + (hours * 3600) + (minutes * 60) + seconds)
  }

  return 0
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
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
