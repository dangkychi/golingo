package database

import (
	"errors"
	"fmt"
	"log"

	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
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


// RunSQLMigrations runs raw SQL migrations from a directory
func RunSQLMigrations(cfg config.DBConfig, migrationsDir string) error {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name, cfg.SSLMode)

	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsDir),
		dsn,
	)
	if err != nil {
		return fmt.Errorf("failed to initialize migrate: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to run migrate up: %w", err)
	}

	log.Println("✓ SQL migrations applied successfully")
	return nil
}

