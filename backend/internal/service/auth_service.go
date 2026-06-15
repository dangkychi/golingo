package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/pkg/jwt"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type AuthService interface {
	Register(ctx context.Context, email, username, password string) (*domain.User, error)
	Login(ctx context.Context, identifier, password string) (*domain.User, *jwt.TokenPair, error)
	GoogleLogin(ctx context.Context, idToken string) (*domain.User, *jwt.TokenPair, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	Refresh(ctx context.Context, refreshTokenStr string) (*jwt.TokenPair, error)
	Logout(ctx context.Context, refreshTokenStr string) error
}

type authService struct {
	cfg        *config.Config
	userRepo   repository.UserRepository
	tokenRepo  repository.RefreshTokenRepository
}

func NewAuthService(
	cfg *config.Config,
	userRepo repository.UserRepository,
	tokenRepo repository.RefreshTokenRepository,
) AuthService {
	return &authService{
		cfg:       cfg,
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
	}
}

func (s *authService) Register(ctx context.Context, email, username, password string) (*domain.User, error) {
	// Check if email already exists
	if _, err := s.userRepo.GetByEmail(ctx, email); err == nil {
		return nil, errors.New("email already registered")
	}

	// Check if username already exists
	if _, err := s.userRepo.GetByUsername(ctx, username); err == nil {
		return nil, errors.New("username already taken")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &domain.User{
		ID:           uuid.New(),
		Email:        email,
		Username:     username,
		PasswordHash: string(hashedPassword),
		Role:         domain.RoleUser,
		IsActive:     true,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *authService) Login(ctx context.Context, identifier, password string) (*domain.User, *jwt.TokenPair, error) {
	var user *domain.User
	var err error

	// Try to find user by email first, then by username
	user, err = s.userRepo.GetByEmail(ctx, identifier)
	if err != nil {
		user, err = s.userRepo.GetByUsername(ctx, identifier)
		if err != nil {
			return nil, nil, errors.New("invalid email/username or password")
		}
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, errors.New("invalid email/username or password")
	}

	if !user.IsActive {
		return nil, nil, errors.New("user account is deactivated")
	}

	// Generate tokens
	accessToken, accessExpiry, err := jwt.GenerateAccessToken(user.ID, string(user.Role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessExpiry)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, refreshExpiry, err := jwt.GenerateRefreshToken(user.ID, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshExpiry)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Hash and store refresh token in database
	tokenHash := s.hashToken(refreshToken)
	tokenRecord := &domain.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: refreshExpiry,
	}

	if err := s.tokenRepo.Create(ctx, tokenRecord); err != nil {
		return nil, nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	return user, &jwt.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExpiry,
	}, nil
}

func (s *authService) GoogleLogin(ctx context.Context, idToken string) (*domain.User, *jwt.TokenPair, error) {
	// 1. Verify the ID token
	payload, err := idtoken.Validate(ctx, idToken, s.cfg.Google.ClientID)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid google id token: %w", err)
	}

	// 2. Extract user info
	email, ok := payload.Claims["email"].(string)
	if !ok || email == "" {
		return nil, nil, errors.New("email not found in google token")
	}

	// 3. Find user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// User does not exist, let's create one
		name, _ := payload.Claims["name"].(string)
		if name == "" {
			name = "user"
		}
		
		// generate a random username to avoid collisions
		username := fmt.Sprintf("%s_%s", name, uuid.New().String()[:6])

		// generate a strong random password hash
		randomPassword := uuid.New().String()
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)

		user = &domain.User{
			ID:           uuid.New(),
			Email:        email,
			Username:     username,
			PasswordHash: string(hashedPassword),
			Role:         domain.RoleUser,
			IsActive:     true,
		}

		if createErr := s.userRepo.Create(ctx, user); createErr != nil {
			return nil, nil, fmt.Errorf("failed to create oauth user: %w", createErr)
		}
	} else if !user.IsActive {
		return nil, nil, errors.New("user account is deactivated")
	}

	// 4. Generate tokens (same as login)
	accessToken, accessExpiry, err := jwt.GenerateAccessToken(user.ID, string(user.Role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessExpiry)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, refreshExpiry, err := jwt.GenerateRefreshToken(user.ID, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshExpiry)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Hash and store refresh token in database
	tokenHash := s.hashToken(refreshToken)
	tokenRecord := &domain.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: refreshExpiry,
	}

	if err := s.tokenRepo.Create(ctx, tokenRecord); err != nil {
		return nil, nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	return user, &jwt.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExpiry,
	}, nil
}


func (s *authService) Refresh(ctx context.Context, refreshTokenStr string) (*jwt.TokenPair, error) {
	// Validate token structure and signature
	userID, err := jwt.ValidateRefreshToken(refreshTokenStr, s.cfg.JWT.RefreshSecret)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Hash token to query database
	tokenHash := s.hashToken(refreshTokenStr)
	tokenRecord, err := s.tokenRepo.GetByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, errors.New("refresh token not found or revoked")
	}

	// Verify expiration
	if time.Now().After(tokenRecord.ExpiresAt) {
		_ = s.tokenRepo.DeleteByTokenHash(ctx, tokenHash)
		return nil, errors.New("refresh token expired")
	}

	// Generate new access and refresh tokens
	accessToken, accessExpiry, err := jwt.GenerateAccessToken(userID, string(tokenRecord.User.Role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	newRefreshToken, refreshExpiry, err := jwt.GenerateRefreshToken(userID, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshExpiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Remove old refresh token and store new one
	_ = s.tokenRepo.DeleteByTokenHash(ctx, tokenHash)

	newTokenHash := s.hashToken(newRefreshToken)
	newTokenRecord := &domain.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: newTokenHash,
		ExpiresAt: refreshExpiry,
	}

	if err := s.tokenRepo.Create(ctx, newTokenRecord); err != nil {
		return nil, fmt.Errorf("failed to store new refresh token: %w", err)
	}

	return &jwt.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresAt:    accessExpiry,
	}, nil
}

func (s *authService) Logout(ctx context.Context, refreshTokenStr string) error {
	tokenHash := s.hashToken(refreshTokenStr)
	return s.tokenRepo.DeleteByTokenHash(ctx, tokenHash)
}

func (s *authService) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *authService) hashToken(token string) string {
	h := sha256.New()
	h.Write([]byte(token))
	return hex.EncodeToString(h.Sum(nil))
}
