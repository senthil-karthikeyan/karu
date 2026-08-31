package service

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/pbkdf2"

	"backend/internal/model"
	"backend/sqlc/generated"
)

// TestCanonicalScreenplayFlow verifies the entire dedicated screenplay architecture lifecycle:
// 1. Project creation creates a default canonical screenplay and initial screenplay_contents record.
// 2. Client derives UEK, generates SCK, wraps SCK with UEK, and stores it in screenplay_keys.
// 3. Client encrypts TipTap JSON with SCK and saves to screenplay_contents with revision bump.
// 4. Client retrieves default screenplay, content, unwraps SCK with UEK, and decrypts content.
// 5. Concurrency checks on revision conflict.
func TestCanonicalScreenplayFlow(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	projectID := uuid.New()
	screenplayID := uuid.New()

	// In-memory canonical storage state
	var storedScreenplay *model.ScreenplayResponse
	var storedContent *model.ScreenplayContentResponse
	var storedKey *model.ScreenplayKeyResponse

	mockScreenRepo := &mockScreenplayRepo{
		createScreenplayFunc: func(ctx context.Context, pid uuid.UUID, title, description, initialContent string, encPayload *model.EncryptedPayload, wrappedKey *model.WrappedKeyPayload, uid uuid.UUID) (*model.ScreenplayDetailResponse, error) {
			storedScreenplay = &model.ScreenplayResponse{
				ID:          screenplayID,
				ProjectID:   pid,
				Title:       title,
				Description: description,
				IsDefault:   true,
				SortOrder:   1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}
			storedContent = &model.ScreenplayContentResponse{
				ScreenplayID: screenplayID,
				Content:      initialContent,
				Revision:     1,
				IsEncrypted:  false,
				UpdatedAt:    time.Now(),
			}
			return &model.ScreenplayDetailResponse{
				ScreenplayResponse: *storedScreenplay,
				Content:            initialContent,
				Revision:           1,
			}, nil
		},
		getDefaultByProjectFunc: func(ctx context.Context, pid, uid uuid.UUID) (*model.ScreenplayResponse, error) {
			if pid == projectID && uid == userID && storedScreenplay != nil {
				return storedScreenplay, nil
			}
			return nil, model.ErrNotFound
		},
		getContentFunc: func(ctx context.Context, sid uuid.UUID) (*model.ScreenplayContentResponse, error) {
			if sid == screenplayID && storedContent != nil {
				return storedContent, nil
			}
			return nil, model.ErrNotFound
		},
		saveEncryptedContent: func(ctx context.Context, sid uuid.UUID, payload model.EncryptedPayload, revision int64) (*model.ScreenplayContentResponse, error) {
			if sid != screenplayID {
				return nil, model.ErrNotFound
			}
			if storedContent != nil && storedContent.Revision != revision {
				return nil, model.ErrConflict
			}
			storedContent = &model.ScreenplayContentResponse{
				ScreenplayID:      sid,
				IsEncrypted:       true,
				EncryptionVersion: payload.Version,
				Algorithm:         payload.Algorithm,
				IV:                payload.IV,
				Ciphertext:        payload.Ciphertext,
				Revision:          revision + 1,
				UpdatedAt:         time.Now(),
			}
			return storedContent, nil
		},
		upsertScreenplayKeyFunc: func(ctx context.Context, sid, uid uuid.UUID, wrappedKey, keyIV, algorithm string, version int) (*model.ScreenplayKeyResponse, error) {
			storedKey = &model.ScreenplayKeyResponse{
				ScreenplayID: sid,
				Version:      version,
				Algorithm:    algorithm,
				IV:           keyIV,
				WrappedKey:   wrappedKey,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			return storedKey, nil
		},
		getScreenplayKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) (*model.ScreenplayKeyResponse, error) {
			if sid == screenplayID && uid == userID && storedKey != nil {
				return storedKey, nil
			}
			return nil, model.ErrScreenplayKeyNotFound
		},
		getOwnershipFunc: func(ctx context.Context, sid, uid uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if sid == screenplayID && uid == userID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:     pgtype.UUID{Bytes: sid, Valid: true},
					UserID: pgtype.UUID{Bytes: uid, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
	}

	mockProjRepo := &mockProjectRepoForLegacy{
		projResp: &model.ProjectResponse{
			ID:     projectID,
			UserID: userID,
			Title:  "The Canonical Script",
		},
	}

	mockProjForScreenplay := &mockProjectRepoForScreenplay{
		getByIDAndUserIDFunc: func(ctx context.Context, id, uid uuid.UUID) (*generated.Project, error) {
			if id == projectID && uid == userID {
				return &generated.Project{
					ID:     pgtype.UUID{Bytes: id, Valid: true},
					UserID: pgtype.UUID{Bytes: uid, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
	}

	projSvc := NewProjectService(mockProjRepo, &mockSceneRepoForLegacy{}, &mockActivityRepoForLegacy{}, mockScreenRepo)
	screenplaySvc := NewScreenplayService(mockScreenRepo, mockProjForScreenplay)

	// Step 1: Project Creation triggers Default Screenplay creation
	createdProj, err := projSvc.CreateProject(ctx, userID, model.CreateProjectRequest{
		Title:   "The Canonical Script",
		Logline: "A film written with unified architecture.",
	})
	if err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}
	if createdProj.ID != projectID {
		t.Errorf("Expected project ID %v, got %v", projectID, createdProj.ID)
	}
	if storedScreenplay == nil || !storedScreenplay.IsDefault {
		t.Fatalf("Default screenplay was not created upon project creation")
	}
	if storedContent == nil || storedContent.Revision != 1 {
		t.Fatalf("Initial content was not initialized with revision 1")
	}

	// Step 2: Client E2EE Setup (Derive UEK, Generate SCK, Wrap SCK with UEK)
	userSecret := "correct-horse-battery-staple-secure-passphrase"
	userSalt := make([]byte, 16)
	_, _ = io.ReadFull(rand.Reader, userSalt)
	uek := pbkdf2.Key([]byte(userSecret), userSalt, 600000, 32, sha256.New)

	sck := make([]byte, 32)
	_, _ = io.ReadFull(rand.Reader, sck)

	// Wrap SCK with UEK using AES-256-GCM
	uekBlock, err := aes.NewCipher(uek)
	if err != nil {
		t.Fatalf("Failed to create AES cipher: %v", err)
	}
	uekGCM, err := cipher.NewGCM(uekBlock)
	if err != nil {
		t.Fatalf("Failed to create GCM cipher: %v", err)
	}
	keyIV := make([]byte, 12)
	_, _ = io.ReadFull(rand.Reader, keyIV)
	wrappedSCK := uekGCM.Seal(nil, keyIV, sck, nil)

	// Store wrapped SCK in backend
	wrappedKeyPayload := model.WrappedKeyPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         base64.StdEncoding.EncodeToString(keyIV),
		WrappedKey: base64.StdEncoding.EncodeToString(wrappedSCK),
	}
	savedKey, err := screenplaySvc.SetScreenplayKey(ctx, screenplayID, userID, wrappedKeyPayload)
	if err != nil {
		t.Fatalf("Failed to save wrapped screenplay key: %v", err)
	}
	if savedKey.WrappedKey != wrappedKeyPayload.WrappedKey {
		t.Errorf("Mismatch in stored wrapped key")
	}

	// Step 3: Client Encrypts TipTap JSON Screenplay with SCK and Saves Content
	tipTapDoc := map[string]interface{}{
		"type": "doc",
		"content": []interface{}{
			map[string]interface{}{
				"type": "sceneHeading",
				"attrs": map[string]interface{}{
					"sceneNumber": 1,
				},
				"content": []interface{}{
					map[string]interface{}{"type": "text", "text": "INT. WRITER'S ROOM - NIGHT"},
				},
			},
			map[string]interface{}{
				"type": "action",
				"content": []interface{}{
					map[string]interface{}{"type": "text", "text": "The keys clatter with pure cryptographic precision."},
				},
			},
		},
	}
	docBytes, _ := json.Marshal(tipTapDoc)

	sckBlock, _ := aes.NewCipher(sck)
	sckGCM, _ := cipher.NewGCM(sckBlock)
	contentIV := make([]byte, 12)
	_, _ = io.ReadFull(rand.Reader, contentIV)
	ciphertext := sckGCM.Seal(nil, contentIV, docBytes, nil)

	encPayload := model.EncryptedPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         base64.StdEncoding.EncodeToString(contentIV),
		Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
	}

	// Save to canonical screenplay_contents with revision check (current revision = 1)
	savedContent, err := screenplaySvc.SaveContent(ctx, screenplayID, userID, model.SaveContentRequest{
		EncryptedContent: &encPayload,
		Revision:         1,
	})
	if err != nil {
		t.Fatalf("Failed to save encrypted screenplay content: %v", err)
	}
	if savedContent.Revision != 2 {
		t.Errorf("Expected revision to increment to 2, got %d", savedContent.Revision)
	}

	// Step 4: Verify Concurrency Conflict (Old client attempts save with revision 1)
	_, err = screenplaySvc.SaveContent(ctx, screenplayID, userID, model.SaveContentRequest{
		EncryptedContent: &encPayload,
		Revision:         1, // Stale revision!
	})
	if !errors.Is(err, model.ErrConflict) {
		t.Fatalf("Expected ErrConflict for stale revision, got: %v", err)
	}

	// Step 5: Read Flow — Fetch Default Screenplay, Content, Key & Decrypt TipTap JSON
	defaultSp, err := screenplaySvc.GetProjectDefaultScreenplay(ctx, projectID, userID)
	if err != nil {
		t.Fatalf("Failed to get default screenplay: %v", err)
	}
	if defaultSp.ID != screenplayID {
		t.Errorf("Expected default screenplay ID %v, got %v", screenplayID, defaultSp.ID)
	}

	retrievedContent, err := screenplaySvc.GetContent(ctx, defaultSp.ID, userID)
	if err != nil {
		t.Fatalf("Failed to retrieve content: %v", err)
	}
	if !retrievedContent.IsEncrypted {
		t.Fatalf("Expected content to be encrypted")
	}

	retrievedKey, err := screenplaySvc.GetScreenplayKey(ctx, defaultSp.ID, userID)
	if err != nil {
		t.Fatalf("Failed to retrieve screenplay key: %v", err)
	}

	// Unwrap SCK with UEK
	rawKeyIV, _ := base64.StdEncoding.DecodeString(retrievedKey.IV)
	rawWrappedSCK, _ := base64.StdEncoding.DecodeString(retrievedKey.WrappedKey)
	unwrappedSCK, err := uekGCM.Open(nil, rawKeyIV, rawWrappedSCK, nil)
	if err != nil {
		t.Fatalf("Failed to unwrap SCK with UEK: %v", err)
	}

	// Decrypt Content with unwrapped SCK
	unwrappedSCKBlock, _ := aes.NewCipher(unwrappedSCK)
	unwrappedSCKGCM, _ := cipher.NewGCM(unwrappedSCKBlock)
	rawContentIV, _ := base64.StdEncoding.DecodeString(retrievedContent.IV)
	rawCiphertext, _ := base64.StdEncoding.DecodeString(retrievedContent.Ciphertext)
	decryptedBytes, err := unwrappedSCKGCM.Open(nil, rawContentIV, rawCiphertext, nil)
	if err != nil {
		t.Fatalf("Failed to decrypt ciphertext with unwrapped SCK: %v", err)
	}

	var decryptedDoc map[string]interface{}
	if err := json.Unmarshal(decryptedBytes, &decryptedDoc); err != nil {
		t.Fatalf("Failed to parse decrypted TipTap JSON: %v", err)
	}
	if decryptedDoc["type"] != "doc" {
		t.Errorf("Expected doc type, got: %v", decryptedDoc["type"])
	}
}
