import React from 'react';
import { Link } from 'react-router-dom';

type AuthInlineLinkProps = {
  children: React.ReactNode;
  to?: string;
  href?: string;
  variant?: 'accent' | 'muted';
  className?: string;
};

const variantClass: Record<NonNullable<AuthInlineLinkProps['variant']>, string> = {
  accent: 'text-xs text-sky-400/90 transition-colors hover:text-sky-300',
  muted: 'text-slate-500 transition-colors hover:text-sky-400/90',
};

const AuthInlineLink: React.FC<AuthInlineLinkProps> = ({
  children,
  to,
  href,
  variant = 'accent',
  className = '',
}) => {
  const linkClass = `${variantClass[variant]} ${className}`.trim();

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
      </a>
    );
  }

  if (!to) {
    return <span className={linkClass}>{children}</span>;
  }

  return (
    <Link to={to} className={linkClass}>
      {children}
    </Link>
  );
};

export default AuthInlineLink;
