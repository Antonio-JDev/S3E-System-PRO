import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

export interface ModalDetailHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  icon?: React.ReactNode;
  hideIconOnMobile?: boolean;
  actions?: React.ReactNode;
  /** Cabeçalho claro (padrão) ou escuro (fundos brand/coloridos) */
  tone?: 'light' | 'dark';
  className?: string;
  innerClassName?: string;
}

/**
 * Cabeçalho de modal otimizado para mobile: botão fechar fixo no canto superior direito.
 */
export function ModalDetailHeader({
  title,
  subtitle,
  onClose,
  icon,
  hideIconOnMobile = true,
  actions,
  tone = 'light',
  className,
  innerClassName,
}: ModalDetailHeaderProps) {
  const isDark = tone === 'dark';

  return (
    <div
      className={cn(
        'relative shrink-0 border-b px-4 pt-4 pb-3 sm:px-6 sm:py-5 pr-12 sm:pr-6',
        isDark
          ? 'border-white/10 bg-[#0a1a2f] text-white'
          : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className={cn(
          'absolute top-3 right-3 z-20 p-2 rounded-lg transition-colors',
          isDark
            ? 'text-white/80 hover:text-white hover:bg-white/20'
            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover',
        )}
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4', innerClassName)}>
        {icon ? (
          <div className={cn('shrink-0', hideIconOnMobile && 'hidden sm:flex')}>{icon}</div>
        ) : null}

        <div className="flex-1 min-w-0 sm:pr-2">
          <h2
            className={cn(
              'text-base sm:text-xl font-bold leading-tight line-clamp-2 sm:line-clamp-none',
              isDark ? 'text-white' : 'text-gray-900 dark:text-white',
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <div
              className={cn(
                'text-xs sm:text-sm mt-0.5 line-clamp-2',
                isDark ? 'text-white/80' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 max-w-full">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
