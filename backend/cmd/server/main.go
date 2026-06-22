package main

import (
	"fmt"
	"log"

	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/dangkychi/GOLingo/internal/database"
	"github.com/dangkychi/GOLingo/internal/handler"
	"github.com/dangkychi/GOLingo/internal/pkg/logger"
	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/dangkychi/GOLingo/internal/service"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger (Console & File output)
	appLogger, err := logger.InitLogger(cfg.App.Env, cfg.App.LogFilePath)
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer func() {
		_ = appLogger.Sync()
	}()

	appLogger.Info("Initializing GOLingo services...")

	// Connect to PostgreSQL
	db, err := database.NewPostgresDB(cfg.DB)
	if err != nil {
		appLogger.Fatal("PostgreSQL connection failed", zap.Error(err))
	}

	// Run raw SQL migrations (tạo schema & seed genres)
	if err := database.RunSQLMigrations(cfg.DB, "migrations"); err != nil {
		appLogger.Error("SQL migrations failed", zap.Error(err))
	} else {
		appLogger.Info("Database SQL migrations completed successfully")
	}

	// Connect to Redis (optional in dev)
	redisClient, err := database.NewRedisClient(cfg.Redis)
	if err != nil {
		appLogger.Warn("Redis not available. Server will start without Redis cache.", zap.Error(err))
	} else {
		_ = redisClient // will be used by services later
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	tokenRepo := repository.NewRefreshTokenRepository(db)
	storyRepo := repository.NewStoryRepository(db)
	chapterRepo := repository.NewChapterRepository(db)
	genreRepo := repository.NewGenreRepository(db)

	// Initialize services
	authService := service.NewAuthService(cfg, userRepo, tokenRepo)
	userService := service.NewUserService(userRepo)
	storyService := service.NewStoryService(storyRepo, chapterRepo, genreRepo)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	storyHandler := handler.NewStoryHandler(storyService)
	adminHandler := handler.NewAdminHandler(userRepo, storyRepo, chapterRepo)

	// Setup router
	router := handler.SetupRouter(cfg, authHandler, userHandler, storyHandler, adminHandler)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.App.Port)
	appLogger.Info("🚀 GOLingo API server starting",
		zap.String("addr", addr),
		zap.String("env", cfg.App.Env),
		zap.String("health", fmt.Sprintf("http://localhost:%s/health", cfg.App.Port)),
		zap.String("api", fmt.Sprintf("http://localhost:%s/api/v1", cfg.App.Port)),
	)

	if err := router.Run(addr); err != nil {
		appLogger.Fatal("Failed to start server", zap.Error(err))
	}
}


