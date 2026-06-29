package repository

import (
	"context"
	"time"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type FlashcardRepository interface {
	GetDueCards(ctx context.Context, userID uuid.UUID, limit int) ([]domain.UserVocabulary, error)
	CreateReview(ctx context.Context, review *domain.FlashcardReview) error
	GetReviewsByUser(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]domain.FlashcardReview, error)
	GetReviewStats(ctx context.Context, userID uuid.UUID) (int64, float64, error)
}

type flashcardRepository struct {
	db *gorm.DB
}

func NewFlashcardRepository(db *gorm.DB) FlashcardRepository {
	return &flashcardRepository{db: db}
}

func (r *flashcardRepository) GetDueCards(ctx context.Context, userID uuid.UUID, limit int) ([]domain.UserVocabulary, error) {
	var cards []domain.UserVocabulary
	// Fetch vocabularies where next_review_at <= now, ordered by next_review_at ascending (most overdue first)
	err := r.db.WithContext(ctx).
		Preload("Entry").
		Where("user_id = ? AND next_review_at <= ?", userID, time.Now()).
		Order("next_review_at ASC").
		Limit(limit).
		Find(&cards).Error

	if err != nil {
		return nil, err
	}
	return cards, nil
}

func (r *flashcardRepository) CreateReview(ctx context.Context, review *domain.FlashcardReview) error {
	return r.db.WithContext(ctx).Create(review).Error
}

func (r *flashcardRepository) GetReviewsByUser(ctx context.Context, userID uuid.UUID, from, to time.Time) ([]domain.FlashcardReview, error) {
	var reviews []domain.FlashcardReview
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND reviewed_at BETWEEN ? AND ?", userID, from, to).
		Order("reviewed_at ASC").
		Find(&reviews).Error

	if err != nil {
		return nil, err
	}
	return reviews, nil
}

func (r *flashcardRepository) GetReviewStats(ctx context.Context, userID uuid.UUID) (int64, float64, error) {
	var totalReviews int64
	var goodReviews int64

	// Count total reviews
	if err := r.db.WithContext(ctx).Model(&domain.FlashcardReview{}).Where("user_id = ?", userID).Count(&totalReviews).Error; err != nil {
		return 0, 0, err
	}

	if totalReviews == 0 {
		return 0, 0, nil
	}

	// Count reviews with quality >= 3 (considered correct/remembered in SM-2)
	if err := r.db.WithContext(ctx).Model(&domain.FlashcardReview{}).Where("user_id = ? AND quality >= 3", userID).Count(&goodReviews).Error; err != nil {
		return 0, 0, err
	}

	accuracy := (float64(goodReviews) / float64(totalReviews)) * 100.0
	return totalReviews, accuracy, nil
}
