import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type AuthBackLinkProps = {
  to?: string;
  label?: string;
  className?: string;
};

const AuthBackLink: React.FC<AuthBackLinkProps> = ({
  to = '/login',
  label = 'Voltar para login',
  className = 'mt-6',
}) => {
  return (
    <div className={`${className} text-center`}>
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-sm text-sky-400/90 transition-colors hover:text-sky-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </div>
  );
};

export default AuthBackLink;
