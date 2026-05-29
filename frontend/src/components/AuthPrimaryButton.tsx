import React from 'react';

type AuthPrimaryButtonProps = {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onClick?: () => void;
  className?: string;
};

const AuthPrimaryButton: React.FC<AuthPrimaryButtonProps> = ({
  children,
  type = 'button',
  disabled,
  isLoading,
  loadingText = 'Carregando...',
  onClick,
  className = '',
}) => {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-sky-500 hover:to-blue-600 hover:shadow-blue-800/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default AuthPrimaryButton;
