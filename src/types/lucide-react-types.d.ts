import { ComponentType } from 'react'

declare module 'lucide-react' {
  // Extend the existing module
  interface IconNode extends Omit<React.SVGProps<SVGElement>, 'ref'> {
    size?: string | number
    color?: string
    strokeWidth?: string | number
  }

  export type Icon = ComponentType<IconNode>

  export const Plus: Icon
  export const Search: Icon
  export const Edit2: Icon
  export const History: Icon
  export const Trash2: Icon
  export const Package: Icon
  export const Rows: Icon
  export const ListOrdered: Icon
  export const Grid: Icon
  export const LayoutList: Icon
  export const Database: Icon
}