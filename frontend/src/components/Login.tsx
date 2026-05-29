import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { COMPANY_NAME } from '../config/constants';
import AuthLayout from './AuthLayout';
import AuthInput from './AuthInput';
import AuthPrimaryButton from './AuthPrimaryButton';
import AuthInlineLink from './AuthInlineLink';

const Login: React.FC = () => {
  const DEFAULT_PORTFOLIO_URL = 'https://antonio-jdev.github.io/portfolio-01/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioUrl, setPortfolioUrl] = useState(DEFAULT_PORTFOLIO_URL);
  const { login } = useContext(AuthContext)!;
  const navigate = useNavigate();

  useEffect(() => {
    const loadPortfolioUrl = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${baseUrl}/api/configuracoes/public/portfolio-url`);
        const payload = await response.json();
        const apiUrl = payload?.data?.portfolioUrl;
        if (typeof apiUrl === 'string' && /^https?:\/\//i.test(apiUrl)) {
          setPortfolioUrl(apiUrl);
        }
      } catch {
        setPortfolioUrl(DEFAULT_PORTFOLIO_URL);
      }
    };
    loadPortfolioUrl();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erro ao fazer login. Verifique suas credenciais.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <header className="mb-8 text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Bem-vindo ao S3E System</h2>
        <p className="mt-2 text-sm text-slate-400">Por favor, entre com suas credenciais para continuar.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          disabled={isLoading}
          autoComplete="email"
          icon={<Mail className="h-5 w-5" />}
        />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Senha
                  </label>
                  <AuthInlineLink to="/forgot-password">Esqueci minha senha</AuthInlineLink>
                </div>
        <AuthInput
          id="password"
          label=""
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="current-password"
          icon={<Lock className="h-5 w-5" />}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

        <AuthPrimaryButton type="submit" isLoading={isLoading} loadingText="Entrando...">
          Entrar
        </AuthPrimaryButton>
      </form>

      <p className="mt-10 text-center text-xs text-slate-600 lg:hidden">© {new Date().getFullYear()} {COMPANY_NAME}</p>

      <p className="mt-6 text-center text-xs text-slate-600">
        Desenvolvido com carinho por{' '}
        <AuthInlineLink href={portfolioUrl} variant="muted">
          Dev Antonio Junior
        </AuthInlineLink>
      </p>
    </AuthLayout>
  );
};

export default Login;
