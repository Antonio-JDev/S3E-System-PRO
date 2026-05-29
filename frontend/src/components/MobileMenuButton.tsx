import React from 'react';

interface MobileMenuButtonProps {
  onClick: () => void;
  isOpen?: boolean;
}

const MobileMenuButton: React.FC<MobileMenuButtonProps> = ({ onClick, isOpen = false }) => {
  return (
    <button
      onClick={onClick}
      className="s3e-mobile-menu-btn lg:hidden fixed top-4 left-4 z-50 p-3 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 active:scale-95"
      aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
      aria-expanded={isOpen}
    >
      <div className="w-6 h-6 flex flex-col justify-center gap-1.5">
        <span
          className={`block h-0.5 w-full bg-gray-700 dark:bg-gray-300 rounded-full transition-all duration-300 ${
            isOpen ? 'rotate-45 translate-y-2' : ''
          }`}
        />
        <span
          className={`block h-0.5 w-full bg-gray-700 dark:bg-gray-300 rounded-full transition-all duration-300 ${
            isOpen ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <span
          className={`block h-0.5 w-full bg-gray-700 dark:bg-gray-300 rounded-full transition-all duration-300 ${
            isOpen ? '-rotate-45 -translate-y-2' : ''
          }`}
        />
      </div>
    </button>
  );
};

export default MobileMenuButton;

