import React, { SVGProps } from 'react';
import { Icon } from 'lucide-react';

interface IconWrapperProps extends SVGProps<SVGSVGElement> {
  icon: Icon;
  size?: string | number;
}

export const IconWrapper = ({ icon: IconComponent, ...props }: IconWrapperProps) => {
  return <IconComponent {...props} />;
};