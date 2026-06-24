package handler

import (
	"net/http"
	"strconv"

	"github.com/dangkychi/GOLingo/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type VocabularyHandler struct {
	vocabService service.VocabularyService
}

func NewVocabularyHandler(vocabService service.VocabularyService) *VocabularyHandler {
	return &VocabularyHandler{vocabService: vocabService}
}

type AddVocabularyRequest struct {
	Word            string     `json:"word" binding:"required"`
	SelectedText    string     `json:"selected_text"`
	Translation     *string    `json:"translation"`
	ContextSentence *string    `json:"context_sentence"`
	UserNote        *string    `json:"user_note"`
	ChapterID       *uuid.UUID `json:"chapter_id"`
	StoryID         *uuid.UUID `json:"story_id"`
}

func (h *VocabularyHandler) Add(c *gin.Context) {
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

	var req AddVocabularyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vocab, err := h.vocabService.AddWord(c.Request.Context(), userID, req.Word, req.SelectedText, req.Translation, req.ContextSentence, req.UserNote, req.ChapterID, req.StoryID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Vocabulary saved successfully",
		"vocabulary": vocab,
	})
}

type UpdateVocabularyRequest struct {
	Translation *string `json:"translation"`
	UserNote    *string `json:"user_note"`
}

func (h *VocabularyHandler) Update(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		userID, _ = uuid.Parse(v)
	case uuid.UUID:
		userID = v
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vocabulary id"})
		return
	}

	var req UpdateVocabularyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vocab, err := h.vocabService.UpdateVocabulary(c.Request.Context(), id, userID, req.Translation, req.UserNote)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Vocabulary updated successfully",
		"vocabulary": vocab,
	})
}

func (h *VocabularyHandler) Delete(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		userID, _ = uuid.Parse(v)
	case uuid.UUID:
		userID = v
	}

	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vocabulary id"})
		return
	}

	err = h.vocabService.DeleteVocabulary(c.Request.Context(), id, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vocabulary deleted successfully",
	})
}

func (h *VocabularyHandler) List(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var userID uuid.UUID
	switch v := userIDVal.(type) {
	case string:
		userID, _ = uuid.Parse(v)
	case uuid.UUID:
		userID = v
	}

	search := c.Query("search")
	storyIDStr := c.Query("story_id")
	var storyID *uuid.UUID
	if storyIDStr != "" {
		if sid, err := uuid.Parse(storyIDStr); err == nil {
			storyID = &sid
		}
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	list, total, err := h.vocabService.ListVocabulary(c.Request.Context(), userID, search, storyID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"vocabulary": list,
		"total":      total,
		"page":       page,
		"page_size":  pageSize,
	})
}
