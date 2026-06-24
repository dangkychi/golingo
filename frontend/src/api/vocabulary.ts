import apiClient from './client';

export interface VocabularyItem {
  id: string;
  user_id: string;
  entry_id?: string;
  word: string;
  selected_text: string;
  translation?: string;
  context_sentence?: string;
  user_note?: string;
  chapter_id?: string;
  story_id?: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
  updated_at: string;
  entry?: {
    id: string;
    word: string;
    phonetic?: string;
    definition: string;
    example?: string;
    part_of_speech?: string;
  };
}

export interface VocabularyListResponse {
  vocabulary: VocabularyItem[];
  total: number;
  page: number;
  page_size: number;
}

export const vocabularyAPI = {
  translate: (text: string, contextParagraph: string, targetLang?: string) => {
    return apiClient.post<{ translation: string }>('/ai/translate', {
      text,
      context_paragraph: contextParagraph,
      target_lang: targetLang,
    });
  },

  add: (data: {
    word: string;
    selected_text: string;
    translation?: string;
    context_sentence?: string;
    user_note?: string;
    chapter_id?: string;
    story_id?: string;
  }) => {
    return apiClient.post<{ message: string; vocabulary: VocabularyItem }>('/vocabulary', data);
  },

  update: (id: string, data: { translation?: string; user_note?: string }) => {
    return apiClient.put<{ message: string; vocabulary: VocabularyItem }>(`/vocabulary/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.delete<{ message: string }>(`/vocabulary/${id}`);
  },

  list: (params: { search?: string; story_id?: string; page?: number; page_size?: number }) => {
    return apiClient.get<VocabularyListResponse>('/vocabulary', { params });
  },

  updateSettings: (translateTargetLang: string) => {
    return apiClient.put<{ message: string; user: any }>('/users/settings', {
      translate_target_lang: translateTargetLang,
    });
  },
};
