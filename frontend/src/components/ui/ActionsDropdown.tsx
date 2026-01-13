import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [dropdownPosition, setDropdownPosition] = useState({ 
    top: 0, 
    left: 0, 
    openUpward: false 
  });

  // Filtrar ações visíveis
  const visibleActions = actions.filter(action => action.show !== false);

  // Função para calcular posição do dropdown usando useCallback
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = visibleActions.length * 44 + 8; // altura aproximada por item + padding
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Verificar se deve abrir para cima
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
    // Calcular posição vertical
    const top = openUpward 
      ? rect.top - dropdownHeight - 8 
      : rect.bottom + 8;
    
    // Calcular posição horizontal (alinhar à direita do botão)
    let left = rect.right - 192; // 192px = w-48 (width do dropdown)
    
    // Ajustar se estiver muito à esquerda
    if (left < 8) {
      left = 8;
    }
    
    // Ajustar se estiver muito à direita
    if (left + 192 > window.innerWidth - 8) {
      left = window.innerWidth - 192 - 8;
    }

    setDropdownPosition({ top, left, openUpward });
  }, [visibleActions.length]);

  // Calcular posição do dropdown quando abrir ou quando scroll/resize
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      calculatePosition();

      // Função otimizada para recalcular posição
      let rafId: number | null = null;
      const handleUpdatePosition = () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          if (isOpen && buttonRef.current) {
            calculatePosition();
          }
        });
      };

      // Adicionar listeners - usar capture phase para pegar todos os scrolls
      window.addEventListener('scroll', handleUpdatePosition, true);
      window.addEventListener('resize', handleUpdatePosition);
      document.addEventListener('scroll', handleUpdatePosition, true);
      
      // Encontrar e adicionar listener no container scrollável pai mais próximo
      const scrollableParents: HTMLElement[] = [];
      let parent: HTMLElement | null = buttonRef.current.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollableParents.push(parent);
          parent.addEventListener('scroll', handleUpdatePosition, true);
        }
        parent = parent.parentElement;
      }
      
      return () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('scroll', handleUpdatePosition, true);
        window.removeEventListener('resize', handleUpdatePosition);
        document.removeEventListener('scroll', handleUpdatePosition, true);
        
        // Remover listeners dos parents scrolláveis
        scrollableParents.forEach(el => {
          el.removeEventListener('scroll', handleUpdatePosition, true);
        });
      };
    }
  }, [isOpen, calculatePosition]);

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
      className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] py-1 transition-all duration-200 ease-in-out max-h-[80vh] overflow-y-auto"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        transform: dropdownPosition.openUpward ? 'none' : 'none'
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

