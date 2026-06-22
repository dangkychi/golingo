package handler

import (
	"net/http"
	"strconv"

	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/dangkychi/GOLingo/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StoryHandler struct {
	storyService service.StoryService
}

func NewStoryHandler(storyService service.StoryService) *StoryHandler {
	return &StoryHandler{storyService: storyService}
}

// --- Public endpoints ---

func (h *StoryHandler) ListStories(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))

	filter := repository.StoryFilter{
		Search:     c.Query("search"),
		Difficulty: c.Query("difficulty"),
		GenreSlug:  c.Query("genre"),
		Status:     c.Query("status"),
		Page:       page,
		PageSize:   pageSize,
	}

	stories, total, err := h.storyService.ListStories(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stories":   stories,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *StoryHandler) GetStory(c *gin.Context) {
	slug := c.Param("slug")
	story, err := h.storyService.GetStoryBySlug(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Story not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"story": story})
}

func (h *StoryHandler) ListChapters(c *gin.Context) {
	slug := c.Param("slug")
	chapters, err := h.storyService.ListChapters(c.Request.Context(), slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"chapters": chapters})
}

func (h *StoryHandler) GetChapter(c *gin.Context) {
	slug := c.Param("slug")
	num, err := strconv.Atoi(c.Param("num"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter number"})
		return
	}

	chapter, story, err := h.storyService.GetChapter(c.Request.Context(), slug, num)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Get total chapter count for navigation
	chapters, _ := h.storyService.ListChapters(c.Request.Context(), slug)

	c.JSON(http.StatusOK, gin.H{
		"chapter":        chapter,
		"story":          gin.H{"id": story.ID, "title": story.Title, "slug": story.Slug},
		"total_chapters": len(chapters),
	})
}

func (h *StoryHandler) ListGenres(c *gin.Context) {
	genres, err := h.storyService.ListGenres(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"genres": genres})
}

// --- Admin endpoints ---

func (h *StoryHandler) AdminGetStory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid story ID"})
		return
	}

	story, err := h.storyService.GetStoryByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Story not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"story": story})
}

func (h *StoryHandler) AdminCreateStory(c *gin.Context) {
	var input service.CreateStoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := extractUserID(c)
	input.CreatedBy = userID

	story, err := h.storyService.CreateStory(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"story": story})
}

func (h *StoryHandler) AdminUpdateStory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid story ID"})
		return
	}

	var input service.UpdateStoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	story, err := h.storyService.UpdateStory(c.Request.Context(), id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"story": story})
}

func (h *StoryHandler) AdminDeleteStory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid story ID"})
		return
	}

	if err := h.storyService.DeleteStory(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Story deleted successfully"})
}

func (h *StoryHandler) AdminCreateChapter(c *gin.Context) {
	storyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid story ID"})
		return
	}

	var input service.CreateChapterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	chapter, err := h.storyService.CreateChapter(c.Request.Context(), storyID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"chapter": chapter})
}

func (h *StoryHandler) AdminUpdateChapter(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter ID"})
		return
	}

	var input service.UpdateChapterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	chapter, err := h.storyService.UpdateChapter(c.Request.Context(), id, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"chapter": chapter})
}

func (h *StoryHandler) AdminDeleteChapter(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chapter ID"})
		return
	}

	if err := h.storyService.DeleteChapter(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Chapter deleted successfully"})
}

// --- Gutenberg ---

func (h *StoryHandler) SearchGutenberg(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	result, err := h.storyService.SearchGutenberg(c.Request.Context(), query, page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

type ImportGutenbergRequest struct {
	GutenbergID int    `json:"gutenberg_id" binding:"required"`
	Difficulty  string `json:"difficulty" binding:"required"`
	GenreIDs    []uint `json:"genre_ids"`
}

func (h *StoryHandler) ImportGutenberg(c *gin.Context) {
	var req ImportGutenbergRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := extractUserID(c)

	story, err := h.storyService.ImportFromGutenberg(c.Request.Context(), req.GutenbergID, req.Difficulty, req.GenreIDs, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"story": story, "message": "Book imported successfully"})
}

// --- Helper ---

func extractUserID(c *gin.Context) uuid.UUID {
	val, _ := c.Get("user_id")
	switch v := val.(type) {
	case string:
		id, _ := uuid.Parse(v)
		return id
	case uuid.UUID:
		return v
	}
	return uuid.Nil
}
