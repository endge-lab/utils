export class UPSMeter_Service {
  private _currentCount = 0
  private _lastResetTime = Date.now()
  private _lastEventsPerSecond = 0

  public count(): void {
    const now = Date.now()

    this._currentCount += 1

    if (now - this._lastResetTime >= 1000) {
      this._lastEventsPerSecond = this._currentCount
      this._currentCount = 0
      this._lastResetTime = now
    }
  }

  public get rate(): number {
    return this._lastEventsPerSecond
  }

  public reset(): void {
    this._currentCount = 0
    this._lastEventsPerSecond = 0
    this._lastResetTime = Date.now()
  }
}
