import apiClient from './client';
import type { VocabularyItem } from './vocabulary';

export interface FlashcardStats {
  total_reviews: number;
  accuracy: number;
}

export const flashcardAPI = {
  getSession: () => {
    return apiClient.get<VocabularyItem[]>('/flashcard/session');
  },

  submitReview: (vocabId: string, quality: number) => {
    return apiClient.post<{ message: string; vocabulary: VocabularyItem }>('/flashcard/review', {
      vocab_id: vocabId,
      quality,
    });
  },

  getStats: () => {
    return apiClient.get<FlashcardStats>('/flashcard/stats');
  },

  getDueCount: () => {
    return apiClient.get<{ due_count: number }>('/vocabulary/due');
  },
};
