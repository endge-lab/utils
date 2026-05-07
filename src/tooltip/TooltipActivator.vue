<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useTooltipStore } from '@/tooltip/store'
import { TooltipAttribute } from '@/tooltip/types'
import { randomString } from '@/tools/generate'

const props = withDefaults(
  defineProps<{
    id?: string
    content?: string | (() => any)
    position?: 'top' | 'bottom' | 'left' | 'right'
    maxWidth?: string | number
  }>(),
  {
    position: 'top',
    content: '',
  },
)

const slots = defineSlots<{
  default(): any
  content?(): any
}>()

const { registerTooltip, unregisterTooltip, showTooltip, hideTooltip } =
  useTooltipStore()

// Генерация ID при необходимости
const tooltipId = props.id || randomString(6)

let timeout: any = null

const selector = computed(() => `[${TooltipAttribute}='${tooltipId}']`)

function onEnter(): void {
  timeout = setTimeout(() => showTooltip(tooltipId), 300)
}

function onLeave(): void {
  if (timeout) {
    clearTimeout(timeout)
  }
  hideTooltip(tooltipId)
}

onMounted(() => {
  registerTooltip({
    id: tooltipId,
    content: slots.content ? () => slots.content?.() : props.content,
    activator: selector.value,
    position: props.position,
    maxWidth: props.maxWidth,
  })
})

onBeforeUnmount(() => {
  unregisterTooltip(tooltipId)
})
</script>

<template>
  <div
    :[TooltipAttribute]="tooltipId"
    style="cursor: pointer"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <slot />
  </div>
</template>
