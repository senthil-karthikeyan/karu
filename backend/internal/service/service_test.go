package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"backend/internal/auth"
	"backend/internal/model"
	"backend/sqlc/generated"
)

// Mock Repositories
type mockUserRepo struct {
	createFunc         func(ctx context.Context, email, passwordHash, name, avatarURL, bio string, preferences model.UserPreferences) (*model.UserResponse, error)
	getByIDFunc        func(ctx context.Context, id uuid.UUID) (*model.UserResponse, error)
	getByEmailFunc     func(ctx context.Context, email string) (*generated.User, error)
	updateProfileFunc  func(ctx context.Context, id uuid.UUID, name, avatarURL, bio string, preferences *model.UserPreferences) (*model.UserResponse, error)
	updatePasswordFunc func(ctx context.Context, id uuid.UUID, passwordHash string) error
}

func (m *mockUserRepo) Create(ctx context.Context, email, passwordHash, name, avatarURL, bio string, preferences model.UserPreferences) (*model.UserResponse, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, email, passwordHash, name, avatarURL, bio, preferences)
	}
	return nil, nil
}
func (m *mockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.UserResponse, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*generated.User, error) {
	if m.getByEmailFunc != nil {
		return m.getByEmailFunc(ctx, email)
	}
	return nil, model.ErrNotFound
}
func (m *mockUserRepo) UpdateProfile(ctx context.Context, id uuid.UUID, name, avatarURL, bio string, preferences *model.UserPreferences) (*model.UserResponse, error) {
	if m.updateProfileFunc != nil {
		return m.updateProfileFunc(ctx, id, name, avatarURL, bio, preferences)
	}
	return nil, nil
}
func (m *mockUserRepo) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	if m.updatePasswordFunc != nil {
		return m.updatePasswordFunc(ctx, id, passwordHash)
	}
	return nil
}

type mockAuthIdentityRepo struct {
	createFunc         func(ctx context.Context, userID uuid.UUID, provider, providerUserID, passwordHash string) (*generated.AuthIdentity, error)
	getByProviderFunc  func(ctx context.Context, provider, providerUserID string) (*generated.AuthIdentity, error)
	getByUserIDFunc    func(ctx context.Context, userID uuid.UUID) ([]generated.AuthIdentity, error)
	updatePasswordFunc func(ctx context.Context, userID uuid.UUID, provider, passwordHash string) (*generated.AuthIdentity, error)
}

func (m *mockAuthIdentityRepo) Create(ctx context.Context, userID uuid.UUID, provider, providerUserID, passwordHash string) (*generated.AuthIdentity, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, provider, providerUserID, passwordHash)
	}
	return &generated.AuthIdentity{ID: pgtype.UUID{Bytes: uuid.New(), Valid: true}}, nil
}
func (m *mockAuthIdentityRepo) GetByProvider(ctx context.Context, provider, providerUserID string) (*generated.AuthIdentity, error) {
	if m.getByProviderFunc != nil {
		return m.getByProviderFunc(ctx, provider, providerUserID)
	}
	return nil, model.ErrNotFound
}
func (m *mockAuthIdentityRepo) GetByUserID(ctx context.Context, userID uuid.UUID) ([]generated.AuthIdentity, error) {
	if m.getByUserIDFunc != nil {
		return m.getByUserIDFunc(ctx, userID)
	}
	return nil, nil
}
func (m *mockAuthIdentityRepo) UpdatePassword(ctx context.Context, userID uuid.UUID, provider, passwordHash string) (*generated.AuthIdentity, error) {
	if m.updatePasswordFunc != nil {
		return m.updatePasswordFunc(ctx, userID, provider, passwordHash)
	}
	return nil, nil
}

type mockRefreshTokenRepo struct {
	createFunc           func(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*generated.RefreshToken, error)
	getByHashFunc        func(ctx context.Context, tokenHash string) (*generated.RefreshToken, error)
	revokeFunc           func(ctx context.Context, tokenHash string) error
	revokeAllForUserFunc func(ctx context.Context, userID uuid.UUID) error
}

func (m *mockRefreshTokenRepo) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) (*generated.RefreshToken, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, userID, tokenHash, expiresAt)
	}
	return &generated.RefreshToken{ID: pgtype.UUID{Bytes: uuid.New(), Valid: true}}, nil
}
func (m *mockRefreshTokenRepo) GetByHash(ctx context.Context, tokenHash string) (*generated.RefreshToken, error) {
	if m.getByHashFunc != nil {
		return m.getByHashFunc(ctx, tokenHash)
	}
	return nil, model.ErrNotFound
}
func (m *mockRefreshTokenRepo) Revoke(ctx context.Context, tokenHash string) error {
	if m.revokeFunc != nil {
		return m.revokeFunc(ctx, tokenHash)
	}
	return nil
}
func (m *mockRefreshTokenRepo) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	if m.revokeAllForUserFunc != nil {
		return m.revokeAllForUserFunc(ctx, userID)
	}
	return nil
}

type mockScreenplayRepo struct {
	createScreenplayFunc       func(ctx context.Context, projectID uuid.UUID, title, description, initialContent string) (*model.ScreenplayDetailResponse, error)
	getScreenplayFunc          func(ctx context.Context, id uuid.UUID) (*generated.Screenplay, error)
	getScreenplayOwnershipFunc func(ctx context.Context, id, userID uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error)
	listScreenplaysFunc        func(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error)
	updateScreenplayFunc       func(ctx context.Context, id uuid.UUID, title, description *string) (*model.ScreenplayResponse, error)
	deleteScreenplayFunc       func(ctx context.Context, id uuid.UUID) error

	getContentFunc          func(ctx context.Context, screenplayID uuid.UUID) (*model.ScreenplayContentResponse, error)
	saveContentWithRevFunc  func(ctx context.Context, screenplayID uuid.UUID, content string, revision int64) (*model.ScreenplayContentResponse, error)
	createVersionFunc       func(ctx context.Context, screenplayID uuid.UUID, title, content string, createdBy uuid.UUID) (*model.ScreenplayVersionResponse, error)
	getLatestVersionNumFunc func(ctx context.Context, screenplayID uuid.UUID) (int, error)
	listVersionsFunc        func(ctx context.Context, screenplayID uuid.UUID) ([]model.ScreenplayVersionResponse, error)
	getVersionByIDFunc      func(ctx context.Context, versionID uuid.UUID) (*model.ScreenplayVersionResponse, error)
	restoreVersionFunc      func(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error)
}

func (m *mockScreenplayRepo) CreateScreenplay(ctx context.Context, projectID uuid.UUID, title, description, initialContent string) (*model.ScreenplayDetailResponse, error) {
	return m.createScreenplayFunc(ctx, projectID, title, description, initialContent)
}
func (m *mockScreenplayRepo) GetScreenplay(ctx context.Context, id uuid.UUID) (*generated.Screenplay, error) {
	return m.getScreenplayFunc(ctx, id)
}
func (m *mockScreenplayRepo) GetScreenplayWithOwnership(ctx context.Context, id, userID uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
	if m.getScreenplayOwnershipFunc != nil {
		return m.getScreenplayOwnershipFunc(ctx, id, userID)
	}
	return nil, model.ErrNotFound
}
func (m *mockScreenplayRepo) ListScreenplaysByProject(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error) {
	return m.listScreenplaysFunc(ctx, projectID, userID)
}
func (m *mockScreenplayRepo) UpdateScreenplay(ctx context.Context, id uuid.UUID, title, description *string) (*model.ScreenplayResponse, error) {
	return m.updateScreenplayFunc(ctx, id, title, description)
}
func (m *mockScreenplayRepo) DeleteScreenplay(ctx context.Context, id uuid.UUID) error {
	return m.deleteScreenplayFunc(ctx, id)
}
func (m *mockScreenplayRepo) GetContent(ctx context.Context, screenplayID uuid.UUID) (*model.ScreenplayContentResponse, error) {
	return m.getContentFunc(ctx, screenplayID)
}
func (m *mockScreenplayRepo) SaveContentWithRevision(ctx context.Context, screenplayID uuid.UUID, content string, revision int64) (*model.ScreenplayContentResponse, error) {
	return m.saveContentWithRevFunc(ctx, screenplayID, content, revision)
}
func (m *mockScreenplayRepo) CreateVersion(ctx context.Context, screenplayID uuid.UUID, title, content string, createdBy uuid.UUID) (*model.ScreenplayVersionResponse, error) {
	return m.createVersionFunc(ctx, screenplayID, title, content, createdBy)
}
func (m *mockScreenplayRepo) GetLatestVersionNumber(ctx context.Context, screenplayID uuid.UUID) (int, error) {
	return m.getLatestVersionNumFunc(ctx, screenplayID)
}
func (m *mockScreenplayRepo) ListVersions(ctx context.Context, screenplayID uuid.UUID) ([]model.ScreenplayVersionResponse, error) {
	return m.listVersionsFunc(ctx, screenplayID)
}
func (m *mockScreenplayRepo) GetVersionByID(ctx context.Context, versionID uuid.UUID) (*model.ScreenplayVersionResponse, error) {
	return m.getVersionByIDFunc(ctx, versionID)
}
func (m *mockScreenplayRepo) RestoreVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error) {
	return m.restoreVersionFunc(ctx, screenplayID, versionID, userID)
}

type mockProjectRepoForScreenplay struct {
	getByIDAndUserIDFunc func(ctx context.Context, id, userID uuid.UUID) (*generated.Project, error)
}

func (m *mockProjectRepoForScreenplay) Create(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error) {
	return nil, nil
}
func (m *mockProjectRepoForScreenplay) GetByID(ctx context.Context, id uuid.UUID) (*generated.Project, error) {
	return nil, nil
}
func (m *mockProjectRepoForScreenplay) GetByIDAndUserID(ctx context.Context, id, userID uuid.UUID) (*generated.Project, error) {
	if m.getByIDAndUserIDFunc != nil {
		return m.getByIDAndUserIDFunc(ctx, id, userID)
	}
	return nil, model.ErrNotFound
}
func (m *mockProjectRepoForScreenplay) ListByUserID(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error) {
	return nil, nil
}
func (m *mockProjectRepoForScreenplay) Update(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error) {
	return nil, nil
}
func (m *mockProjectRepoForScreenplay) UpdateContent(ctx context.Context, id, userID uuid.UUID, content string, pageCount, wordCount, sceneCount int32, lastEditedScene string) (*model.ProjectResponse, error) {
	return nil, nil
}
func (m *mockProjectRepoForScreenplay) Delete(ctx context.Context, id, userID uuid.UUID) error {
	return nil
}

// -------------------------------------------------------------
// TESTS
// -------------------------------------------------------------

func TestAuthServiceRegisterAndLogin(t *testing.T) {
	tm := auth.NewTokenManager("secret-key", 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()
	password := "securepassword123"
	hashed, _ := auth.HashPassword(password)

	userRepo := &mockUserRepo{
		createFunc: func(ctx context.Context, email, passwordHash, name, avatarURL, bio string, preferences model.UserPreferences) (*model.UserResponse, error) {
			return &model.UserResponse{
				ID:        userID,
				Email:     email,
				Name:      name,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.UserResponse, error) {
			return &model.UserResponse{
				ID:    id,
				Email: "screenwriter@karu.app",
				Name:  "Screen Writer",
			}, nil
		},
	}

	authIdentityRepo := &mockAuthIdentityRepo{
		getByProviderFunc: func(ctx context.Context, provider, providerUserID string) (*generated.AuthIdentity, error) {
			if provider == "email" && providerUserID == "screenwriter@karu.app" {
				return &generated.AuthIdentity{
					UserID:       pgtype.UUID{Bytes: userID, Valid: true},
					PasswordHash: hashed,
				}, nil
			}
			return nil, model.ErrNotFound
		},
	}

	refreshTokenRepo := &mockRefreshTokenRepo{}

	authSvc := NewAuthService(userRepo, authIdentityRepo, refreshTokenRepo, tm)

	// 1. Register
	regResp, err := authSvc.Register(context.Background(), model.RegisterRequest{
		Email:    "screenwriter@karu.app",
		Password: password,
		Name:     "Screen Writer",
	})
	if err != nil {
		t.Fatalf("Registration failed: %v", err)
	}
	if regResp.AccessToken == "" || regResp.RefreshToken == "" {
		t.Fatalf("Expected access and refresh tokens")
	}

	// 2. Login with correct credentials
	loginResp, err := authSvc.Login(context.Background(), model.LoginRequest{
		Email:    "screenwriter@karu.app",
		Password: password,
	})
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if loginResp.User.Email != "screenwriter@karu.app" {
		t.Errorf("Expected email screenwriter@karu.app, got %s", loginResp.User.Email)
	}

	// 3. Login with wrong password
	_, err = authSvc.Login(context.Background(), model.LoginRequest{
		Email:    "screenwriter@karu.app",
		Password: "wrongpassword",
	})
	if err != model.ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestGoogleOAuthScenarios(t *testing.T) {
	tm := auth.NewTokenManager("secret-key", 15*time.Minute, 7*24*time.Hour)
	existingUserID := uuid.New()

	var linkedGoogleIdentity bool

	userRepo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.UserResponse, error) {
			return &model.UserResponse{
				ID:    id,
				Email: "existing@karu.app",
				Name:  "Existing User",
			}, nil
		},
		getByEmailFunc: func(ctx context.Context, email string) (*generated.User, error) {
			if email == "existing@karu.app" {
				return &generated.User{
					ID:    pgtype.UUID{Bytes: existingUserID, Valid: true},
					Email: email,
					Name:  "Existing User",
				}, nil
			}
			return nil, model.ErrNotFound
		},
		createFunc: func(ctx context.Context, email, passwordHash, name, avatarURL, bio string, preferences model.UserPreferences) (*model.UserResponse, error) {
			return &model.UserResponse{
				ID:        uuid.New(),
				Email:     email,
				Name:      name,
				AvatarURL: avatarURL,
			}, nil
		},
	}

	authIdentityRepo := &mockAuthIdentityRepo{
		getByProviderFunc: func(ctx context.Context, provider, providerUserID string) (*generated.AuthIdentity, error) {
			if provider == "google" && providerUserID == "google-user-known-123" {
				return &generated.AuthIdentity{
					UserID: pgtype.UUID{Bytes: existingUserID, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
		createFunc: func(ctx context.Context, userID uuid.UUID, provider, providerUserID, passwordHash string) (*generated.AuthIdentity, error) {
			if provider == "google" && userID == existingUserID {
				linkedGoogleIdentity = true
			}
			return &generated.AuthIdentity{}, nil
		},
	}

	refreshTokenRepo := &mockRefreshTokenRepo{}
	authSvc := NewAuthService(userRepo, authIdentityRepo, refreshTokenRepo, tm)

	ctx := context.Background()

	// Scenario A: Known Google identity -> Log in directly
	respA, err := authSvc.HandleGoogleAuth(ctx, &auth.OAuthUser{
		Provider:       "google",
		ProviderUserID: "google-user-known-123",
		Email:          "existing@karu.app",
	})
	if err != nil {
		t.Fatalf("Scenario A failed: %v", err)
	}
	if respA.AccessToken == "" {
		t.Errorf("Expected access token for known Google user")
	}

	// Scenario B: Brand new user via Google -> Creates User + Google identity
	respB, err := authSvc.HandleGoogleAuth(ctx, &auth.OAuthUser{
		Provider:       "google",
		ProviderUserID: "google-user-brand-new-999",
		Email:          "brandnew@gmail.com",
		Name:           "Brand New",
	})
	if err != nil {
		t.Fatalf("Scenario B failed: %v", err)
	}
	if respB.User.Email != "brandnew@gmail.com" {
		t.Errorf("Expected email brandnew@gmail.com, got %s", respB.User.Email)
	}

	// Scenario C: Google identity doesn't exist, but email already exists -> Links Google identity
	respC, err := authSvc.HandleGoogleAuth(ctx, &auth.OAuthUser{
		Provider:       "google",
		ProviderUserID: "google-new-id-for-existing-user",
		Email:          "existing@karu.app",
	})
	if err != nil {
		t.Fatalf("Scenario C failed: %v", err)
	}
	if !linkedGoogleIdentity {
		t.Errorf("Expected Google identity to be linked to existing user")
	}
	if respC.User.ID != existingUserID {
		t.Errorf("Expected user ID %v, got %v", existingUserID, respC.User.ID)
	}
}

func TestScreenplayAutosaveAndVersioning(t *testing.T) {
	userID := uuid.New()
	projectID := uuid.New()
	screenplayID := uuid.New()
	versionID := uuid.New()

	currentRevision := int64(5)
	currentContent := "INT. DINER - NIGHT\nCoffee pours."

	projRepo := &mockProjectRepoForScreenplay{
		getByIDAndUserIDFunc: func(ctx context.Context, id, uID uuid.UUID) (*generated.Project, error) {
			if id == projectID && uID == userID {
				return &generated.Project{ID: pgtype.UUID{Bytes: projectID, Valid: true}}, nil
			}
			return nil, model.ErrNotFound
		},
	}

	screenplayRepo := &mockScreenplayRepo{
		getScreenplayOwnershipFunc: func(ctx context.Context, id, uID uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if id == screenplayID && uID == userID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:        pgtype.UUID{Bytes: screenplayID, Valid: true},
					ProjectID: pgtype.UUID{Bytes: projectID, Valid: true},
					Title:     "Draft 1",
				}, nil
			}
			return nil, model.ErrNotFound
		},
		getContentFunc: func(ctx context.Context, sID uuid.UUID) (*model.ScreenplayContentResponse, error) {
			return &model.ScreenplayContentResponse{
				ScreenplayID: sID,
				Content:      currentContent,
				Revision:     currentRevision,
			}, nil
		},
		saveContentWithRevFunc: func(ctx context.Context, sID uuid.UUID, content string, revision int64) (*model.ScreenplayContentResponse, error) {
			if revision != currentRevision {
				return nil, model.ErrRevisionConflict
			}
			currentRevision++
			currentContent = content
			return &model.ScreenplayContentResponse{
				ScreenplayID: sID,
				Content:      currentContent,
				Revision:     currentRevision,
			}, nil
		},
		createVersionFunc: func(ctx context.Context, sID uuid.UUID, title, content string, createdBy uuid.UUID) (*model.ScreenplayVersionResponse, error) {
			return &model.ScreenplayVersionResponse{
				ID:            versionID,
				ScreenplayID:  sID,
				VersionNumber: 1,
				Title:         title,
				Content:       content,
			}, nil
		},
		restoreVersionFunc: func(ctx context.Context, sID, vID, uID uuid.UUID) (*model.RestoreVersionResponse, error) {
			return &model.RestoreVersionResponse{
				ScreenplayID:   sID,
				RestoredFromID: vID,
				NewRevision:    currentRevision + 1,
				Content:        "Restored screenplay content",
			}, nil
		},
	}

	screenplaySvc := NewScreenplayService(screenplayRepo, projRepo)

	ctx := context.Background()

	// 1. Successful autosave with correct revision
	saved, err := screenplaySvc.SaveContent(ctx, screenplayID, userID, model.SaveContentRequest{
		Content:  "Updated action in diner",
		Revision: 5,
	})
	if err != nil {
		t.Fatalf("Save content failed: %v", err)
	}
	if saved.Revision != 6 {
		t.Errorf("Expected revision 6, got %d", saved.Revision)
	}

	// 2. Conflict: client sends outdated revision
	_, err = screenplaySvc.SaveContent(ctx, screenplayID, userID, model.SaveContentRequest{
		Content:  "Stale overwrite attempt",
		Revision: 5, // currently at 6
	})
	if err != model.ErrRevisionConflict {
		t.Errorf("Expected ErrRevisionConflict for stale revision, got %v", err)
	}

	// 3. Create Version Checkpoint
	ver, err := screenplaySvc.CreateVersion(ctx, screenplayID, userID, model.CreateVersionRequest{
		Title: "First Polish",
	})
	if err != nil {
		t.Fatalf("Create version failed: %v", err)
	}
	if ver.Title != "First Polish" {
		t.Errorf("Expected title 'First Polish', got %s", ver.Title)
	}

	// 4. Restore Version
	restored, err := screenplaySvc.RestoreVersion(ctx, screenplayID, versionID, userID)
	if err != nil {
		t.Fatalf("Restore version failed: %v", err)
	}
	if restored.RestoredFromID != versionID {
		t.Errorf("Expected restoredFromID %v, got %v", versionID, restored.RestoredFromID)
	}

	// 5. Cross-user isolation: User B trying to access User A's screenplay
	userB := uuid.New()
	_, err = screenplaySvc.GetContent(ctx, screenplayID, userB)
	if err != model.ErrNotFound {
		t.Errorf("Expected ErrNotFound for cross-user access, got %v", err)
	}
}
