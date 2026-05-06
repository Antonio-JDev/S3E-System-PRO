import { axiosApiService } from './axiosApi';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin?: boolean;
  active: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  async login(data: LoginData) {
    const response = await axiosApiService.post<AuthResponse>('/api/auth/login', data);
    
    if (response.success && response.data) {
      axiosApiService.setToken(response.data.token);
    }
    
    return response;
  }

  async register(data: RegisterData) {
    const response = await axiosApiService.post<AuthResponse>('/api/auth/register', data);
    
    if (response.success && response.data) {
      axiosApiService.setToken(response.data.token);
    }
    
    return response;
  }

  async logout() {
    axiosApiService.clearToken();
  }

  async getProfile() {
    return axiosApiService.get<User>('/api/auth/profile');
  }

  async updateProfile(data: Partial<User>) {
    return axiosApiService.put<User>('/api/auth/profile', data);
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    return axiosApiService.put<{ message: string }>('/api/auth/change-password', data);
  }

  async forgotPassword(email: string) {
    return axiosApiService.post<{ message: string }>('/api/auth/forgot-password', { email });
  }

  async validateResetToken(token: string) {
    return axiosApiService.get<{ valid: boolean }>(`/api/auth/validate-reset-token?token=${token}`);
  }

  async resetPassword(token: string, password: string) {
    return axiosApiService.post<{ message: string }>('/api/auth/reset-password', { token, password });
  }

  isAuthenticated(): boolean {
    return !!axiosApiService['token'];
  }

  getToken(): string | null {
    return axiosApiService['token'];
  }
}

export const authService = new AuthService();
