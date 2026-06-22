package repository

import (
	"context"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StoryFilter struct {
	Search     string
	Difficulty string
	GenreSlug  string
	Status     string
	Page       int
	PageSize   int
}

type StoryRepository interface {
	Create(ctx context.Context, story *domain.Story) error
	Update(ctx context.Context, story *domain.Story) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Story, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Story, error)
	GetByGutenbergID(ctx context.Context, gutenbergID int) (*domain.Story, error)
	List(ctx context.Context, filter StoryFilter) ([]domain.Story, int64, error)
	CountAll(ctx context.Context) (int64, error)
	SetGenres(ctx context.Context, storyID uuid.UUID, genreIDs []uint) error
}

type storyRepository struct {
	db *gorm.DB
}

func NewStoryRepository(db *gorm.DB) StoryRepository {
	return &storyRepository{db: db}
}

func (r *storyRepository) Create(ctx context.Context, story *domain.Story) error {
	return r.db.WithContext(ctx).Create(story).Error
}

func (r *storyRepository) Update(ctx context.Context, story *domain.Story) error {
	return r.db.WithContext(ctx).Save(story).Error
}

func (r *storyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.Story{}, "id = ?", id).Error
}

func (r *storyRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Story, error) {
	var story domain.Story
	if err := r.db.WithContext(ctx).Preload("Genres").Preload("Creator").First(&story, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &story, nil
}

func (r *storyRepository) GetBySlug(ctx context.Context, slug string) (*domain.Story, error) {
	var story domain.Story
	if err := r.db.WithContext(ctx).Preload("Genres").Preload("Creator").First(&story, "slug = ?", slug).Error; err != nil {
		return nil, err
	}
	return &story, nil
}

func (r *storyRepository) GetByGutenbergID(ctx context.Context, gutenbergID int) (*domain.Story, error) {
	var story domain.Story
	if err := r.db.WithContext(ctx).Preload("Genres").Preload("Creator").First(&story, "gutenberg_id = ?", gutenbergID).Error; err != nil {
		return nil, err
	}
	return &story, nil
}

func (r *storyRepository) List(ctx context.Context, filter StoryFilter) ([]domain.Story, int64, error) {
	query := r.db.WithContext(ctx).Model(&domain.Story{})

	if filter.Search != "" {
		search := "%" + filter.Search + "%"
		query = query.Where("title ILIKE ? OR author ILIKE ?", search, search)
	}

	if filter.Difficulty != "" {
		query = query.Where("difficulty = ?", filter.Difficulty)
	}

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	if filter.GenreSlug != "" {
		query = query.Joins("JOIN story_genres sg ON sg.story_id = stories.id").
			Joins("JOIN genres g ON g.id = sg.genre_id").
			Where("g.slug = ?", filter.GenreSlug)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 12
	}

	offset := (filter.Page - 1) * filter.PageSize

	var stories []domain.Story
	if err := query.Preload("Genres").
		Order("created_at DESC").
		Offset(offset).Limit(filter.PageSize).
		Find(&stories).Error; err != nil {
		return nil, 0, err
	}

	return stories, total, nil
}

func (r *storyRepository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&domain.Story{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *storyRepository) SetGenres(ctx context.Context, storyID uuid.UUID, genreIDs []uint) error {
	story := &domain.Story{ID: storyID}
	var genres []domain.Genre
	if len(genreIDs) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ?", genreIDs).Find(&genres).Error; err != nil {
			return err
		}
	}
	return r.db.WithContext(ctx).Model(story).Association("Genres").Replace(genres)
}
