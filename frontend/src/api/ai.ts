import apiClient from './client';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export const aiAPI = {
  explain: (text: string, context: string) =>
    apiClient.post<{ explanation: string }>('/ai/explain', { text, context }),

  summarize: (chapterId: string) =>
    apiClient.post<{ summary: string }>(`/ai/summarize/${chapterId}`),

  quiz: (chapterId: string) =>
    apiClient.post<QuizQuestion[]>(`/ai/quiz/${chapterId}`),
};
