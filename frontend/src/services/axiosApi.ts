import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from '../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class AxiosApiService {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string) {
    // Validar e normalizar baseURL
    let normalizedBaseURL = baseURL || '';
    
    // Se baseURL estiver vazio, tentar usar window.location.origin em desenvolvimento
    if (!normalizedBaseURL && typeof window !== 'undefined') {
      // Em desenvolvimento, usar a origem atual
      normalizedBaseURL = window.location.origin;
      console.warn('⚠️ [AxiosApi] BASE_URL não configurado, usando origem atual:', normalizedBaseURL);
    }
    
    // Remover barra final se houver
    if (normalizedBaseURL.endsWith('/')) {
      normalizedBaseURL = normalizedBaseURL.slice(0, -1);
    }

    console.log('🔧 [AxiosApi] Inicializando com baseURL:', normalizedBaseURL || '(vazio - usando URLs relativas)');

    this.axiosInstance = axios.create({
      baseURL: normalizedBaseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Interceptor para adicionar token automaticamente
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Sempre buscar o token mais recente do localStorage a cada requisição
        const currentToken = localStorage.getItem('token');
        
        // Garantir que headers existe
        if (!config.headers) {
          config.headers = {} as any;
        }
        
        if (currentToken && currentToken !== 'null' && currentToken !== 'undefined' && currentToken.trim() !== '') {
          config.headers['Authorization'] = `Bearer ${currentToken}`;
          console.log('🔐 [AxiosApi] Token enviado para:', config.url, '| Token:', currentToken.substring(0, 20) + '...');
        } else {
          console.warn('⚠️ [AxiosApi] ATENÇÃO: Token não encontrado!', {
            url: config.url,
            tokenNoStorage: currentToken,
            headers: config.headers
          });
        }
        
        return config;
      },
      (error) => {
        console.error('❌ [AxiosApi] Erro no interceptor de request:', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para tratamento de respostas
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        console.error('API Error:', error);
        
        if (error.response) {
          // Erro de resposta do servidor
          const status = error.response.status;
          const data = error.response.data as any;
          
          if (status === 401) {
            // Token expirado ou inválido
            console.warn('⚠️ [AxiosApi] Erro 401 - Token inválido ou expirado. Redirecionando para login...');
            this.clearToken();
            
            // Evitar loop infinito - só redirecionar se não estiver já na página de login
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            
            return Promise.reject(new Error('Sessão expirada. Faça login novamente.'));
          }
          
          return Promise.reject(new Error(data?.message || `HTTP error! status: ${status}`));
        } else if (error.request) {
          // Erro de rede
          return Promise.reject(new Error('Erro de conexão. Verifique sua internet.'));
        } else {
          // Outros erros
          return Promise.reject(new Error(error.message || 'Erro desconhecido'));
        }
      }
    );

    this.token = localStorage.getItem('token');
  }

  // Método para atualizar o token quando necessário
  updateToken() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    console.warn('🧹 [AxiosApi] clearToken() chamado - REMOVENDO TOKEN');
    console.trace('Stack trace de quem chamou clearToken:');
    this.token = null;
    localStorage.removeItem('token');
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      // Validar endpoint
      if (!endpoint || !endpoint.startsWith('/')) {
        console.error('❌ [AxiosApi] Endpoint inválido:', endpoint);
        return {
          success: false,
          error: `Endpoint inválido: ${endpoint}. Deve começar com "/"`,
        };
      }

      const response = await this.axiosInstance.get(endpoint, { params });
      
      // Se o backend já retorna { success, data }, retornar direto
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }
      
      // Caso contrário, envolver na estrutura padrão
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ [AxiosApi] Erro na requisição GET:', {
        endpoint,
        params,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      return {
        success: false,
        error: error?.response?.data?.error || error?.response?.data?.message || (error instanceof Error ? error.message : 'Unknown error'),
      };
    }
  }

  // POST request
  async post<T>(endpoint: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(endpoint, data, config);
      
      // Se o backend já retorna { success, data }, retornar direto
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }
      
      // Caso contrário, envolver na estrutura padrão
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put(endpoint, data);
      
      // Se o backend já retorna { success, data }, retornar direto
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }
      
      // Caso contrário, envolver na estrutura padrão
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch(endpoint, data);
      
      // Se o backend já retorna { success, data }, retornar direto
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }
      
      // Caso contrário, envolver na estrutura padrão
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // DELETE request
  async delete<T>(endpoint: string, config?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete(endpoint, config);
      
      // Se o backend já retorna { success, data }, retornar direto
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }
      
      // Caso contrário, envolver na estrutura padrão
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Upload de arquivos
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Se o backend já retorna { success, data }, retornar direto
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        return response.data as ApiResponse<T>;
      }
      
      // Caso contrário, envolver na estrutura padrão
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const axiosApiService = new AxiosApiService(API_CONFIG.BASE_URL);
