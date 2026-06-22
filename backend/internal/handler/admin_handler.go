package handler

import (
	"net/http"
	"strconv"

	"github.com/dangkychi/GOLingo/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AdminHandler struct {
	userRepo    repository.UserRepository
	storyRepo   repository.StoryRepository
	chapterRepo repository.ChapterRepository
}

func NewAdminHandler(
	userRepo repository.UserRepository,
	storyRepo repository.StoryRepository,
	chapterRepo repository.ChapterRepository,
) *AdminHandler {
	return &AdminHandler{
		userRepo:    userRepo,
		storyRepo:   storyRepo,
		chapterRepo: chapterRepo,
	}
}

func (h *AdminHandler) Dashboard(c *gin.Context) {
	ctx := c.Request.Context()

	userCount, _ := h.userRepo.CountAll(ctx)
	storyCount, _ := h.storyRepo.CountAll(ctx)
	chapterCount, _ := h.chapterRepo.CountAll(ctx)

	c.JSON(http.StatusOK, gin.H{
		"total_users":    userCount,
		"total_stories":  storyCount,
		"total_chapters": chapterCount,
	})
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	ctx := c.Request.Context()
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")

	users, total, err := h.userRepo.ListAll(ctx, search, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users":     users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

func (h *AdminHandler) ToggleBanUser(c *gin.Context) {
	ctx := c.Request.Context()
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.IsActive = !user.IsActive
	if err := h.userRepo.Update(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	status := "activated"
	if !user.IsActive {
		status = "banned"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User " + status + " successfully",
		"user": gin.H{
			"id":        user.ID,
			"username":  user.Username,
			"email":     user.Email,
			"is_active": user.IsActive,
		},
	})
}
