package router_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"backend/internal/auth"
	"backend/internal/config"
	"backend/internal/handler"
	"backend/internal/model"
	"backend/internal/router"
)

// Mock AuthService
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

type mockUserService struct {
	getProfileFunc            func(ctx context.Context, userID uuid.UUID) (*model.UserResponse, error)
	updateProfileFunc         func(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserResponse, error)
	getEncryptionMetadataFunc func(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionMetadataResponse, error)
	setEncryptionMetadataFunc func(ctx context.Context, userID uuid.UUID, req model.UserEncryptionMetadataRequest) (*model.UserEncryptionMetadataResponse, error)
}

func (m *mockUserService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserResponse, error) {
	if m.getProfileFunc != nil {
		return m.getProfileFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockUserService) UpdateProfile(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserResponse, error) {
	if m.updateProfileFunc != nil {
		return m.updateProfileFunc(ctx, userID, req)
	}
	return nil, nil
}

func (m *mockUserService) GetEncryptionMetadata(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionMetadataResponse, error) {
	if m.getEncryptionMetadataFunc != nil {
		return m.getEncryptionMetadataFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockUserService) SetEncryptionMetadata(ctx context.Context, userID uuid.UUID, req model.UserEncryptionMetadataRequest) (*model.UserEncryptionMetadataResponse, error) {
	if m.setEncryptionMetadataFunc != nil {
		return m.setEncryptionMetadataFunc(ctx, userID, req)
	}
	return nil, nil
}

func (m *mockUserService) GetEncryptionIdentity(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionIdentityPayload, error) {
	return nil, nil
}

func (m *mockUserService) SetEncryptionIdentity(ctx context.Context, userID uuid.UUID, req model.UserEncryptionIdentityRequest) (*model.UserEncryptionIdentityPayload, error) {
	return nil, nil
}

func (m *mockUserService) GetUserPublicKey(ctx context.Context, userID uuid.UUID) (*model.UserPublicKeyResponse, error) {
	return nil, nil
}

// Mock ProjectService
type mockProjectService struct {
	createProjectFunc func(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error)
	getProjectFunc    func(ctx context.Context, id, userID uuid.UUID) (*model.ProjectDetailResponse, error)
	listProjectsFunc  func(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error)
	updateProjectFunc func(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error)
	deleteProjectFunc func(ctx context.Context, id, userID uuid.UUID) error

	createSceneFunc func(ctx context.Context, projectID, userID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error)
	listScenesFunc  func(ctx context.Context, projectID, userID uuid.UUID) ([]model.SceneItem, error)
	updateSceneFunc func(ctx context.Context, projectID, sceneID, userID uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error)
	deleteSceneFunc func(ctx context.Context, projectID, sceneID, userID uuid.UUID) error

	listActivitiesFunc func(ctx context.Context, projectID, userID uuid.UUID) ([]model.ActivityItem, error)
}

func (m *mockProjectService) CreateProject(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error) {
	return m.createProjectFunc(ctx, userID, req)
}
func (m *mockProjectService) GetProject(ctx context.Context, id, userID uuid.UUID) (*model.ProjectDetailResponse, error) {
	return m.getProjectFunc(ctx, id, userID)
}
func (m *mockProjectService) ListProjects(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error) {
	return m.listProjectsFunc(ctx, userID)
}
func (m *mockProjectService) UpdateProject(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error) {
	return m.updateProjectFunc(ctx, id, userID, req)
}
func (m *mockProjectService) DeleteProject(ctx context.Context, id, userID uuid.UUID) error {
	return m.deleteProjectFunc(ctx, id, userID)
}
func (m *mockProjectService) CreateScene(ctx context.Context, projectID, userID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error) {
	return m.createSceneFunc(ctx, projectID, userID, req)
}
func (m *mockProjectService) ListScenes(ctx context.Context, projectID, userID uuid.UUID) ([]model.SceneItem, error) {
	return m.listScenesFunc(ctx, projectID, userID)
}
func (m *mockProjectService) UpdateScene(ctx context.Context, projectID, sceneID, userID uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error) {
	return m.updateSceneFunc(ctx, projectID, sceneID, userID, req)
}
func (m *mockProjectService) DeleteScene(ctx context.Context, projectID, sceneID, userID uuid.UUID) error {
	return m.deleteSceneFunc(ctx, projectID, sceneID, userID)
}
func (m *mockProjectService) ListActivities(ctx context.Context, projectID, userID uuid.UUID) ([]model.ActivityItem, error) {
	return m.listActivitiesFunc(ctx, projectID, userID)
}

// Mock ScreenplayService
type mockScreenplayService struct {
	createScreenplayFunc func(ctx context.Context, projectID, userID uuid.UUID, req model.CreateScreenplayRequest) (*model.ScreenplayDetailResponse, error)
	getScreenplayFunc    func(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error)
	getDefaultScreenplayFunc func(ctx context.Context, projectID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error)
	listScreenplaysFunc  func(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error)
	updateScreenplayFunc func(ctx context.Context, screenplayID, userID uuid.UUID, req model.UpdateScreenplayRequest) (*model.ScreenplayResponse, error)
	deleteScreenplayFunc func(ctx context.Context, screenplayID, userID uuid.UUID) error
	getContentFunc     func(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayContentResponse, error)
	saveContentFunc    func(ctx context.Context, screenplayID, userID uuid.UUID, req model.SaveContentRequest) (*model.ScreenplayContentResponse, error)
	getScreenplayKeyFunc func(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayKeyResponse, error)
	setScreenplayKeyFunc func(ctx context.Context, screenplayID, userID uuid.UUID, req model.WrappedKeyPayload) (*model.ScreenplayKeyResponse, error)
	createVersionFunc  func(ctx context.Context, screenplayID, userID uuid.UUID, req model.CreateVersionRequest) (*model.ScreenplayVersionResponse, error)
	listVersionsFunc   func(ctx context.Context, screenplayID, userID uuid.UUID) ([]model.ScreenplayVersionResponse, error)
	getVersionFunc     func(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.ScreenplayVersionResponse, error)
	restoreVersionFunc func(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error)
}

func (m *mockScreenplayService) CreateScreenplay(ctx context.Context, projectID, userID uuid.UUID, req model.CreateScreenplayRequest) (*model.ScreenplayDetailResponse, error) {
	if m.createScreenplayFunc != nil {
		return m.createScreenplayFunc(ctx, projectID, userID, req)
	}
	return nil, nil
}
func (m *mockScreenplayService) GetScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error) {
	if m.getScreenplayFunc != nil {
		return m.getScreenplayFunc(ctx, screenplayID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) GetProjectDefaultScreenplay(ctx context.Context, projectID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error) {
	if m.getDefaultScreenplayFunc != nil {
		return m.getDefaultScreenplayFunc(ctx, projectID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) ListScreenplays(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error) {
	if m.listScreenplaysFunc != nil {
		return m.listScreenplaysFunc(ctx, projectID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) UpdateScreenplay(ctx context.Context, screenplayID, userID uuid.UUID, req model.UpdateScreenplayRequest) (*model.ScreenplayResponse, error) {
	if m.updateScreenplayFunc != nil {
		return m.updateScreenplayFunc(ctx, screenplayID, userID, req)
	}
	return nil, nil
}
func (m *mockScreenplayService) DeleteScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) error {
	if m.deleteScreenplayFunc != nil {
		return m.deleteScreenplayFunc(ctx, screenplayID, userID)
	}
	return nil
}
func (m *mockScreenplayService) GetContent(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayContentResponse, error) {
	if m.getContentFunc != nil {
		return m.getContentFunc(ctx, screenplayID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) SaveContent(ctx context.Context, screenplayID, userID uuid.UUID, req model.SaveContentRequest) (*model.ScreenplayContentResponse, error) {
	if m.saveContentFunc != nil {
		return m.saveContentFunc(ctx, screenplayID, userID, req)
	}
	return nil, nil
}
func (m *mockScreenplayService) GetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayKeyResponse, error) {
	if m.getScreenplayKeyFunc != nil {
		return m.getScreenplayKeyFunc(ctx, screenplayID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) SetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID, req model.WrappedKeyPayload) (*model.ScreenplayKeyResponse, error) {
	if m.setScreenplayKeyFunc != nil {
		return m.setScreenplayKeyFunc(ctx, screenplayID, userID, req)
	}
	return nil, nil
}
func (m *mockScreenplayService) CreateVersion(ctx context.Context, screenplayID, userID uuid.UUID, req model.CreateVersionRequest) (*model.ScreenplayVersionResponse, error) {
	if m.createVersionFunc != nil {
		return m.createVersionFunc(ctx, screenplayID, userID, req)
	}
	return nil, nil
}
func (m *mockScreenplayService) ListVersions(ctx context.Context, screenplayID, userID uuid.UUID) ([]model.ScreenplayVersionResponse, error) {
	if m.listVersionsFunc != nil {
		return m.listVersionsFunc(ctx, screenplayID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) GetVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.ScreenplayVersionResponse, error) {
	if m.getVersionFunc != nil {
		return m.getVersionFunc(ctx, screenplayID, versionID, userID)
	}
	return nil, nil
}
func (m *mockScreenplayService) RestoreVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error) {
	if m.restoreVersionFunc != nil {
		return m.restoreVersionFunc(ctx, screenplayID, versionID, userID)
	}
	return nil, nil
}

func setupTestApp(
	authSvc *mockAuthService,
	userSvc *mockUserService,
	projSvc *mockProjectService,
	screenplaySvc *mockScreenplayService,
	mockOAuth auth.OAuthAuthenticator,
) (*gin.Engine, auth.TokenManager) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		AppEnv:      "test",
		Port:        8080,
		FrontendURL: "http://localhost:3000",
	}

	tokenManager := auth.NewTokenManager("test-secret", 15*time.Minute, 7*24*time.Hour)

	authH := handler.NewAuthHandler(authSvc, mockOAuth, cfg.FrontendURL)
	userH := handler.NewUserHandler(userSvc)
	projH := handler.NewProjectHandler(projSvc)
	var screenplayH *handler.ScreenplayHandler
	if screenplaySvc != nil {
		screenplayH = handler.NewScreenplayHandler(screenplaySvc)
	}

	r := router.NewRouter(router.RouterDependencies{
		Config:            cfg,
		TokenManager:      tokenManager,
		HealthHandler:     handler.NewHealthHandler(nil),
		AuthHandler:       authH,
		UserHandler:       userH,
		ProjectHandler:    projH,
		ScreenplayHandler: screenplayH,
	})

	return r, tokenManager
}

func TestAuthRegisterEndpoint(t *testing.T) {
	mockUserID := uuid.New()
	authSvc := &mockAuthService{
		registerFunc: func(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
			return &model.AuthResponse{
				User: model.UserResponse{
					ID:    mockUserID,
					Email: req.Email,
					Name:  req.Name,
				},
				AccessToken:  "test-access-token",
				RefreshToken: "test-refresh-token",
				ExpiresIn:    900,
			}, nil
		},
	}

	r, _ := setupTestApp(authSvc, &mockUserService{}, &mockProjectService{}, nil, nil)

	body := map[string]string{
		"email":    "screenwriter@karu.app",
		"password": "strongpassword123",
		"name":     "Screen Writer",
	}
	bodyBytes, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp model.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !resp.Success {
		t.Fatalf("Expected success: true, got false")
	}
}

func TestGoogleOAuthEndpoints(t *testing.T) {
	mockUserID := uuid.New()
	authSvc := &mockAuthService{
		handleGoogleAuthFunc: func(ctx context.Context, oauthUser *auth.OAuthUser) (*model.AuthResponse, error) {
			return &model.AuthResponse{
				User: model.UserResponse{
					ID:    mockUserID,
					Email: oauthUser.Email,
					Name:  oauthUser.Name,
				},
				AccessToken:  "oauth-access-token",
				RefreshToken: "oauth-refresh-token",
				ExpiresIn:    900,
			}, nil
		},
	}

	mockOAuth := &auth.MockOAuthAuthenticator{
		BeginAuthFunc: func(w http.ResponseWriter, r *http.Request) error {
			w.WriteHeader(http.StatusTemporaryRedirect)
			return nil
		},
		CompleteAuthFunc: func(w http.ResponseWriter, r *http.Request) (*auth.OAuthUser, error) {
			return &auth.OAuthUser{
				Provider:       "google",
				ProviderUserID: "google-12345",
				Email:          "google.writer@gmail.com",
				Name:           "Google Writer",
			}, nil
		},
	}

	r, _ := setupTestApp(authSvc, &mockUserService{}, &mockProjectService{}, nil, mockOAuth)

	// 1. Begin Google Auth
	req, _ := http.NewRequest("GET", "/api/v1/auth/google", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTemporaryRedirect {
		t.Fatalf("Expected status 307 for BeginGoogleAuth, got %d", w.Code)
	}

	// 2. Google Callback (JSON Accept)
	req, _ = http.NewRequest("GET", "/api/v1/auth/google/callback", nil)
	req.Header.Set("Accept", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for Google Callback, got %d: %s", w.Code, w.Body.String())
	}
}

func TestScreenplayContentAutosaveEndpoint(t *testing.T) {
	mockUserID := uuid.New()
	screenplayID := uuid.New()

	screenplaySvc := &mockScreenplayService{
		saveContentFunc: func(ctx context.Context, sID, uID uuid.UUID, req model.SaveContentRequest) (*model.ScreenplayContentResponse, error) {
			if req.Revision != 1 {
				return nil, model.ErrRevisionConflict
			}
			return &model.ScreenplayContentResponse{
				ScreenplayID: sID,
				Content:      req.Content,
				Revision:     2,
				UpdatedAt:    time.Now(),
			}, nil
		},
	}

	r, tm := setupTestApp(&mockAuthService{}, &mockUserService{}, &mockProjectService{}, screenplaySvc, nil)

	accessToken, _, _ := tm.GenerateAccessToken(mockUserID, "writer@karu.app")

	// 1. Valid autosave
	payload := map[string]interface{}{
		"content":  "<p>Fresh scene action</p>",
		"revision": 1,
	}
	pBytes, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/api/v1/screenplays/"+screenplayID.String()+"/content", bytes.NewReader(pBytes))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 for valid autosave, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Conflict: Stale revision
	payloadStale := map[string]interface{}{
		"content":  "<p>Stale action</p>",
		"revision": 99,
	}
	pStaleBytes, _ := json.Marshal(payloadStale)
	req, _ = http.NewRequest("PUT", "/api/v1/screenplays/"+screenplayID.String()+"/content", bytes.NewReader(pStaleBytes))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("Expected 409 Conflict for stale revision, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUserEncryptionMetadataEndpoints(t *testing.T) {
	mockUserID := uuid.New()
	salt := "MTIzNDU2Nzg5MDEyMzQ1Ng==" // 16 bytes base64

	userSvc := &mockUserService{
		getEncryptionMetadataFunc: func(ctx context.Context, uID uuid.UUID) (*model.UserEncryptionMetadataResponse, error) {
			return &model.UserEncryptionMetadataResponse{
				UserID:        uID,
				Salt:          salt,
				Iterations:    600000,
				HashAlgorithm: "SHA-256",
			}, nil
		},
		setEncryptionMetadataFunc: func(ctx context.Context, uID uuid.UUID, req model.UserEncryptionMetadataRequest) (*model.UserEncryptionMetadataResponse, error) {
			return &model.UserEncryptionMetadataResponse{
				UserID:        uID,
				Salt:          req.Salt,
				Iterations:    600000,
				HashAlgorithm: "SHA-256",
			}, nil
		},
	}

	r, tm := setupTestApp(&mockAuthService{}, userSvc, &mockProjectService{}, nil, nil)
	accessToken, _, _ := tm.GenerateAccessToken(mockUserID, "writer@karu.app")

	// 1. GET /api/v1/users/me/encryption-metadata
	req, _ := http.NewRequest("GET", "/api/v1/users/me/encryption-metadata", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 for GET encryption-metadata, got %d: %s", w.Code, w.Body.String())
	}

	// 2. POST /api/v1/users/me/encryption-metadata
	payload := map[string]interface{}{
		"salt":          salt,
		"iterations":    600000,
		"hashAlgorithm": "SHA-256",
	}
	pBytes, _ := json.Marshal(payload)
	req, _ = http.NewRequest("POST", "/api/v1/users/me/encryption-metadata", bytes.NewReader(pBytes))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 for POST encryption-metadata, got %d: %s", w.Code, w.Body.String())
	}
}

func TestScreenplayKeyEndpoints(t *testing.T) {
	mockUserID := uuid.New()
	screenplayID := uuid.New()
	iv := "MTIzNDU2Nzg5MDEy" // 12 bytes base64
	wrappedKey := "MzItYnl0ZXMtd3JhcHBlZC1rZXktbWF0ZXJpYWw="

	screenplaySvc := &mockScreenplayService{
		getScreenplayKeyFunc: func(ctx context.Context, sID, uID uuid.UUID) (*model.ScreenplayKeyResponse, error) {
			return &model.ScreenplayKeyResponse{
				ScreenplayID: sID,
				Version:      1,
				Algorithm:    "AES-GCM",
				IV:           iv,
				WrappedKey:   wrappedKey,
			}, nil
		},
		setScreenplayKeyFunc: func(ctx context.Context, sID, uID uuid.UUID, req model.WrappedKeyPayload) (*model.ScreenplayKeyResponse, error) {
			return &model.ScreenplayKeyResponse{
				ScreenplayID: sID,
				Version:      req.Version,
				Algorithm:    req.Algorithm,
				IV:           req.IV,
				WrappedKey:   req.WrappedKey,
			}, nil
		},
	}

	r, tm := setupTestApp(&mockAuthService{}, &mockUserService{}, &mockProjectService{}, screenplaySvc, nil)
	accessToken, _, _ := tm.GenerateAccessToken(mockUserID, "writer@karu.app")

	// 1. GET /api/v1/screenplays/:id/key
	req, _ := http.NewRequest("GET", "/api/v1/screenplays/"+screenplayID.String()+"/key", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 for GET screenplay key, got %d: %s", w.Code, w.Body.String())
	}

	// 2. POST /api/v1/screenplays/:id/key
	payload := map[string]interface{}{
		"version":    1,
		"algorithm":  "AES-GCM",
		"iv":         iv,
		"wrappedKey": wrappedKey,
	}
	pBytes, _ := json.Marshal(payload)
	req, _ = http.NewRequest("POST", "/api/v1/screenplays/"+screenplayID.String()+"/key", bytes.NewReader(pBytes))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 for POST screenplay key, got %d: %s", w.Code, w.Body.String())
	}
}

