import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary' | 'success';
  disabled?: boolean;
  show?: boolean; // Para controlar visibilidade condicional
}

interface ActionsDropdownProps {
  actions: ActionItem[];
  label?: string;
  className?: string;
}

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({ 
  actions, 
  label = 'Ações',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });

  // Filtrar ações visíveis
  const visibleActions = actions.filter(action => action.show !== false);

  // Calcular posição do dropdown quando abrir
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        right: window.innerWidth - rect.right
      });
    }
  }, [isOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fechar dropdown ao pressionar ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleActionClick = (action: ActionItem) => {
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false);
    }
  };

  const getVariantStyles = (variant: ActionItem['variant'] = 'default') => {
    switch (variant) {
      case 'danger':
        return 'text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20';
      case 'primary':
        return 'text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20';
      case 'success':
        return 'text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20';
      default:
        return 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700';
    }
  };

  if (visibleActions.length === 0) {
    return null;
  }

  const dropdownContent = isOpen ? (
    <div 
      ref={dropdownRef}
      className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] py-1 transition-all duration-200 ease-in-out"
      style={{
        top: `${dropdownPosition.top}px`,
        right: `${dropdownPosition.right}px`,
        left: 'auto'
      }}
    >
      {visibleActions.map((action, index) => (
        <button
          key={index}
          onClick={() => handleActionClick(action)}
          disabled={action.disabled}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
            action.disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : getVariantStyles(action.variant)
          }`}
        >
          {action.icon && (
            <span className="flex-shrink-0">{action.icon}</span>
          )}
          <span className="flex-1 text-left">{action.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-semibold shadow-md"
        aria-label="Ações"
        aria-expanded={isOpen}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" 
          />
        </svg>
        <span>{label}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default ActionsDropdown;

