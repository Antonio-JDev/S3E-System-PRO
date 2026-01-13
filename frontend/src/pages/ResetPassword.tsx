import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { DEFAULT_LOGO_URL, COMPANY_NAME, SYSTEM_NAME } from '../config/constants';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validações
  const passwordMinLength = password.length >= 6;
  const passwordHasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = passwordMinLength && passwordHasSpecialChar;

  useEffect(() => {
    // Validar token ao carregar a página
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setTokenValid(false);
        toast.error('Token de recuperação não encontrado');
        return;
      }

      try {
        const response = await axiosApiService.get(`/api/auth/validate-reset-token?token=${token}`);
        if (response.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          toast.error('Token inválido ou expirado');
        }
      } catch (error) {
        setTokenValid(false);
        toast.error('Erro ao validar token');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!password || !confirmPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validar caractere especial
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    if (!specialCharRegex.test(password)) {
      toast.error('A senha deve conter pelo menos 1 caractere especial (!@#$%^&*...)');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosApiService.post('/api/auth/reset-password', {
        token,
        password
      });

      if (response.success) {
        toast.success('✅ Senha redefinida com sucesso!', {
          description: 'Você já pode fazer login com sua nova senha.'
        });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(response.error || 'Erro ao redefinir senha');
      }
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast.error(error?.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1a2f] via-[#0d2847] to-[#0a1a2f] px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-blue-200">Validando token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1a2f] via-[#0d2847] to-[#0a1a2f] px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Token Inválido</h2>
            <p className="text-gray-600 text-sm mb-6">
              O link de recuperação é inválido ou expirou. Por favor, solicite um novo link.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block w-full bg-gradient-to-r from-[#0a1a2f] to-[#0d2847] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Solicitar Novo Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1a2f] via-[#0d2847] to-[#0a1a2f] px-4">
      <div className="max-w-md w-full">
        {/* Logo e Título */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-[2px]">
            <img 
              src={DEFAULT_LOGO_URL}
              alt={COMPANY_NAME}
              className="h-40 w-auto object-contain drop-shadow-2xl"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('/api/uploads')) {
                  target.src = '/api/uploads/logos/logo-branca.png';
                } else {
                  target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'text-white text-5xl font-bold tracking-wider drop-shadow-lg';
                  fallback.textContent = 'S3E ENGENHARIA';
                  target.parentElement!.appendChild(fallback);
                }
              }}
            />
          </div>
          <p className="text-blue-200 text-lg font-medium tracking-wide">{SYSTEM_NAME}</p>
        </div>

        {/* Card de Redefinição */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Redefinir Senha</h2>
          <p className="text-gray-600 text-sm mb-6 text-center">
            Digite sua nova senha abaixo
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nova Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#0a1a2f] focus:border-transparent transition-all ${
                    password.length > 0 
                      ? (isPasswordValid ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50')
                      : 'border-gray-300'
                  }`}
                  placeholder="Digite sua nova senha"
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Validações da senha */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center gap-2 text-xs ${passwordMinLength ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordMinLength ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    Mínimo de 6 caracteres
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordHasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordHasSpecialChar ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    Pelo menos 1 caractere especial (!@#$%^&*...)
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#0a1a2f] focus:border-transparent transition-all ${
                    confirmPassword.length > 0
                      ? (passwordsMatch ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50')
                      : 'border-gray-300'
                  }`}
                  placeholder="Confirme sua nova senha"
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Feedback de confirmação */}
              {confirmPassword.length > 0 && (
                <div className="mt-2">
                  {passwordsMatch ? (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      As senhas coincidem
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-red-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      As senhas não coincidem
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botão de Redefinir */}
            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="w-full bg-gradient-to-r from-[#0a1a2f] to-[#0d2847] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redefinindo...
                </span>
              ) : (
                'Redefinir Senha'
              )}
            </button>
          </form>

          {/* Link para voltar ao login */}
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-[#0a1a2f] hover:underline">
              ← Voltar para o login
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
              Dev Antonio Junio
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

