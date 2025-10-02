/// <reference types="react" />

declare module '@/components/ui/button' {
  import { ElementType } from 'react';

  export type Button = ElementType<any>;
  export const Button: Button;
}

declare module '@/components/ui/dialog' {
  import { ElementType } from 'react';

  export type Dialog = ElementType<any>;
  export type DialogTrigger = ElementType<any>;
  export type DialogContent = ElementType<any>;
  export type DialogHeader = ElementType<any>;
  export type DialogTitle = ElementType<any>;

  export const Dialog: Dialog;
  export const DialogTrigger: DialogTrigger;
  export const DialogContent: DialogContent;
  export const DialogHeader: DialogHeader;
  export const DialogTitle: DialogTitle;
}

declare module '@/components/ui/input' {
  import { ElementType } from 'react';

  export type Input = ElementType<any>;
  export const Input: Input;
}

declare module '@/components/ui/label' {
  import { ElementType } from 'react';

  export type Label = ElementType<any>;
  export const Label: Label;
}

declare module '@/components/ui/card' {
  import { ElementType } from 'react';

  export type Card = ElementType<any>;
  export type CardHeader = ElementType<any>;
  export type CardTitle = ElementType<any>;
  export type CardContent = ElementType<any>;

  export const Card: Card;
  export const CardHeader: CardHeader;
  export const CardTitle: CardTitle;
  export const CardContent: CardContent;
}

declare module '@/components/ui/badge' {
  import { ElementType } from 'react';

  export type Badge = ElementType<any>;
  export const Badge: Badge;
}

declare module '@/components/ui/alert-dialog' {
  import { ElementType } from 'react';

  export type AlertDialog = ElementType<any>;
  export type AlertDialogTrigger = ElementType<any>;
  export type AlertDialogContent = ElementType<any>;
  export type AlertDialogHeader = ElementType<any>;
  export type AlertDialogFooter = ElementType<any>;
  export type AlertDialogTitle = ElementType<any>;
  export type AlertDialogDescription = ElementType<any>;
  export type AlertDialogAction = ElementType<any>;
  export type AlertDialogCancel = ElementType<any>;

  export const AlertDialog: AlertDialog;
  export const AlertDialogTrigger: AlertDialogTrigger;
  export const AlertDialogContent: AlertDialogContent;
  export const AlertDialogHeader: AlertDialogHeader;
  export const AlertDialogFooter: AlertDialogFooter;
  export const AlertDialogTitle: AlertDialogTitle;
  export const AlertDialogDescription: AlertDialogDescription;
  export const AlertDialogAction: AlertDialogAction;
  export const AlertDialogCancel: AlertDialogCancel;
}

declare module '@/components/ProductPermissions' {
  import { ElementType } from 'react';

  export interface ProductPermissionsProps {
    allowEdit: boolean;
  }

  export type ProductPermissions = ElementType<ProductPermissionsProps>;
  export default ProductPermissions;
}