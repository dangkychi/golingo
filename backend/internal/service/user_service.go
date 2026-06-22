package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/dangkychi/GOLingo/internal/domain"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	UpdateProfile(ctx context.Context, userID uuid.UUID, username string, avatarURL *string) (*domain.User, error)
	UpdatePassword(ctx context.Context, userID uuid.UUID, newPassword string) error
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{
		userRepo: userRepo,
	}
}

func (s *userService) UpdateProfile(ctx context.Context, userID uuid.UUID, username string, avatarURL *string) (*domain.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Check if username is taken by another user
	if username != user.Username {
		if existingUser, err := s.userRepo.GetByUsername(ctx, username); err == nil && existingUser.ID != userID {
			return nil, errors.New("username already taken")
		}
		user.Username = username
	}

	user.AvatarURL = avatarURL

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	return user, nil
}

func (s *userService) UpdatePassword(ctx context.Context, userID uuid.UUID, newPassword string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	user.PasswordHash = string(hashedPassword)

	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}
