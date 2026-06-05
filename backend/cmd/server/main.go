package main

import (
	"fmt"
	"log"

	"github.com/golingo/backend/internal/config"
	"github.com/golingo/backend/internal/database"
	"github.com/golingo/backend/internal/handler"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to PostgreSQL
	db, err := database.NewPostgresDB(cfg.DB)
	if err != nil {
		log.Printf("⚠ PostgreSQL not available: %v", err)
		log.Println("  Server will start without database connection.")
		log.Println("  Make sure PostgreSQL is running (docker-compose up postgres)")
	} else {
		// Auto migrate models
		if err := database.AutoMigrate(db); err != nil {
			log.Printf("⚠ Auto migration failed: %v", err)
		} else {
			log.Println("✓ Database migration completed")
		}
		_ = db // will be used by repositories later
	}

	// Connect to Redis (optional in dev)
	redisClient, err := database.NewRedisClient(cfg.Redis)
	if err != nil {
		log.Printf("⚠ Redis not available: %v", err)
		log.Println("  Server will start without Redis cache.")
	} else {
		_ = redisClient // will be used by services later
	}

	// Setup router
	router := handler.SetupRouter(cfg)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.App.Port)
	log.Printf("🚀 GOLingo API server starting on %s", addr)
	log.Printf("   Environment: %s", cfg.App.Env)
	log.Printf("   Health: http://localhost:%s/health", cfg.App.Port)
	log.Printf("   API:    http://localhost:%s/api/v1", cfg.App.Port)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
