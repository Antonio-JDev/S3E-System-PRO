import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const authContext = useContext(AuthContext);
  
  if (!authContext) {
    console.error('❌ [ProtectedRoute] AuthContext não disponível!');
    return <Navigate to="/login" replace />;
  }
  
  const { isAuthenticated, isLoading, token } = authContext;
  
  // Log para debug
  console.log('🔐 [ProtectedRoute] Verificando autenticação...', {
    isLoading,
    isAuthenticated,
    hasToken: !!token,
    tokenInStorage: !!localStorage.getItem('token')
  });

  if (isLoading) {
    console.log('⏳ [ProtectedRoute] Carregando autenticação...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Carregando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.warn('⚠️ [ProtectedRoute] Usuário NÃO autenticado, redirecionando para login...');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ [ProtectedRoute] Usuário autenticado, renderizando conteúdo protegido');
  return <>{children}</>;
};

export default ProtectedRoute;

