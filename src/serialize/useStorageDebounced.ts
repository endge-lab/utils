import { ref, watch, type Ref } from 'vue'
import debounce from 'lodash/debounce.js'
import { consoleErrorSummary } from '@/tools/console'

export function useStorageDebounced<T>(
  key: string,
  initial: T,
  fromJSON: (data: any) => T = data => data as T,
  toJSON: (data: T) => any = data => data,
  delay = 300,
): Ref<T> {
  let value = initial
  const savedRaw = localStorage.getItem(key)

  if (savedRaw) {
    try {
      const parsed = JSON.parse(savedRaw)
      value = fromJSON(parsed)
    } catch (error) {
      console.error(`[useStorageDebounced] Failed to parse "${key}" (${savedRaw.length} chars): ${consoleErrorSummary(error)}`)
    }
  }

  const state = ref<T>(value)

  const save = debounce(() => {
    try {
      const serialized = JSON.stringify(toJSON(state.value))
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error(`[useStorageDebounced] Failed to save "${key}": ${consoleErrorSummary(error)}`)
    }
  }, delay)

  watch(
    () => state.value,
    () => {
      save()
    },
    { deep: true },
  )

  return state
}
