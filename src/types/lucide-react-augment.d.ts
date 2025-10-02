/// <reference types="react" />
import 'lucide-react';
import { ComponentType } from 'react';

declare module 'lucide-react' {
  interface LucideIconProps {
    className?: string;
    style?: React.CSSProperties;
  }
  
  interface IconProps extends LucideIconProps {}
  
  type Icon = ComponentType<IconProps>;
}