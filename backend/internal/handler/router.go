package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/dangkychi/GOLingo/internal/middleware"
)

func SetupRouter(cfg *config.Config, authHandler *AuthHandler) *gin.Engine {
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Global middlewares
	r.Use(middleware.CORSMiddleware(cfg))

	// Health check
	healthHandler := NewHealthHandler()
	r.GET("/health", healthHandler.HealthCheck)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/google", authHandler.GoogleLogin)
			auth.POST("/refresh", authHandler.Refresh)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/forgot-password", placeholderHandler("forgot_password"))
			auth.POST("/reset-password", placeholderHandler("reset_password"))
			
			// Protected auth route
			auth.GET("/me", middleware.AuthMiddleware(cfg), authHandler.GetMe)
		}

		// 2FA routes (authenticated)
		twofa := v1.Group("/auth/2fa")
		twofa.Use(middleware.AuthMiddleware(cfg))
		{
			twofa.POST("/enable", placeholderHandler("2fa_enable"))
			twofa.POST("/verify", placeholderHandler("2fa_verify"))
			twofa.POST("/disable", placeholderHandler("2fa_disable"))
		}

		// Stories routes (public with optional auth)
		stories := v1.Group("/stories")
		stories.Use(middleware.OptionalAuthMiddleware(cfg))
		{
			stories.GET("", placeholderHandler("list_stories"))
			stories.GET("/:slug", placeholderHandler("get_story"))
			stories.GET("/:slug/chapters", placeholderHandler("list_chapters"))
			stories.GET("/:slug/chapters/:num", placeholderHandler("get_chapter"))
		}

		// Protected routes (authenticated)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Vocabulary
			vocab := protected.Group("/vocabulary")
			{
				vocab.GET("", placeholderHandler("list_vocabulary"))
				vocab.POST("", placeholderHandler("save_vocabulary"))
				vocab.PUT("/:id", placeholderHandler("update_vocabulary"))
				vocab.DELETE("/:id", placeholderHandler("delete_vocabulary"))
				vocab.GET("/due", placeholderHandler("due_vocabulary"))
			}

			// Flashcard
			flashcard := protected.Group("/flashcard")
			{
				flashcard.GET("/session", placeholderHandler("flashcard_session"))
				flashcard.POST("/review", placeholderHandler("flashcard_review"))
				flashcard.GET("/stats", placeholderHandler("flashcard_stats"))
			}

			// Progress
			progress := protected.Group("/progress")
			{
				progress.GET("", placeholderHandler("get_progress"))
				progress.GET("/streak", placeholderHandler("get_streak"))
			}

			// Reading progress
			reading := protected.Group("/reading")
			{
				reading.POST("/progress", placeholderHandler("save_reading_progress"))
				reading.GET("/progress/:story_id", placeholderHandler("get_reading_progress"))
			}

			// AI features
			ai := protected.Group("/ai")
			{
				ai.POST("/explain", placeholderHandler("ai_explain"))
				ai.POST("/summarize/:chapter_id", placeholderHandler("ai_summarize"))
				ai.POST("/quiz/:chapter_id", placeholderHandler("ai_quiz"))
			}
		}

		// Admin routes
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg))
		admin.Use(middleware.AdminMiddleware())
		{
			// Admin stories
			admin.POST("/stories", placeholderHandler("admin_create_story"))
			admin.PUT("/stories/:id", placeholderHandler("admin_update_story"))
			admin.DELETE("/stories/:id", placeholderHandler("admin_delete_story"))

			// Admin chapters
			admin.POST("/stories/:id/chapters", placeholderHandler("admin_create_chapter"))
			admin.PUT("/chapters/:id", placeholderHandler("admin_update_chapter"))
			admin.DELETE("/chapters/:id", placeholderHandler("admin_delete_chapter"))

			// Admin users
			admin.GET("/users", placeholderHandler("admin_list_users"))
			admin.PUT("/users/:id/ban", placeholderHandler("admin_ban_user"))

			// Admin dashboard
			admin.GET("/dashboard", placeholderHandler("admin_dashboard"))
		}
	}

	return r
}

// placeholderHandler returns a handler that responds with a "not implemented" message.
// These will be replaced with real handlers as features are developed.
func placeholderHandler(name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": name + " endpoint - coming soon",
			"status":  "not_implemented",
		})
	}
}
