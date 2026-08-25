package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"backend/internal/auth"
	"backend/internal/handler"
	"backend/internal/model"
)

type mockAuthService struct {
	registerFunc         func(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error)
	loginFunc            func(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error)
	handleGoogleAuthFunc func(ctx context.Context, oauthUser *auth.OAuthUser) (*model.AuthResponse, error)
	refreshTokenFunc     func(ctx context.Context, req model.RefreshTokenRequest) (*auth.TokenPair, error)
	logoutFunc           func(ctx context.Context, rawRefreshToken string) error
}

func (m *mockAuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
	if m.registerFunc != nil {
		return m.registerFunc(ctx, req)
	}
	return nil, nil
}
func (m *mockAuthService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	if m.loginFunc != nil {
		return m.loginFunc(ctx, req)
	}
	return nil, nil
}
func (m *mockAuthService) HandleGoogleAuth(ctx context.Context, oauthUser *auth.OAuthUser) (*model.AuthResponse, error) {
	if m.handleGoogleAuthFunc != nil {
		return m.handleGoogleAuthFunc(ctx, oauthUser)
	}
	return nil, nil
}
func (m *mockAuthService) RefreshToken(ctx context.Context, req model.RefreshTokenRequest) (*auth.TokenPair, error) {
	if m.refreshTokenFunc != nil {
		return m.refreshTokenFunc(ctx, req)
	}
	return nil, nil
}
func (m *mockAuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	if m.logoutFunc != nil {
		return m.logoutFunc(ctx, rawRefreshToken)
	}
	return nil
}

func TestAuthHandlerRegisterValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := handler.NewAuthHandler(&mockAuthService{}, nil, "")

	r := gin.New()
	r.POST("/register", h.Register)

	body := map[string]string{}
	bodyBytes, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "/register", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("Expected status 422 for validation error, got %d", w.Code)
	}
}

func TestAuthHandlerLogin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authSvc := &mockAuthService{
		loginFunc: func(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
			return &model.AuthResponse{
				User: model.UserResponse{
					ID:    uuid.New(),
					Email: req.Email,
				},
				AccessToken:  "token-123",
				RefreshToken: "refresh-123",
				ExpiresIn:    3600,
			}, nil
		},
	}
	h := handler.NewAuthHandler(authSvc, nil, "")

	r := gin.New()
	r.POST("/login", h.Login)

	body := map[string]string{
		"email":    "user@karu.app",
		"password": "validpassword",
	}
	bodyBytes, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
}
