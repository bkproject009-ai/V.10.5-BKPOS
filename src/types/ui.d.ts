import { ReactNode } from 'react';

declare module '@/components/ui/button' {
  export interface ButtonProps {
    children?: ReactNode;
  }
}

declare module '@/components/ui/dialog' {
  export interface DialogProps {
    children?: ReactNode;
  }
}

declare module '@/components/ui/input' {
  export interface InputProps {
    children?: ReactNode;
  }
}

declare module '@/components/ui/label' {
  export interface LabelProps {
    children?: ReactNode;
  }
}

declare module '@/components/ui/card' {
  export interface CardProps {
    children?: ReactNode;
  }
}

declare module '@/components/ui/badge' {
  export interface BadgeProps {
    children?: ReactNode;
  }
}

declare module '@/components/ui/alert-dialog' {
  export interface AlertDialogProps {
    children?: ReactNode;
  }
}

declare module '@/components/ProductPermissions' {
  export interface ProductPermissionsProps {
    children?: ReactNode;
    allowEdit: boolean;
  }
}