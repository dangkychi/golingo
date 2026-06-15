package middleware

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/dangkychi/GOLingo/internal/config"
)

func CORSMiddleware(cfg *config.Config) gin.HandlerFunc {
	origins := strings.Split(cfg.Frontend.CORSOrigins, ",")
	for i, o := range origins {
		origins[i] = strings.TrimSpace(o)
	}

	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	})
}
