package repository

import (
	"context"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChapterRepository interface {
	Create(ctx context.Context, chapter *domain.Chapter) error
	Update(ctx context.Context, chapter *domain.Chapter) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Chapter, error)
	GetByStoryAndNum(ctx context.Context, storyID uuid.UUID, num int) (*domain.Chapter, error)
	ListByStoryID(ctx context.Context, storyID uuid.UUID) ([]domain.Chapter, error)
	CountByStoryID(ctx context.Context, storyID uuid.UUID) (int64, error)
	CountAll(ctx context.Context) (int64, error)
}

type chapterRepository struct {
	db *gorm.DB
}

func NewChapterRepository(db *gorm.DB) ChapterRepository {
	return &chapterRepository{db: db}
}

func (r *chapterRepository) Create(ctx context.Context, chapter *domain.Chapter) error {
	return r.db.WithContext(ctx).Create(chapter).Error
}

func (r *chapterRepository) Update(ctx context.Context, chapter *domain.Chapter) error {
	return r.db.WithContext(ctx).Save(chapter).Error
}

func (r *chapterRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Chapter{}, "id = ?", id).Error
}

func (r *chapterRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Chapter, error) {
	var chapter domain.Chapter
	if err := r.db.WithContext(ctx).First(&chapter, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &chapter, nil
}

func (r *chapterRepository) GetByStoryAndNum(ctx context.Context, storyID uuid.UUID, num int) (*domain.Chapter, error) {
	var chapter domain.Chapter
	if err := r.db.WithContext(ctx).First(&chapter, "story_id = ? AND chapter_num = ?", storyID, num).Error; err != nil {
		return nil, err
	}
	return &chapter, nil
}

func (r *chapterRepository) ListByStoryID(ctx context.Context, storyID uuid.UUID) ([]domain.Chapter, error) {
	var chapters []domain.Chapter
	if err := r.db.WithContext(ctx).
		Where("story_id = ?", storyID).
		Order("chapter_num ASC").
		Select("id", "story_id", "chapter_num", "title", "word_count", "created_at", "updated_at").
		Find(&chapters).Error; err != nil {
		return nil, err
	}
	return chapters, nil
}

func (r *chapterRepository) CountByStoryID(ctx context.Context, storyID uuid.UUID) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&domain.Chapter{}).Where("story_id = ?", storyID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *chapterRepository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&domain.Chapter{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
