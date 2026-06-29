package service

import (
	"context"
	"time"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
)

type ProgressService interface {
	SaveProgress(ctx context.Context, userID, storyID, chapterID uuid.UUID) error
	GetProgress(ctx context.Context, userID, storyID uuid.UUID) (*domain.ReadingProgress, error)
	GetLearningOverview(ctx context.Context, userID uuid.UUID, timezoneOffset int) (map[string]interface{}, error)
}

type progressService struct {
	progressRepo repository.ProgressRepository
}

func NewProgressService(progressRepo repository.ProgressRepository) ProgressService {
	return &progressService{progressRepo: progressRepo}
}

func (s *progressService) SaveProgress(ctx context.Context, userID, storyID, chapterID uuid.UUID) error {
	return s.progressRepo.SaveReadingProgress(ctx, userID, storyID, chapterID)
}

func (s *progressService) GetProgress(ctx context.Context, userID, storyID uuid.UUID) (*domain.ReadingProgress, error) {
	return s.progressRepo.GetReadingProgress(ctx, userID, storyID)
}

func (s *progressService) GetLearningOverview(ctx context.Context, userID uuid.UUID, timezoneOffset int) (map[string]interface{}, error) {
	// 1. Get user streak
	streak, err := s.progressRepo.GetStreak(ctx, userID, timezoneOffset)
	if err != nil {
		streak = 0
	}

	// 2. Get vocabulary breakdown
	newC, learningC, masteredC, totalC, err := s.progressRepo.GetVocabularyBreakdown(ctx, userID)
	vocabStats := map[string]int64{
		"new":      newC,
		"learning": learningC,
		"mastered": masteredC,
		"total":    totalC,
	}

	// 3. Get reading progress details
	readingProgress, err := s.progressRepo.GetReadingProgressDetails(ctx, userID)
	if err != nil {
		readingProgress = []domain.ReadingProgressDetail{}
	}

	// 4. Get heatmap data (last 365 days)
	// Calculate date from 365 days ago in UTC
	since := time.Now().AddDate(-1, 0, 0)
	heatmap, err := s.progressRepo.GetActivityHeatmap(ctx, userID, timezoneOffset, since)
	if err != nil {
		heatmap = make(map[string]int)
	}

	return map[string]interface{}{
		"streak":           streak,
		"vocab_stats":      vocabStats,
		"reading_progress": readingProgress,
		"heatmap":          heatmap,
	}, nil
}
