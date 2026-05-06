import * as React from 'react';
import { cn } from '@/lib/utils';

// Context para estado colapsado (ícone apenas) - opcional
const SidebarContext = React.createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
    defaultCollapsed?: boolean;
  }
>(({ className, children, collapsed: controlledCollapsed, onCollapsedChange, defaultCollapsed = false, ...props }, ref) => {
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = React.useCallback(
    (v: boolean) => {
      onCollapsedChange?.(v);
      if (controlledCollapsed === undefined) setInternalCollapsed(v);
    },
    [onCollapsedChange, controlledCollapsed]
  );
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div ref={ref} className={cn('flex flex-col h-full shrink-0', className)} data-sidebar="provider" {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
});
SidebarProvider.displayName = 'SidebarProvider';

export const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    collapsible?: 'offcanvas' | 'icon' | 'none';
  }
>(({ className, children, open = true, onOpenChange, collapsible = 'icon', ...props }, ref) => {
  const { collapsed } = useSidebar();
  const width = collapsible === 'icon' && collapsed ? 'w-[52px]' : 'w-[246px]';
  return (
    <aside
      ref={ref as React.RefObject<HTMLDivElement>}
      data-sidebar="sidebar"
      className={cn(
        'flex h-full flex-col overflow-x-hidden border-r bg-white text-gray-900 dark:border-dark-border dark:bg-dark-bg dark:text-gray-100',
        'transition-[transform,width] duration-200 ease-out',
        width,
        'fixed inset-y-0 left-0 z-40 lg:relative lg:translate-x-0',
        !open && '-translate-x-full lg:translate-x-0',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
});
Sidebar.displayName = 'Sidebar';

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="header" className={cn('flex flex-col gap-1 p-3 border-b border-gray-200 dark:border-gray-800', className)} {...props} />
  )
);
SidebarHeader.displayName = 'SidebarHeader';

export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="content" className={cn('flex-1 overflow-auto py-3', className)} {...props} />
  )
);
SidebarContent.displayName = 'SidebarContent';

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} data-sidebar="group" className={cn('px-3 py-2', className)} {...props} />
);
SidebarGroup.displayName = 'SidebarGroup';

export const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="group-label" className={cn('mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400', className)} {...props} />
  )
);
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => <ul ref={ref} data-sidebar="menu" className={cn('space-y-0.5', className)} {...props} />
);
SidebarMenu.displayName = 'SidebarMenu';

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} data-sidebar="menu-item" className={cn('', className)} {...props} />
);
SidebarMenuItem.displayName = 'SidebarMenuItem';

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean; tooltip?: string }
>(({ className, isActive, children, ...props }, ref) => {
  const ctx = React.useContext(SidebarContext);
  const collapsed = ctx.collapsed;
  return (
    <button
      ref={ref}
      data-sidebar="menu-button"
      data-active={isActive}
      className={cn(
        'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        // Modo recolhido: item ativo = alvo 36×36px centralizado (evita “pill” cortado na barra estreita)
        collapsed && isActive && 'mx-auto h-9 w-9 shrink-0 justify-center p-0',
        collapsed && !isActive && 'w-full justify-center px-1.5 py-2',
        !collapsed && 'w-full px-2 py-2',
        'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800/80 dark:hover:text-white',
        isActive &&
          'bg-gray-100 text-gray-900 dark:bg-gray-800/90 dark:text-white [&:hover]:bg-gray-200 dark:[&:hover]:bg-gray-800',
        collapsed && isActive && 'shadow-sm',
        className
      )}
      title={props.title}
      {...props}
    >
      {children}
        {!collapsed && (
        <span className="ml-auto text-gray-400 dark:text-gray-500 shrink-0">
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      )}
    </button>
  );
});
SidebarMenuButton.displayName = 'SidebarMenuButton';

const ChevronRightIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-sidebar="footer" className={cn('border-t border-gray-200 dark:border-dark-border p-3', className)} {...props} />
  )
);
SidebarFooter.displayName = 'SidebarFooter';

export const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => (
    <button
      ref={ref}
      data-sidebar="trigger"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white transition-colors',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <PanelLeftIcon className="h-5 w-5" />
    </button>
  )
);
SidebarTrigger.displayName = 'SidebarTrigger';

const PanelLeftIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);
