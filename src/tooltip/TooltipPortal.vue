<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTooltipStore } from '@/tooltip/store'

const { tooltips, activeId } = storeToRefs(useTooltipStore())

const currentTooltip = computed(() => {
  if (!activeId.value) return null
  return tooltips.value[activeId.value] || null
})

const tooltipStyle = computed(() => {
  if (!currentTooltip.value) return {}
  const activatorEl = document.querySelector(currentTooltip.value.activator)
  if (!activatorEl) return {}

  const rect = (activatorEl as HTMLElement).getBoundingClientRect()

  return {
    top: `${rect.bottom + 8}px`,
    left: `${rect.left}px`,
    maxWidth: currentTooltip.value.maxWidth || '300px',
    position: 'fixed',
    background: '#333',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '4px',
    zIndex: 9999,
    pointerEvents: 'none',
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="currentTooltip" class="tooltip" :style="tooltipStyle">
      <component
        :is="currentTooltip.content"
        v-if="typeof currentTooltip.content === 'function'"
      />
      <span v-else>{{ currentTooltip.content }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.tooltip {
  transition: opacity 0.2s ease;
}
</style>
