import apiClient from './client';
import type { Story, Chapter } from './stories';

// --- Types ---
export interface DashboardStats {
  total_users: number;
  total_stories: number;
  total_chapters: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface GutenbergBook {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  formats: Record<string, string>;
  imported?: boolean;
}

export interface GutenbergSearchResult {
  count: number;
  next?: string;
  previous?: string;
  results: GutenbergBook[];
}

export interface CreateStoryPayload {
  title: string;
  description?: string;
  cover_url?: string;
  author?: string;
  difficulty: string;
  status?: string;
  genre_ids?: number[];
}

export interface CreateChapterPayload {
  title?: string;
  content: string;
}

// --- API ---
export const adminAPI = {
  // Dashboard
  getDashboard: () =>
    apiClient.get<DashboardStats>('/admin/dashboard'),

  // Users
  getUsers: (params?: { search?: string; page?: number; page_size?: number }) =>
    apiClient.get<UsersResponse>('/admin/users', { params }),

  toggleBanUser: (id: string) =>
    apiClient.put(`/admin/users/${id}/ban`),

  // Stories
  getStoryById: (id: string) =>
    apiClient.get<{ story: Story }>(`/admin/stories/${id}`),

  createStory: (data: CreateStoryPayload) =>
    apiClient.post<{ story: Story }>('/admin/stories', data),

  updateStory: (id: string, data: Partial<CreateStoryPayload>) =>
    apiClient.put<{ story: Story }>(`/admin/stories/${id}`, data),

  deleteStory: (id: string) =>
    apiClient.delete(`/admin/stories/${id}`),

  // Chapters
  createChapter: (storyId: string, data: CreateChapterPayload) =>
    apiClient.post<{ chapter: Chapter }>(`/admin/stories/${storyId}/chapters`, data),

  updateChapter: (id: string, data: Partial<CreateChapterPayload>) =>
    apiClient.put<{ chapter: Chapter }>(`/admin/chapters/${id}`, data),

  deleteChapter: (id: string) =>
    apiClient.delete(`/admin/chapters/${id}`),

  // Gutenberg
  searchGutenberg: (q: string, page?: number) =>
    apiClient.get<GutenbergSearchResult>('/admin/gutenberg/search', { params: { q, page } }),

  importGutenberg: (data: { gutenberg_id: number; difficulty: string; genre_ids?: number[] }) =>
    apiClient.post<{ story: Story; message: string }>('/admin/gutenberg/import', data),
};
