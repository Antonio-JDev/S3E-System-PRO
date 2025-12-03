import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { DEFAULT_LOGO_URL, COMPANY_NAME, SYSTEM_NAME } from '../config/constants';
import { getUploadUrl } from '../config/api';
import { configuracoesService } from '../services/configuracoesService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginLogoUrl, setLoginLogoUrl] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const { login, isLoading: authLoading } = useContext(AuthContext)!;
  const navigate = useNavigate();

  // Carregar logo da página de login ao montar o componente
  useEffect(() => {
    const loadLoginLogo = async () => {
      try {
        // Usar rota pública que não requer autenticação
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${baseUrl}/api/configuracoes/public/logo-login`);
        const data = await response.json();
        
        if (data.success && (data.data?.logoLoginUrl || data.data?.logoUrl)) {
          setLoginLogoUrl(data.data.logoLoginUrl || data.data.logoUrl);
        } else {
          // Se não houver logo, mostrar fallback
          setShowFallback(true);
        }
      } catch (error) {
        console.error('Erro ao carregar logo da página de login:', error);
        // Em caso de erro, mostrar fallback
        setShowFallback(true);
      }
    };

    loadLoginLogo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação básica
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
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1a2f] via-[#0d2847] to-[#0a1a2f] px-4">
      <div className="max-w-md w-full">
        {/* Logo e Título */}
        <div className="text-center mb-8 animate-fade-in">
          {/* Logo da Empresa */}
          <div className="inline-flex items-center justify-center mb-[2px]">
            {loginLogoUrl && !showFallback ? (
              <img 
                src={getUploadUrl(loginLogoUrl)}
                alt={COMPANY_NAME}
                className="h-40 w-auto object-contain drop-shadow-2xl"
                crossOrigin="anonymous"
                onLoad={() => {
                  console.log('✅ Logo da página de login carregada com sucesso');
                  setShowFallback(false);
                }}
                onError={(e) => {
                  console.error('❌ Erro ao carregar logo da página de login:', getUploadUrl(loginLogoUrl));
                  const target = e.currentTarget;
                  // Tentar URL alternativa usando endpoint específico
                  const filename = loginLogoUrl.split('/').pop() || loginLogoUrl;
                  const alternativeUrl = import.meta.env.VITE_API_URL 
                    ? `${import.meta.env.VITE_API_URL}/api/configuracoes/logo/${filename}`
                    : `/api/configuracoes/logo/${filename}`;
                  
                  if (!target.src.includes('/api/configuracoes/logo/')) {
                    console.log('🔄 Tentando URL alternativa:', alternativeUrl);
                    target.src = alternativeUrl;
                  } else {
                    // Se ainda falhar, mostrar fallback
                    console.log('⚠️ Exibindo fallback "S3E ENGENHARIA"');
                    target.style.display = 'none';
                    setShowFallback(true);
                  }
                }}
              />
            ) : (
              <div className="text-white text-5xl font-bold tracking-wider drop-shadow-lg">
                S3E ENGENHARIA
              </div>
            )}
          </div>
          <p className="text-blue-200 text-lg font-medium tracking-wide">{SYSTEM_NAME}</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Bem-vindo de volta</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1a2f] focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={isLoading}
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0a1a2f] focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#0a1a2f] to-[#0d2847] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Link de Esqueci a senha */}
          <div className="mt-6 text-center">
            <Link to="/forgot-password" className="text-sm text-[#0a1a2f] hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-blue-200 text-sm space-y-2">
          <p>© {new Date().getFullYear()} {COMPANY_NAME}. Todos os direitos reservados.</p>
          <p className="text-blue-300">
            Desenvolvido com carinho por:{' '}
            <a 
              href="https://antonio-jdev.github.io/portfolio-01/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold hover:text-white hover:underline transition-colors duration-200"
            >
              Dev Antonio Junior
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

