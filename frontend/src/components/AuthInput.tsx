import React from 'react';

type AuthInputProps = {
  id: string;
  label?: string;
  type: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

const baseInputClass =
  'w-full rounded-xl border border-slate-600/50 bg-slate-800/60 py-3.5 text-white placeholder:text-slate-500 transition-all focus:border-sky-500/60 focus:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-sky-500/25 disabled:opacity-50';

const AuthInput: React.FC<AuthInputProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  autoComplete,
  minLength,
  icon,
  rightSlot,
}) => {
  const hasIcon = Boolean(icon);
  const hasRightSlot = Boolean(rightSlot);

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {hasIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          className={`${baseInputClass} ${hasIcon ? 'pl-11' : 'pl-4'} ${hasRightSlot ? 'pr-11' : 'pr-4'}`}
        />
        {hasRightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    </div>
  );
};

export default AuthInput;
