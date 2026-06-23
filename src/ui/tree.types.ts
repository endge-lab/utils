export interface TreeViewNode {
  id: string
  label: string
  icon?: string
  expanded?: boolean
  children?: Array<TreeViewNode>
}
