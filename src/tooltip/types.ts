export interface TooltipInstance {
  id: string
  content: string | (() => any) // текст или функция компонента
  activator: string // CSS селектор
  visible: boolean
  active?: boolean
  position?: 'top' | 'bottom' | 'left' | 'right'
  maxWidth?: string | number
}

export const TooltipAttribute = 'x-collection-tooltip-id'
