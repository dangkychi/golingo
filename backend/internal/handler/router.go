package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/dangkychi/GOLingo/internal/config"
	"github.com/dangkychi/GOLingo/internal/middleware"
)

func SetupRouter(
	cfg *config.Config,
	authHandler *AuthHandler,
	userHandler *UserHandler,
	storyHandler *StoryHandler,
	adminHandler *AdminHandler,
) *gin.Engine {
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Global middlewares
	r.Use(middleware.CORSMiddleware(cfg))

	// Health check
	healthHandler := NewHealthHandler()
	r.GET("/health", healthHandler.HealthCheck)

	logHandler := NewLogHandler()

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Client log endpoint (public, so frontend can log boot errors)
		v1.POST("/logs/error", logHandler.LogClientError)
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
			stories.GET("", storyHandler.ListStories)
			stories.GET("/:slug", storyHandler.GetStory)
			stories.GET("/:slug/chapters", storyHandler.ListChapters)
			stories.GET("/:slug/chapters/:num", storyHandler.GetChapter)
		}

		// Genres (public)
		v1.GET("/genres", storyHandler.ListGenres)

		// Protected routes (authenticated)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		{
			// Users
			users := protected.Group("/users")
			{
				users.PUT("/profile", userHandler.UpdateProfile)
				users.PUT("/password", userHandler.UpdatePassword)
			}

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

		// Editor/Admin routes (story management)
		editor := v1.Group("/admin")
		editor.Use(middleware.AuthMiddleware(cfg))
		editor.Use(middleware.EditorOrAdminMiddleware())
		{
			// Story CRUD
			editor.GET("/stories/:id", storyHandler.AdminGetStory)
			editor.POST("/stories", storyHandler.AdminCreateStory)
			editor.PUT("/stories/:id", storyHandler.AdminUpdateStory)
			editor.DELETE("/stories/:id", storyHandler.AdminDeleteStory)

			// Chapter CRUD
			editor.POST("/stories/:id/chapters", storyHandler.AdminCreateChapter)
			editor.PUT("/chapters/:id", storyHandler.AdminUpdateChapter)
			editor.DELETE("/chapters/:id", storyHandler.AdminDeleteChapter)

			// Gutenberg import
			editor.GET("/gutenberg/search", storyHandler.SearchGutenberg)
			editor.POST("/gutenberg/import", storyHandler.ImportGutenberg)
		}

		// Admin-only routes (user management, dashboard)
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(cfg))
		admin.Use(middleware.AdminMiddleware())
		{
			admin.GET("/dashboard", adminHandler.Dashboard)
			admin.GET("/users", adminHandler.ListUsers)
			admin.PUT("/users/:id/ban", adminHandler.ToggleBanUser)
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
