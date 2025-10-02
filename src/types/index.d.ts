/// <reference types="react" />

declare module 'lucide-react' {
  import { ComponentType } from 'react';

  export type IconNode = JSX.Element;
  export type Icon = ComponentType<{ size?: number | string }>;

  export const Minus: Icon;
  export const Plus: Icon;
  export const History: Icon;
  export const Edit2: Icon;
  export const Trash2: Icon;
  export const Package: Icon;
  export const Search: Icon;
  export const AlertTriangle: Icon;
}