import apiClient from './client';

// --- Types ---
export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  description?: string;
  cover_url?: string;
  author?: string;
  difficulty: string;
  status: string;
  genres: Genre[];
  created_at: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_num: number;
  title?: string;
  content?: string;
  word_count: number;
  created_at: string;
}

export interface StoriesResponse {
  stories: Story[];
  total: number;
  page: number;
  page_size: number;
}

export interface StoryDetailResponse {
  story: Story;
}

export interface ChaptersResponse {
  chapters: Chapter[];
}

export interface ChapterDetailResponse {
  chapter: Chapter;
  story: { id: string; title: string; slug: string };
  total_chapters: number;
}

export interface GenresResponse {
  genres: Genre[];
}

// --- API ---
export const storiesAPI = {
  list: (params?: {
    search?: string;
    difficulty?: string;
    genre?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.get<StoriesResponse>('/stories', { params }),

  getBySlug: (slug: string) =>
    apiClient.get<StoryDetailResponse>(`/stories/${slug}`),

  getChapters: (slug: string) =>
    apiClient.get<ChaptersResponse>(`/stories/${slug}/chapters`),

  getChapter: (slug: string, num: number) =>
    apiClient.get<ChapterDetailResponse>(`/stories/${slug}/chapters/${num}`),

  getGenres: () => apiClient.get<GenresResponse>('/genres'),
};
