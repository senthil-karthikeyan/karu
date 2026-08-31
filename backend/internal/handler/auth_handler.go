package handler

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"

	"backend/internal/auth"
	"backend/internal/model"
	"backend/internal/service"
)

type AuthHandler struct {
	authService service.AuthService
	gothAuth    auth.OAuthAuthenticator
	frontendURL string
}

func NewAuthHandler(authService service.AuthService, gothAuth auth.OAuthAuthenticator, frontendURL string) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		gothAuth:    gothAuth,
		frontendURL: frontendURL,
	}
}

// Register handles user registration with email and password.
func (h *AuthHandler) Register(c *gin.Context) {
	var req model.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	resp, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		fmt.Printf("❌ [Register Error]: %v\n", err)
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusCreated, resp)
}

// Login handles email and password authentication.
func (h *AuthHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	resp, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, resp)
}

// BeginGoogleAuth initiates the Google OAuth 2.0 flow via Goth.
func (h *AuthHandler) BeginGoogleAuth(c *gin.Context) {
	if h.gothAuth == nil {
		model.SendError(c, model.NewAppError("OAUTH_DISABLED", "Google OAuth is not configured.", http.StatusNotImplemented, nil))
		return
	}

	if err := h.gothAuth.BeginAuth(c.Writer, c.Request); err != nil {
		model.SendError(c, model.NewAppError("OAUTH_ERROR", "Failed to initiate Google authentication.", http.StatusInternalServerError, err))
		return
	}
}

// GoogleCallback processes the callback from Google OAuth via Goth.
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	if h.gothAuth == nil {
		model.SendError(c, model.NewAppError("OAUTH_DISABLED", "Google OAuth is not configured.", http.StatusNotImplemented, nil))
		return
	}

	oauthUser, err := h.gothAuth.CompleteAuth(c.Writer, c.Request)
	if err != nil {
		model.SendError(c, model.NewAppError("OAUTH_FAILED", fmt.Sprintf("OAuth authentication failed: %v", err), http.StatusUnauthorized, err))
		return
	}

	authResp, err := h.authService.HandleGoogleAuth(c.Request.Context(), oauthUser)
	if err != nil {
		model.SendError(c, err)
		return
	}

	// If request accepts JSON, return JSON payload
	if c.GetHeader("Accept") == "application/json" {
		model.SendSuccess(c, http.StatusOK, authResp)
		return
	}

	// Otherwise redirect to frontend callback with tokens in fragment / query
	targetURL := fmt.Sprintf(
		"%s/auth/callback?token=%s&refresh_token=%s",
		h.frontendURL,
		url.QueryEscape(authResp.AccessToken),
		url.QueryEscape(authResp.RefreshToken),
	)
	c.Redirect(http.StatusTemporaryRedirect, targetURL)
}

// Refresh handles token refresh using the database-backed refresh session.
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req model.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	tokens, err := h.authService.RefreshToken(c.Request.Context(), req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, tokens)
}

// Logout invalidates the refresh token session in the database.
func (h *AuthHandler) Logout(c *gin.Context) {
	var req model.RefreshTokenRequest
	_ = c.ShouldBindJSON(&req)

	if req.RefreshToken != "" {
		_ = h.authService.Logout(c.Request.Context(), req.RefreshToken)
	}

	model.SendSuccess(c, http.StatusOK, gin.H{"message": "Logged out successfully"})
}
