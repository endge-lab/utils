import { DateTime } from 'ts-luxon'

export const SystemClock = {
  DateTime,
  toDateTime(jsDate: Date) {
    return this.DateTime.fromJSDate(jsDate)
  },
  fromFormat(text: string, format: string, opts: any) {
    return this.DateTime.fromFormat(text, format, opts)
  },
  fromISO(text: string, opts: any = {}) {
    return text ? this.DateTime.fromISO(text, { zone: 'utc', ...opts }) : null
  },
  getNow() {
    return this.DateTime.now()
  },
  getNowUTC() {
    return this.DateTime.now().toUTC()
  },
  getToday() {
    return this.DateTime.now().startOf('day').toLocal()
  },
  getTime(format = 'HH:mm:ss') {
    return this.DateTime.now().toFormat(format)
  },
  getUTCTime(format = 'HH:mm:ss') {
    return this.DateTime.utc().toFormat(format)
  },
  getZone() {
    return this.DateTime.now().zone
  },
}

export const dt = (date: Date) => SystemClock.toDateTime(date)
