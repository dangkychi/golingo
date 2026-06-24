package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/dangkychi/GOLingo/internal/service"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.authService.Register(c.Request.Context(), req.Email, req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": gin.H{
			"id":                    user.ID,
			"email":                 user.Email,
			"username":              user.Username,
			"role":                  user.Role,
			"translate_target_lang": user.TranslateTargetLang,
			"created_at":            user.CreatedAt,
		},
	})
}

type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, tokens, err := h.authService.Login(c.Request.Context(), req.Identifier, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged in successfully",
		"user": gin.H{
			"id":                    user.ID,
			"email":                 user.Email,
			"username":              user.Username,
			"role":                  user.Role,
			"avatar_url":            user.AvatarURL,
			"totp_enabled":          user.TOTPEnabled,
			"translate_target_lang": user.TranslateTargetLang,
		},
		"tokens": tokens,
	})
}

type GoogleLoginRequest struct {
	Token string `json:"token" binding:"required"`
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, tokens, err := h.authService.GoogleLogin(c.Request.Context(), req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged in with Google successfully",
		"user": gin.H{
			"id":                    user.ID,
			"email":                 user.Email,
			"username":              user.Username,
			"role":                  user.Role,
			"avatar_url":            user.AvatarURL,
			"totp_enabled":          user.TOTPEnabled,
			"translate_target_lang": user.TranslateTargetLang,
		},
		"tokens": tokens,
	})
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.authService.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tokens": tokens,
	})
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.authService.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id string"})
			return
		}
	case uuid.UUID:
		userID = v
	default:
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id type"})
		return
	}

	user, err := h.authService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":                    user.ID,
			"email":                 user.Email,
			"username":              user.Username,
			"role":                  user.Role,
			"avatar_url":            user.AvatarURL,
			"totp_enabled":          user.TOTPEnabled,
			"translate_target_lang": user.TranslateTargetLang,
		},
	})
}
