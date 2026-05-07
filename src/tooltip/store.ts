import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { TooltipInstance } from '@/tooltip/types'

export const useTooltipStore = defineStore('tooltip', () => {
  const tooltips = reactive<Record<string, TooltipInstance>>({})
  const activeId = ref<string | null>(null)

  function registerTooltip(tt: Omit<TooltipInstance, 'visible'>): void {
    tooltips[tt.id] = {
      ...tt,
      visible: false,
    }
  }

  function unregisterTooltip(id: string): void {
    delete tooltips[id]
  }

  function showTooltip(id: string): void {
    if (tooltips[id]) {
      activeId.value = id
      tooltips[id].active = true
    }
  }

  function hideTooltip(id: string): void {
    if (tooltips[id]) {
      tooltips[id].active = false
      if (activeId.value === id) activeId.value = null
    }
  }

  function setActiveTooltipId(id: string): void {
    showTooltip(id)
  }

  function clearActiveTooltipId(): void {
    if (activeId.value) {
      hideTooltip(activeId.value)
    }
  }

  return {
    tooltips,
    activeId,
    registerTooltip,
    unregisterTooltip,
    showTooltip,
    hideTooltip,
    setActiveTooltipId,
    clearActiveTooltipId,
  }
})
