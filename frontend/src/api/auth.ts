import apiClient from './client';

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  avatar_url?: string;
  totp_enabled: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  tokens: TokenPair;
}

export const authAPI = {
  register: (data: RegisterPayload) =>
    apiClient.post<RegisterResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  googleLogin: (token: string) =>
    apiClient.post<LoginResponse>('/auth/google', { token }),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refresh_token: refreshToken }),

  getMe: () => apiClient.get<{ user: AuthUser }>('/auth/me'),
};
