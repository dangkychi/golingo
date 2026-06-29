import apiClient from './client';

export interface ReadingProgressDetail {
  story_id: string;
  story_title: string;
  story_slug: string;
  story_cover_url?: string;
  story_author?: string;
  last_read_chapter_id: string;
  last_read_chapter_num: number;
  last_read_chapter_title?: string;
  updated_at: string;
  total_chapters: number;
}

export interface LearningOverview {
  streak: number;
  vocab_stats: {
    new: number;
    learning: number;
    mastered: number;
    total: number;
  };
  reading_progress: ReadingProgressDetail[];
  heatmap: { [date: string]: number };
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  story_id: string;
  chapter_id: string;
  updated_at: string;
}

export const progressAPI = {
  getOverview: (timezoneOffset: number) => {
    return apiClient.get<LearningOverview>('/progress', {
      params: { timezone_offset: timezoneOffset },
    });
  },

  getStreak: (timezoneOffset: number) => {
    return apiClient.get<{ streak: number }>('/progress/streak', {
      params: { timezone_offset: timezoneOffset },
    });
  },

  saveReadingProgress: (storyId: string, chapterId: string) => {
    return apiClient.post<{ message: string }>('/reading/progress', {
      story_id: storyId,
      chapter_id: chapterId,
    });
  },

  getReadingProgress: (storyId: string) => {
    return apiClient.get<ReadingProgress>(`/reading/progress/${storyId}`);
  },
};
