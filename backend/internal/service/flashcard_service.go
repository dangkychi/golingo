package service

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
)

type FlashcardService interface {
	GetSession(ctx context.Context, userID uuid.UUID) ([]domain.UserVocabulary, error)
	SubmitReview(ctx context.Context, userID, vocabID uuid.UUID, quality int) (*domain.UserVocabulary, error)
	GetStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error)
}

type flashcardService struct {
	flashRepo repository.FlashcardRepository
	vocabRepo repository.VocabularyRepository
	sessionLimit int
}

func NewFlashcardService(flashRepo repository.FlashcardRepository, vocabRepo repository.VocabularyRepository, sessionLimit int) FlashcardService {
	return &flashcardService{
		flashRepo:    flashRepo,
		vocabRepo:    vocabRepo,
		sessionLimit: sessionLimit,
	}
}

func (s *flashcardService) GetSession(ctx context.Context, userID uuid.UUID) ([]domain.UserVocabulary, error) {
	return s.flashRepo.GetDueCards(ctx, userID, s.sessionLimit)
}

func (s *flashcardService) SubmitReview(ctx context.Context, userID, vocabID uuid.UUID, quality int) (*domain.UserVocabulary, error) {
	if quality < 0 || quality > 5 {
		return nil, errors.New("invalid review quality, must be between 0 and 5")
	}

	vocab, err := s.vocabRepo.GetByID(ctx, vocabID)
	if err != nil {
		return nil, errors.New("vocabulary item not found")
	}

	if vocab.UserID != userID {
		return nil, errors.New("unauthorized review submission")
	}

	// Apply SM-2 Spaced Repetition Algorithm
	var interval int
	repetitions := vocab.Repetitions
	easeFactor := vocab.EaseFactor

	if quality >= 3 {
		if repetitions == 0 {
			interval = 1
		} else if repetitions == 1 {
			interval = 6
		} else {
			interval = int(math.Round(float64(vocab.IntervalDays) * easeFactor))
		}
		repetitions++
	} else {
		repetitions = 0
		interval = 1
	}

	// Calculate new ease factor
	// EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
	qFactor := float64(5 - quality)
	easeFactor = easeFactor + (0.1 - qFactor*(0.08+qFactor*0.02))
	if easeFactor < 1.3 {
		easeFactor = 1.3
	}

	vocab.Repetitions = repetitions
	vocab.EaseFactor = easeFactor
	vocab.IntervalDays = interval
	vocab.NextReviewAt = time.Now().AddDate(0, 0, interval)
	vocab.UpdatedAt = time.Now()

	// Update in vocabulary database
	if err := s.vocabRepo.Update(ctx, vocab); err != nil {
		return nil, err
	}

	// Create flashcard review record
	review := &domain.FlashcardReview{
		ID:          uuid.New(),
		UserVocabID: vocab.ID,
		UserID:      userID,
		Quality:     quality,
		ReviewedAt:  time.Now(),
	}

	if err := s.flashRepo.CreateReview(ctx, review); err != nil {
		// Log error but don't fail the whole operation since vocabulary is already updated
		// We can return the vocab
	}

	return vocab, nil
}

func (s *flashcardService) GetStats(ctx context.Context, userID uuid.UUID) (map[string]interface{}, error) {
	totalReviews, accuracy, err := s.flashRepo.GetReviewStats(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Retrieve vocabulary stats breakdown:
	// New: Repetitions = 0
	// Learning: Repetitions > 0 AND Repetitions < 4
	// Mastered: Repetitions >= 4

	return map[string]interface{}{
		"total_reviews": totalReviews,
		"accuracy":      accuracy,
	}, nil
}
