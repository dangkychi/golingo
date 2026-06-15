package repository

import (
	"context"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RefreshTokenRepository interface {
	Create(ctx context.Context, token *domain.RefreshToken) error
	GetByTokenHash(ctx context.Context, hash string) (*domain.RefreshToken, error)
	DeleteByUserID(ctx context.Context, userID uuid.UUID) error
	DeleteByTokenHash(ctx context.Context, hash string) error
}

type refreshTokenRepository struct {
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) RefreshTokenRepository {
	return &refreshTokenRepository{db: db}
}

func (r *refreshTokenRepository) Create(ctx context.Context, token *domain.RefreshToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *refreshTokenRepository) GetByTokenHash(ctx context.Context, hash string) (*domain.RefreshToken, error) {
	var token domain.RefreshToken
	if err := r.db.WithContext(ctx).Preload("User").First(&token, "token_hash = ?", hash).Error; err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *refreshTokenRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&domain.RefreshToken{}, "user_id = ?", userID).Error
}

func (r *refreshTokenRepository) DeleteByTokenHash(ctx context.Context, hash string) error {
	return r.db.WithContext(ctx).Delete(&domain.RefreshToken{}, "token_hash = ?", hash).Error
}
