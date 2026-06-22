package repository

import (
	"context"

	"github.com/dangkychi/GOLingo/internal/domain"
	"gorm.io/gorm"
)

type GenreRepository interface {
	ListAll(ctx context.Context) ([]domain.Genre, error)
	GetByID(ctx context.Context, id uint) (*domain.Genre, error)
}

type genreRepository struct {
	db *gorm.DB
}

func NewGenreRepository(db *gorm.DB) GenreRepository {
	return &genreRepository{db: db}
}

func (r *genreRepository) ListAll(ctx context.Context) ([]domain.Genre, error) {
	var genres []domain.Genre
	if err := r.db.WithContext(ctx).Order("name ASC").Find(&genres).Error; err != nil {
		return nil, err
	}
	return genres, nil
}

func (r *genreRepository) GetByID(ctx context.Context, id uint) (*domain.Genre, error) {
	var genre domain.Genre
	if err := r.db.WithContext(ctx).First(&genre, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &genre, nil
}
