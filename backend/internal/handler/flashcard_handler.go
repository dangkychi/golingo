package handler

import (
	"net/http"

	"github.com/dangkychi/GOLingo/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FlashcardHandler struct {
	flashService service.FlashcardService
}

func NewFlashcardHandler(flashService service.FlashcardService) *FlashcardHandler {
	return &FlashcardHandler{flashService: flashService}
}

func (h *FlashcardHandler) GetSession(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		var err error
		userID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}
	case uuid.UUID:
		userID = v
	}

	session, err := h.flashService.GetSession(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, session)
}

type SubmitReviewRequest struct {
	VocabID uuid.UUID `json:"vocab_id" binding:"required"`
	Quality int       `json:"quality" binding:"min=0,max=5"`
}

func (h *FlashcardHandler) SubmitReview(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		var err error
		userID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}
	case uuid.UUID:
		userID = v
	}

	var req SubmitReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vocab, err := h.flashService.SubmitReview(c.Request.Context(), userID, req.VocabID, req.Quality)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Review submitted successfully",
		"vocabulary": vocab,
	})
}

func (h *FlashcardHandler) GetStats(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		var err error
		userID, err = uuid.Parse(v)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}
	case uuid.UUID:
		userID = v
	}

	stats, err := h.flashService.GetStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
