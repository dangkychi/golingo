package handler

import (
	"net/http"
	"strconv"

	"github.com/dangkychi/GOLingo/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ProgressHandler struct {
	progressService service.ProgressService
}

func NewProgressHandler(progressService service.ProgressService) *ProgressHandler {
	return &ProgressHandler{progressService: progressService}
}

func (h *ProgressHandler) GetOverview(c *gin.Context) {
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

	tzOffsetStr := c.DefaultQuery("timezone_offset", "0")
	tzOffset, err := strconv.Atoi(tzOffsetStr)
	if err != nil {
		tzOffset = 0
	}

	overview, err := h.progressService.GetLearningOverview(c.Request.Context(), userID, tzOffset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, overview)
}

func (h *ProgressHandler) GetStreak(c *gin.Context) {
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

	tzOffsetStr := c.DefaultQuery("timezone_offset", "0")
	tzOffset, err := strconv.Atoi(tzOffsetStr)
	if err != nil {
		tzOffset = 0
	}

	overview, err := h.progressService.GetLearningOverview(c.Request.Context(), userID, tzOffset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"streak": overview["streak"],
	})
}

type SaveReadingProgressRequest struct {
	StoryID   uuid.UUID `json:"story_id" binding:"required"`
	ChapterID uuid.UUID `json:"chapter_id" binding:"required"`
}

func (h *ProgressHandler) SaveProgress(c *gin.Context) {
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

	var req SaveReadingProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.progressService.SaveProgress(c.Request.Context(), userID, req.StoryID, req.ChapterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Reading progress saved successfully",
	})
}

func (h *ProgressHandler) GetProgress(c *gin.Context) {
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

	storyIDStr := c.Param("story_id")
	storyID, err := uuid.Parse(storyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid story id"})
		return
	}

	progress, err := h.progressService.GetProgress(c.Request.Context(), userID, storyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if progress == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "progress not found"})
		return
	}

	c.JSON(http.StatusOK, progress)
}
