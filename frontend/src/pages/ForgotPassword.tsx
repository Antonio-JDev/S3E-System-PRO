import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import AuthLayout from '../components/AuthLayout';
import AuthInput from '../components/AuthInput';
import AuthPrimaryButton from '../components/AuthPrimaryButton';
import AuthBackLink from '../components/AuthBackLink';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Por favor, informe seu email');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Por favor, informe um email válido');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axiosApiService.post('/api/auth/forgot-password', { email });
      
      if (response.success) {
        setEmailSent(true);
        toast.success('Email enviado com sucesso!', {
          description: 'Verifique sua caixa de entrada para redefinir sua senha.'
        });
      } else {
        toast.error(response.error || 'Erro ao enviar email de recuperação');
      }
    } catch (error: any) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      toast.error(error?.response?.data?.error || 'Erro ao enviar email de recuperação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {!emailSent ? (
        <>
          <header className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Recuperar acesso</h2>
            <p className="mt-2 text-sm text-slate-400">
              Informe seu e-mail para enviarmos o link de redefinição de senha.
            </p>
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
              required
              autoComplete="email"
              icon={<Mail className="h-5 w-5" />}
            />

            <AuthPrimaryButton type="submit" isLoading={isLoading} loadingText="Enviando...">
              Enviar e-mail
            </AuthPrimaryButton>
          </form>
        </>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/25 p-6 text-center">
          <h2 className="text-2xl font-bold text-emerald-300">E-mail enviado!</h2>
          <p className="mt-3 text-sm text-slate-300">
            Enviamos instruções para <strong>{email}</strong>. Verifique sua caixa de entrada.
          </p>
          <div className="mt-6 space-y-3">
            <AuthPrimaryButton onClick={() => navigate('/login')}>
              Voltar para login
            </AuthPrimaryButton>
            <button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              className="w-full rounded-xl border border-slate-600/50 py-3.5 font-semibold text-slate-200 transition-colors hover:bg-slate-800/50"
            >
              Enviar novamente
            </button>
          </div>
        </div>
      )}

      <AuthBackLink />
    </AuthLayout>
  );
};

export default ForgotPassword;

