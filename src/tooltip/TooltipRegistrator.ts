export interface TooltipRegistratorProps {
  id?: string
  data?: unknown
  template?: unknown
  location?: unknown
  disabled?: boolean
  maxWidth?: string
  customClass?: string
  justifyClass?: string
  slots?: {
    default?: () => any
  }
}

export type TooltipRenderFunction = (
  tag: string,
  props?: Record<string, unknown>,
  children?: any,
) => any

export function TooltipRegistrator(
  h: TooltipRenderFunction,
  props: TooltipRegistratorProps,
): any {
  return h('div', {}, props.slots?.default ? props.slots.default() : [])
}
