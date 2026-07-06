package handler

import (
	"net/http"

	"github.com/dangkychi/GOLingo/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TranslateHandler struct {
	translateService *service.TranslateService
	userService      service.UserService
}

func NewTranslateHandler(translateService *service.TranslateService, userService service.UserService) *TranslateHandler {
	return &TranslateHandler{
		translateService: translateService,
		userService:      userService,
	}
}

type TranslateRequest struct {
	Text             string `json:"text" binding:"required"`
	ContextParagraph string `json:"context_paragraph"`
	TargetLang       string `json:"target_lang"`
}

func (h *TranslateHandler) Translate(c *gin.Context) {
	var req TranslateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	targetLang := req.TargetLang

	// If target language is not provided, load from user settings
	if targetLang == "" {
		userIDVal, exists := c.Get("user_id")
		if exists {
			var userID uuid.UUID
			switch v := userIDVal.(type) {
			case string:
				userID, _ = uuid.Parse(v)
			case uuid.UUID:
				userID = v
			}

			user, err := h.userService.GetByID(c.Request.Context(), userID)
			if err == nil && user.TranslateTargetLang != "" {
				targetLang = user.TranslateTargetLang
			}
		}
	}

	// For now, let's check targetLang. If still empty, default to "vi"
	if targetLang == "" {
		targetLang = "vi"
	}

	translation, err := h.translateService.Translate(c.Request.Context(), req.Text, req.ContextParagraph, targetLang)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"translation": translation,
	})
}
