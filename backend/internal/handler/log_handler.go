package handler

import (
	"net/http"

	"github.com/dangkychi/GOLingo/internal/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type LogHandler struct{}

func NewLogHandler() *LogHandler {
	return &LogHandler{}
}

type ClientErrorLog struct {
	Message   string `json:"message" binding:"required"`
	URL       string `json:"url"`
	Stack     string `json:"stack"`
	UserAgent string `json:"user_agent"`
	UserID    string `json:"user_id"`
}

func (h *LogHandler) LogClientError(c *gin.Context) {
	var payload ClientErrorLog
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	logger.Log.Error("Client-side error occurred",
		zap.String("error_message", payload.Message),
		zap.String("url", payload.URL),
		zap.String("stack_trace", payload.Stack),
		zap.String("user_agent", payload.UserAgent),
		zap.String("user_id", payload.UserID),
		zap.String("source", "frontend"),
	)

	c.JSON(http.StatusOK, gin.H{"status": "logged"})
}
