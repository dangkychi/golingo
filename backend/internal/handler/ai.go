package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/dangkychi/GOLingo/internal/service"
)

type AIHandler struct {
	aiService   service.AIService
	authService service.AuthService
	chapterRepo repository.ChapterRepository
}

func NewAIHandler(
	aiService service.AIService,
	authService service.AuthService,
	chapterRepo repository.ChapterRepository,
) *AIHandler {
	return &AIHandler{
		aiService:   aiService,
		authService: authService,
		chapterRepo: chapterRepo,
	}
}

type ExplainRequest struct {
	Text    string `json:"text" binding:"required"`
	Context string `json:"context" binding:"required"`
}

func (h *AIHandler) getUserTargetLang(c *gin.Context) string {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		return "vi" // Default fallback
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		var err error
		userID, err = uuid.Parse(v)
		if err != nil {
			return "vi"
		}
	case uuid.UUID:
		userID = v
	default:
		return "vi"
	}

	user, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		return "vi"
	}

	return user.TranslateTargetLang
}

func (h *AIHandler) Explain(c *gin.Context) {
	var req ExplainRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	targetLang := h.getUserTargetLang(c)
	explanation, err := h.aiService.Explain(c.Request.Context(), req.Text, req.Context, targetLang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"explanation": explanation,
	})
}

func (h *AIHandler) Summarize(c *gin.Context) {
	chapterIDStr := c.Param("chapter_id")
	zap.L().Info("[AI Summarize] Request received", zap.String("chapterID", chapterIDStr))

	chapterID, err := uuid.Parse(chapterIDStr)
	if err != nil {
		zap.L().Error("[AI Summarize] Invalid chapter ID", zap.String("chapterID", chapterIDStr), zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter ID format"})
		return
	}

	chapter, err := h.chapterRepo.GetByID(c.Request.Context(), chapterID)
	if err != nil {
		zap.L().Error("[AI Summarize] Chapter not found", zap.String("chapterID", chapterID.String()), zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{"error": "Chapter not found"})
		return
	}
	zap.L().Info("[AI Summarize] Chapter found", zap.Int("contentLength", len(chapter.Content)))

	targetLang := h.getUserTargetLang(c)
	zap.L().Info("[AI Summarize] Calling Gemini API", zap.String("targetLang", targetLang))

	summary, err := h.aiService.Summarize(c.Request.Context(), chapter.Content, targetLang)
	if err != nil {
		zap.L().Error("[AI Summarize] Gemini API failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	zap.L().Info("[AI Summarize] SUCCESS", zap.String("response", summary))
	c.JSON(http.StatusOK, gin.H{
		"summary": summary,
	})
}

func (h *AIHandler) Quiz(c *gin.Context) {
	chapterIDStr := c.Param("chapter_id")
	chapterID, err := uuid.Parse(chapterIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter ID format"})
		return
	}

	chapter, err := h.chapterRepo.GetByID(c.Request.Context(), chapterID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chapter not found"})
		return
	}

	targetLang := h.getUserTargetLang(c)
	quizJSON, err := h.aiService.GenerateQuiz(c.Request.Context(), chapter.Content, targetLang)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Unmarshal to verify it's a valid JSON structure and to return it as a structured object
	var quizObj interface{}
	if err := json.Unmarshal([]byte(quizJSON), &quizObj); err != nil {
		// Fallback to sending it as raw string if unmarshal failed
		c.JSON(http.StatusOK, gin.H{
			"quiz_raw": quizJSON,
			"error":    "Failed to parse AI response as JSON",
		})
		return
	}

	c.JSON(http.StatusOK, quizObj)
}
