import React, { useCallback, useEffect, useState } from 'react';
import { COMPANY_NAME } from '../config/constants';
import { getUploadUrl } from '../config/api';

type AuthLayoutProps = {
  children: React.ReactNode;
};

const NeonGlow = ({ variant }: { variant: 'brand' | 'form' }) => {
  if (variant === 'brand') {
    return (
      <>
        <div className="pointer-events-none absolute -top-28 -left-28 h-[22rem] w-[22rem] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 left-1/4 h-48 w-48 rounded-full bg-blue-400/25 blur-[100px]" />
      </>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-16 h-40 w-40 rounded-full bg-cyan-500/8 blur-2xl" />
    </>
  );
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const [loginLogoUrl, setLoginLogoUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const loadLoginLogo = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${baseUrl}/api/configuracoes/public/logo-login`);
        const data = await response.json();

        if (data.success && (data.data?.logoLoginUrl || data.data?.logoUrl)) {
          setLoginLogoUrl(data.data.logoLoginUrl || data.data.logoUrl);
        } else {
          setShowFallback(true);
        }
      } catch {
        setShowFallback(true);
      }
    };

    loadLoginLogo();
  }, []);

  const handleLogoError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      if (!loginLogoUrl) {
        setShowFallback(true);
        return;
      }
      const filename = loginLogoUrl.split('/').pop() || loginLogoUrl;
      const alternativeUrl = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api/configuracoes/logo/${filename}`
        : `/api/configuracoes/logo/${filename}`;

      if (!target.src.includes('/api/configuracoes/logo/')) {
        target.src = alternativeUrl;
      } else {
        target.style.display = 'none';
        setShowFallback(true);
      }
    },
    [loginLogoUrl]
  );

  const renderLogo = (className: string) => (
    <div className={className}>
      {loginLogoUrl && !showFallback ? (
        <img
          src={getUploadUrl(loginLogoUrl)}
          alt={COMPANY_NAME}
          className="h-auto w-full max-w-[280px] min-[1098px]:max-w-[380px] min-[1536px]:max-w-[440px] object-contain drop-shadow-2xl"
          crossOrigin="anonymous"
          onLoad={() => setShowFallback(false)}
          onError={handleLogoError}
        />
      ) : (
        <div className="text-4xl font-bold tracking-wider text-white drop-shadow-lg sm:text-5xl">
          S3E ENGENHARIA
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#060d18] lg:flex-row">
      <div className="relative hidden min-h-screen flex-col overflow-hidden border-r border-slate-800/80 lg:flex lg:w-[45%] xl:w-2/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0a1a2f] via-[#0d2847] to-[#060d18]" />
        <NeonGlow variant="brand" />
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-12">
          <div className="mx-auto flex w-full max-w-sm min-[1098px]:max-w-lg flex-col items-center gap-8 text-center">
            {renderLogo('flex justify-center')}
            <div className="space-y-4">
              <h1 className="font-serif text-3xl font-bold leading-snug tracking-tight text-white xl:text-4xl">
                <span className="bg-gradient-to-r from-sky-300 to-blue-400 bg-clip-text text-transparent">
                  S3E System
                </span>
              </h1>
              <p className="text-sm leading-relaxed text-slate-300/95">
                Software inteligente que conecta Gestão Comercial, projetos e operações e estoque com
                precisão.
              </p>
              <p className="text-xs font-medium uppercase tracking-widest text-sky-400/80">
                Ascendendo ideias e iluminando soluções
              </p>
            </div>
          </div>
        </div>
        <p className="relative z-10 shrink-0 px-12 pb-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {COMPANY_NAME}. Todos os direitos reservados.
        </p>
      </div>

      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080f1a] via-[#060d18] to-[#040810]" />
        <NeonGlow variant="form" />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mb-8 flex justify-center lg:hidden">
            {renderLogo('flex justify-center max-w-[220px]')}
          </div>

          <div className="mx-auto w-full max-w-md animate-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
