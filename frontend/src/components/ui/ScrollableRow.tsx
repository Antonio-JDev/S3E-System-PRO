import React from 'react';
import { cn } from '../../lib/utils';
import { mobileTabBarScrollClasses, scrollableRowClasses } from '../../utils/responsiveNav';

type ScrollableRowProps = {
  children: React.ReactNode;
  as?: 'nav' | 'div';
  className?: string;
  ariaLabel?: string;
  role?: string;
  /** Estende o scroll horizontal até a borda do container pai no mobile */
  edgeToEdge?: boolean;
};

export default function ScrollableRow({
  children,
  as: Component = 'div',
  className,
  ariaLabel,
  role,
  edgeToEdge = false,
}: ScrollableRowProps) {
  return (
    <Component
      className={cn(
        scrollableRowClasses,
        edgeToEdge && mobileTabBarScrollClasses,
        className,
      )}
      aria-label={Component === 'nav' ? ariaLabel : undefined}
      role={role}
    >
      {children}
    </Component>
  );
}