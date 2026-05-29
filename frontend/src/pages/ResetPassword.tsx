import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthPrimaryButton from '../components/AuthPrimaryButton';
import AuthBackLink from '../components/AuthBackLink';

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

  return (
    <AuthLayout>
      {isValidating ? (
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-sky-400" />
          <p className="text-sm text-slate-300">Validando token...</p>
        </div>
      ) : !tokenValid ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-950/25 p-6 text-center">
          <h2 className="text-2xl font-bold text-red-300">Token inválido</h2>
          <p className="mt-3 text-sm text-slate-300">
            O link de recuperação é inválido ou expirou. Solicite um novo link.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 py-3.5 text-center font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-sky-500 hover:to-blue-600"
          >
            Solicitar novo link
          </Link>
        </div>
      ) : (
        <>
          <header className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Definir nova senha</h2>
            <p className="mt-2 text-sm text-slate-400">Crie sua nova senha para continuar.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <AuthInput
                      id="password"
                      label="Nova senha"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                      disabled={isLoading}
                      required
                      minLength={6}
                      icon={<Lock className="h-5 w-5" />}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      }
                    />
                    {password.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className={passwordMinLength ? 'text-emerald-400' : 'text-rose-400'}>
                          - Mínimo de 6 caracteres
                        </p>
                        <p className={passwordHasSpecialChar ? 'text-emerald-400' : 'text-rose-400'}>
                          - Pelo menos 1 caractere especial
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <AuthInput
                      id="confirmPassword"
                      label="Confirmar nova senha"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      disabled={isLoading}
                      required
                      minLength={6}
                      icon={<Lock className="h-5 w-5" />}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="rounded-md p-1 text-slate-500 transition-colors hover:text-slate-300"
                          aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      }
                    />
                    {confirmPassword.length > 0 && (
                      <p className={`mt-2 text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}
                      </p>
                    )}
                  </div>

                  <AuthPrimaryButton
                    type="submit"
                    disabled={!isPasswordValid || !passwordsMatch}
                    isLoading={isLoading}
                    loadingText="Redefinindo..."
                  >
                    Salvar nova senha
                  </AuthPrimaryButton>
          </form>
        </>
      )}

      <AuthBackLink />
    </AuthLayout>
  );
};

export default ResetPassword;

