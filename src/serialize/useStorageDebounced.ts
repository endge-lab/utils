import { ref, watch, type Ref } from 'vue'
import debounce from 'lodash/debounce.js'

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
    } catch {
      console.error('Failed to parse from localStorage', key, savedRaw)
    }
  }

  const state = ref<T>(value)

  const save = debounce(() => {
    try {
      const serialized = JSON.stringify(toJSON(state.value))
      localStorage.setItem(key, serialized)
    } catch {
      console.error('Failed to save to localStorage', key, state.value)
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
