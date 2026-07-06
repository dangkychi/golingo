package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/pkg/jwt"
	"github.com/dangkychi/GOLingo/internal/pkg/mail"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type AuthService interface {
	Register(ctx context.Context, email, username, password string) (*domain.User, error)
	Login(ctx context.Context, identifier, password string) (*domain.User, *jwt.TokenPair, string, error)
	Login2FA(ctx context.Context, preAuthToken, code string) (*domain.User, *jwt.TokenPair, error)
	GoogleLogin(ctx context.Context, idToken string) (*domain.User, *jwt.TokenPair, string, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	Refresh(ctx context.Context, refreshTokenStr string) (*jwt.TokenPair, error)
	Logout(ctx context.Context, refreshTokenStr string) error

	// Password Reset
	ForgotPassword(ctx context.Context, email string) error
	ResetPassword(ctx context.Context, token, newPassword string) error

	// Two-Factor Authentication (2FA)
	Generate2FASecret(ctx context.Context, userID uuid.UUID) (secret string, qrCodeURL string, err error)
	Enable2FA(ctx context.Context, userID uuid.UUID, code string) error
	Disable2FA(ctx context.Context, userID uuid.UUID, code string) error
}

type authService struct {
	cfg        *config.Config
	userRepo   repository.UserRepository
	tokenRepo  repository.RefreshTokenRepository
	mailer     mail.Mailer
}

func NewAuthService(
	cfg *config.Config,
	userRepo repository.UserRepository,
	tokenRepo repository.RefreshTokenRepository,
	mailer mail.Mailer,
) AuthService {
	return &authService{
		cfg:       cfg,
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		mailer:    mailer,
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

func (s *authService) Login(ctx context.Context, identifier, password string) (*domain.User, *jwt.TokenPair, string, error) {
	var user *domain.User
	var err error

	// Try to find user by email first, then by username
	user, err = s.userRepo.GetByEmail(ctx, identifier)
	if err != nil {
		user, err = s.userRepo.GetByUsername(ctx, identifier)
		if err != nil {
			return nil, nil, "", errors.New("invalid email/username or password")
		}
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, "", errors.New("invalid email/username or password")
	}

	if !user.IsActive {
		return nil, nil, "", errors.New("user account is deactivated")
	}

	// Check if 2FA is enabled
	if user.TOTPEnabled {
		preAuthToken, err := jwt.GeneratePreAuthToken(user.ID, s.cfg.JWT.AccessSecret, 5*time.Minute)
		if err != nil {
			return nil, nil, "", fmt.Errorf("failed to generate pre-auth token: %w", err)
		}
		return user, nil, preAuthToken, nil
	}

	// Generate tokens
	accessToken, accessExpiry, err := jwt.GenerateAccessToken(user.ID, string(user.Role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessExpiry)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, refreshExpiry, err := jwt.GenerateRefreshToken(user.ID, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshExpiry)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate refresh token: %w", err)
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
		return nil, nil, "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return user, &jwt.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExpiry,
	}, "", nil
}

func (s *authService) GoogleLogin(ctx context.Context, idToken string) (*domain.User, *jwt.TokenPair, string, error) {
	// 1. Verify the ID token
	payload, err := idtoken.Validate(ctx, idToken, s.cfg.Google.ClientID)
	if err != nil {
		return nil, nil, "", fmt.Errorf("invalid google id token: %w", err)
	}

	// 2. Extract user info
	email, ok := payload.Claims["email"].(string)
	if !ok || email == "" {
		return nil, nil, "", errors.New("email not found in google token")
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
			return nil, nil, "", fmt.Errorf("failed to create oauth user: %w", createErr)
		}
	} else if !user.IsActive {
		return nil, nil, "", errors.New("user account is deactivated")
	}

	// Check if 2FA is enabled
	if user.TOTPEnabled {
		preAuthToken, err := jwt.GeneratePreAuthToken(user.ID, s.cfg.JWT.AccessSecret, 5*time.Minute)
		if err != nil {
			return nil, nil, "", fmt.Errorf("failed to generate pre-auth token: %w", err)
		}
		return user, nil, preAuthToken, nil
	}

	// 4. Generate tokens (same as login)
	accessToken, accessExpiry, err := jwt.GenerateAccessToken(user.ID, string(user.Role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessExpiry)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, refreshExpiry, err := jwt.GenerateRefreshToken(user.ID, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshExpiry)
	if err != nil {
		return nil, nil, "", fmt.Errorf("failed to generate refresh token: %w", err)
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
		return nil, nil, "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return user, &jwt.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    accessExpiry,
	}, "", nil
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

func (s *authService) Login2FA(ctx context.Context, preAuthToken, code string) (*domain.User, *jwt.TokenPair, error) {
	claims, err := jwt.ValidateAccessToken(preAuthToken, s.cfg.JWT.AccessSecret)
	if err != nil {
		return nil, nil, errors.New("invalid or expired pre-auth token")
	}

	if claims.Role != "pre-auth" {
		return nil, nil, errors.New("invalid token type")
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, nil, errors.New("user not found")
	}

	if !user.IsActive {
		return nil, nil, errors.New("user account is deactivated")
	}

	if user.TOTPSecret == nil || !user.TOTPEnabled {
		return nil, nil, errors.New("2FA is not enabled for this user")
	}

	valid := totp.Validate(code, *user.TOTPSecret)
	if !valid {
		return nil, nil, errors.New("invalid 2FA code")
	}

	// Generate normal tokens
	accessToken, accessExpiry, err := jwt.GenerateAccessToken(user.ID, string(user.Role), s.cfg.JWT.AccessSecret, s.cfg.JWT.AccessExpiry)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, refreshExpiry, err := jwt.GenerateRefreshToken(user.ID, s.cfg.JWT.RefreshSecret, s.cfg.JWT.RefreshExpiry)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Store refresh token
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

func (s *authService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		log.Printf("[FORGOT PASSWORD] Email %s not found in system", email)
		return nil
	}

	token := uuid.New().String()
	expiresAt := time.Now().Add(15 * time.Minute)

	user.PasswordResetToken = &token
	user.PasswordResetExpiresAt = &expiresAt

	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to save reset token: %w", err)
	}

	// Send reset email
	if err := s.mailer.SendResetPasswordEmail(user.Email, token); err != nil {
		return fmt.Errorf("failed to send reset email: %w", err)
	}

	return nil
}

func (s *authService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if token == "" {
		return errors.New("reset token is required")
	}

	user, err := s.userRepo.GetByPasswordResetToken(ctx, token)
	if err != nil {
		return errors.New("invalid or expired reset token")
	}

	if user.PasswordResetExpiresAt == nil || time.Now().After(*user.PasswordResetExpiresAt) {
		return errors.New("reset token has expired")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	user.PasswordHash = string(hashedPassword)
	user.PasswordResetToken = nil
	user.PasswordResetExpiresAt = nil

	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update user password: %w", err)
	}

	return nil
}

func (s *authService) Generate2FASecret(ctx context.Context, userID uuid.UUID) (string, string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", "", errors.New("user not found")
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "GOLingo",
		AccountName: user.Email,
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to generate totp key: %w", err)
	}

	secret := key.Secret()
	user.TOTPSecret = &secret
	// Keep TOTPEnabled = false until verified

	if err := s.userRepo.Update(ctx, user); err != nil {
		return "", "", fmt.Errorf("failed to save totp secret: %w", err)
	}

	return secret, key.URL(), nil
}

func (s *authService) Enable2FA(ctx context.Context, userID uuid.UUID, code string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}

	if user.TOTPEnabled {
		return errors.New("2FA is already enabled")
	}

	if user.TOTPSecret == nil {
		return errors.New("2FA secret has not been generated for this user")
	}

	valid := totp.Validate(code, *user.TOTPSecret)
	if !valid {
		return errors.New("invalid 2FA verification code")
	}

	user.TOTPEnabled = true
	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to enable 2FA: %w", err)
	}

	return nil
}

func (s *authService) Disable2FA(ctx context.Context, userID uuid.UUID, code string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}

	if !user.TOTPEnabled {
		return errors.New("2FA is not enabled")
	}

	if user.TOTPSecret == nil {
		return errors.New("no 2FA secret found")
	}

	valid := totp.Validate(code, *user.TOTPSecret)
	if !valid {
		return errors.New("invalid 2FA verification code")
	}

	user.TOTPEnabled = false
	user.TOTPSecret = nil
	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to disable 2FA: %w", err)
	}

	return nil
}

