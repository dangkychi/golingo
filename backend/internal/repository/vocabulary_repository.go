package repository

import (
	"context"
	"errors"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type VocabularyRepository interface {
	Create(ctx context.Context, vocab *domain.UserVocabulary) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.UserVocabulary, error)
	GetBySelectedText(ctx context.Context, userID uuid.UUID, text string) (*domain.UserVocabulary, error)
	Update(ctx context.Context, vocab *domain.UserVocabulary) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, userID uuid.UUID, search string, storyID *uuid.UUID, page, pageSize int) ([]domain.UserVocabulary, int64, error)
	GetEntryByWord(ctx context.Context, word string) (*domain.VocabularyEntry, error)
	CreateEntry(ctx context.Context, entry *domain.VocabularyEntry) error
	GetDueCount(ctx context.Context, userID uuid.UUID) (int64, error)
}

type vocabularyRepository struct {
	db *gorm.DB
}

func NewVocabularyRepository(db *gorm.DB) VocabularyRepository {
	return &vocabularyRepository{db: db}
}

func (r *vocabularyRepository) Create(ctx context.Context, vocab *domain.UserVocabulary) error {
	return r.db.WithContext(ctx).Create(vocab).Error
}

func (r *vocabularyRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.UserVocabulary, error) {
	var vocab domain.UserVocabulary
	err := r.db.WithContext(ctx).Preload("Entry").First(&vocab, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &vocab, nil
}

func (r *vocabularyRepository) GetBySelectedText(ctx context.Context, userID uuid.UUID, text string) (*domain.UserVocabulary, error) {
	var vocab domain.UserVocabulary
	err := r.db.WithContext(ctx).Preload("Entry").First(&vocab, "user_id = ? AND selected_text = ?", userID, text).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &vocab, nil
}

func (r *vocabularyRepository) Update(ctx context.Context, vocab *domain.UserVocabulary) error {
	return r.db.WithContext(ctx).Save(vocab).Error
}

func (r *vocabularyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.UserVocabulary{}, "id = ?", id).Error
}

func (r *vocabularyRepository) List(ctx context.Context, userID uuid.UUID, search string, storyID *uuid.UUID, page, pageSize int) ([]domain.UserVocabulary, int64, error) {
	query := r.db.WithContext(ctx).Model(&domain.UserVocabulary{}).Where("user_id = ?", userID).Preload("Entry")

	if storyID != nil {
		query = query.Where("story_id = ?", *storyID)
	}

	if search != "" {
		s := "%" + search + "%"
		query = query.Where("selected_text ILIKE ? OR word ILIKE ? OR translation ILIKE ? OR user_note ILIKE ?", s, s, s, s)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	var list []domain.UserVocabulary
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&list).Error
	if err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

func (r *vocabularyRepository) GetEntryByWord(ctx context.Context, word string) (*domain.VocabularyEntry, error) {
	var entry domain.VocabularyEntry
	err := r.db.WithContext(ctx).First(&entry, "LOWER(word) = LOWER(?)", word).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &entry, nil
}

func (r *vocabularyRepository) CreateEntry(ctx context.Context, entry *domain.VocabularyEntry) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *vocabularyRepository) GetDueCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.UserVocabulary{}).
		Where("user_id = ? AND next_review_at <= NOW()", userID).
		Count(&count).Error
	if err != nil {
		return 0, err
	}
	return count, nil
}
