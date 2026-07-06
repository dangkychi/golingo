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

export interface UpdateProfilePayload {
  username: string;
  avatar_url?: string;
}

export interface UpdatePasswordPayload {
  new_password: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface LoginResponse {
  message: string;
  requires_2fa?: boolean;
  pre_auth_token?: string;
  user?: AuthUser;
  tokens?: TokenPair;
}

export const authAPI = {
  register: (data: RegisterPayload) =>
    apiClient.post<RegisterResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  googleLogin: (token: string) =>
    apiClient.post<LoginResponse>('/auth/google', { token }),

  login2FA: (preAuthToken: string, code: string) =>
    apiClient.post<LoginResponse>('/auth/2fa/login', { pre_auth_token: preAuthToken, code }),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (payload: { token: string; new_password: string }) =>
    apiClient.post<{ message: string }>('/auth/reset-password', payload),

  setup2FA: () =>
    apiClient.post<{ secret: string; qr_code_url: string }>('/auth/2fa/setup'),

  enable2FA: (code: string) =>
    apiClient.post<{ message: string }>('/auth/2fa/enable', { code }),

  disable2FA: (code: string) =>
    apiClient.post<{ message: string }>('/auth/2fa/disable', { code }),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refresh_token: refreshToken }),

  getMe: () => apiClient.get<{ user: AuthUser }>('/auth/me'),

  updateProfile: (data: UpdateProfilePayload) =>
    apiClient.put<{ message: string; user: AuthUser }>('/users/profile', data),

  updatePassword: (data: UpdatePasswordPayload) =>
    apiClient.put<{ message: string }>('/users/password', data),
};
