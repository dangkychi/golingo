package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleUser   UserRole = "user"
	RoleEditor UserRole = "editor"
	RoleAdmin  UserRole = "admin"
)

type User struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email        string    `json:"email" gorm:"uniqueIndex;size:255;not null"`
	Username     string    `json:"username" gorm:"uniqueIndex;size:50;not null"`
	PasswordHash string    `json:"-" gorm:"size:255"`
	AvatarURL    *string   `json:"avatar_url"`
	Role         UserRole  `json:"role" gorm:"size:20;not null;default:'user'"`
	GoogleID     *string   `json:"-" gorm:"uniqueIndex;size:255"`
	TOTPSecret   *string   `json:"-" gorm:"size:255"`
	TOTPEnabled  bool      `json:"totp_enabled" gorm:"not null;default:false"`
	IsActive            bool      `json:"is_active" gorm:"not null;default:true"`
	PasswordResetToken     *string    `json:"-" gorm:"size:255"`
	PasswordResetExpiresAt *time.Time `json:"-"`
	TranslateTargetLang string    `json:"translate_target_lang" gorm:"size:10;not null;default:'vi'"`
	CreatedAt           time.Time `json:"created_at" gorm:"not null;default:now()"`
	UpdatedAt           time.Time `json:"updated_at" gorm:"not null;default:now()"`
}

type RefreshToken struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null"`
	TokenHash string    `json:"-" gorm:"size:255;uniqueIndex;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at" gorm:"not null;default:now()"`
	User      User      `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}
