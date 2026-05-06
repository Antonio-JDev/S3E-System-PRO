import { useState, useEffect, useCallback } from 'react';
import { axiosApiService } from '../services/axiosApi';

export interface User {
  id: string;
  name: string;
  setor?: string | null;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null
  });

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Atualizar token no serviço de API
      axiosApiService.setToken(token);
      
      // Verificar se o token é válido
      const response = await axiosApiService.get<User>('/api/auth/me');
      
      if (response.success && response.data) {
        setState({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          token
        });
      } else {
        // Token inválido
        logout();
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      logout();
    }
  }, []);

  // Verificar autenticação ao carregar
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await axiosApiService.post<{ user: User; token: string }>('/api/auth/login', {
        email,
        password
      });

      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Salvar token
        localStorage.setItem('token', token);
        axiosApiService.setToken(token);
        
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          token
        });
        
        return { success: true };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: response.message || 'Erro ao fazer login' };
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: 'Erro ao fazer login' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    axiosApiService.clearToken();
    
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null
    });
  }, []);

  const updateUser = useCallback((user: User) => {
    setState(prev => ({ ...prev, user }));
  }, []);

  return {
    ...state,
    login,
    logout,
    updateUser,
    checkAuth
  };
};