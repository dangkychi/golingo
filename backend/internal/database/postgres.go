package database

import (
	"fmt"
	"log"

	"github.com/golingo/backend/internal/config"
	"github.com/golingo/backend/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewPostgresDB(cfg config.DBConfig) (*gorm.DB, error) {
	var logLevel logger.LogLevel
	logLevel = logger.Info

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("✓ Connected to PostgreSQL")
	return db, nil
}

// AutoMigrate runs GORM auto migration for all domain models
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.User{},
		&domain.Genre{},
		&domain.Story{},
		&domain.Chapter{},
		&domain.VocabularyEntry{},
		&domain.UserVocabulary{},
		&domain.FlashcardReview{},
		&domain.ReadingProgress{},
		&domain.RefreshToken{},
	)
}
