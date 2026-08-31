package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"backend/internal/model"
	"backend/sqlc/generated"
)

// -------------------------------------------------------------------------------------------------
// E2EE Tests
// -------------------------------------------------------------------------------------------------

func TestUserEncryptionMetadata(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	validSalt := base64.StdEncoding.EncodeToString([]byte("1234567890123456")) // 16 bytes

	repo := &mockScreenplayRepo{
		upsertUserMetadataFunc: func(ctx context.Context, uid uuid.UUID, salt string, iterations int, hashAlgo string) (*model.UserEncryptionMetadataResponse, error) {
			if uid != userID {
				t.Fatalf("unexpected userID: %s", uid)
			}
			return &model.UserEncryptionMetadataResponse{
				UserID:        uid,
				Salt:          salt,
				Iterations:    iterations,
				HashAlgorithm: hashAlgo,
			}, nil
		},
		getUserMetadataFunc: func(ctx context.Context, uid uuid.UUID) (*model.UserEncryptionMetadataResponse, error) {
			if uid == userID {
				return &model.UserEncryptionMetadataResponse{
					UserID:        uid,
					Salt:          validSalt,
					Iterations:    600000,
					HashAlgorithm: "SHA-256",
				}, nil
			}
			return nil, model.ErrEncryptionNotInitialized
		},
	}

	userSvc := NewUserService(&mockUserRepo{}, repo)

	// 1. Successful creation
	res, err := userSvc.SetEncryptionMetadata(ctx, userID, model.UserEncryptionMetadataRequest{
		Salt:          validSalt,
		Iterations:    600000,
		HashAlgorithm: "SHA-256",
	})
	if err != nil {
		t.Fatalf("unexpected error setting metadata: %v", err)
	}
	if res.Salt != validSalt || res.Iterations != 600000 || res.HashAlgorithm != "SHA-256" {
		t.Errorf("unexpected metadata response: %+v", res)
	}

	// 2. Successful retrieval
	got, err := userSvc.GetEncryptionMetadata(ctx, userID)
	if err != nil {
		t.Fatalf("unexpected error getting metadata: %v", err)
	}
	if got.Salt != validSalt {
		t.Errorf("expected salt %s, got %s", validSalt, got.Salt)
	}

	// 3. User isolation (another user receives 404 / ENCRYPTION_NOT_INITIALIZED)
	otherUser := uuid.New()
	_, err = userSvc.GetEncryptionMetadata(ctx, otherUser)
	if !errors.Is(err, model.ErrEncryptionNotInitialized) {
		t.Fatalf("expected ErrEncryptionNotInitialized, got %v", err)
	}

	// 4. Validation: Invalid Salt (not Base64)
	_, err = userSvc.SetEncryptionMetadata(ctx, userID, model.UserEncryptionMetadataRequest{
		Salt: "not-valid-base64!@#",
	})
	if err == nil || !strings.Contains(err.Error(), "Base64") {
		t.Errorf("expected Base64 validation error, got: %v", err)
	}

	// 5. Validation: Salt too short (< 8 bytes)
	shortSalt := base64.StdEncoding.EncodeToString([]byte("1234"))
	_, err = userSvc.SetEncryptionMetadata(ctx, userID, model.UserEncryptionMetadataRequest{
		Salt: shortSalt,
	})
	if err == nil || !strings.Contains(err.Error(), "bytes") {
		t.Errorf("expected short salt validation error, got: %v", err)
	}

	// 6. Validation: Invalid iterations
	_, err = userSvc.SetEncryptionMetadata(ctx, userID, model.UserEncryptionMetadataRequest{
		Salt:       validSalt,
		Iterations: 50, // below 100k
	})
	if err == nil || !strings.Contains(err.Error(), "iterations") {
		t.Errorf("expected iterations validation error, got: %v", err)
	}

	// 7. Validation: Unsupported algorithm
	_, err = userSvc.SetEncryptionMetadata(ctx, userID, model.UserEncryptionMetadataRequest{
		Salt:          validSalt,
		Iterations:    600000,
		HashAlgorithm: "MD5",
	})
	if err == nil || !strings.Contains(err.Error(), "unsupported hash algorithm") {
		t.Errorf("expected unsupported hash algorithm error, got: %v", err)
	}
}

func TestScreenplayKeyManagement(t *testing.T) {
	ctx := context.Background()
	ownerID := uuid.New()
	nonOwnerID := uuid.New()
	screenplayID := uuid.New()

	valid12ByteIV := base64.StdEncoding.EncodeToString([]byte("123456789012"))
	validWrappedKey := base64.StdEncoding.EncodeToString([]byte("32-bytes-of-wrapped-key-material"))

	validPayload := model.WrappedKeyPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         valid12ByteIV,
		WrappedKey: validWrappedKey,
	}

	repo := &mockScreenplayRepo{
		getOwnershipFunc: func(ctx context.Context, sid, uid uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if sid == screenplayID && uid == ownerID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:     pgtype.UUID{Bytes: sid, Valid: true},
					UserID: pgtype.UUID{Bytes: uid, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
		upsertScreenplayKeyFunc: func(ctx context.Context, sid, uid uuid.UUID, wrappedKey, keyIV, algorithm string, version int) (*model.ScreenplayKeyResponse, error) {
			return &model.ScreenplayKeyResponse{
				ScreenplayID: sid,
				Version:      version,
				Algorithm:    algorithm,
				IV:           keyIV,
				WrappedKey:   wrappedKey,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}, nil
		},
		getScreenplayKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) (*model.ScreenplayKeyResponse, error) {
			if sid == screenplayID && uid == ownerID {
				return &model.ScreenplayKeyResponse{
					ScreenplayID: sid,
					Version:      1,
					Algorithm:    "AES-GCM",
					IV:           valid12ByteIV,
					WrappedKey:   validWrappedKey,
				}, nil
			}
			return nil, model.ErrScreenplayKeyNotFound
		},
	}

	svc := NewScreenplayService(repo, &mockProjectRepoForScreenplay{})

	// 1. Owner can store wrapped key
	keyResp, err := svc.SetScreenplayKey(ctx, screenplayID, ownerID, validPayload)
	if err != nil {
		t.Fatalf("unexpected error setting screenplay key: %v", err)
	}
	if keyResp.WrappedKey != validWrappedKey || keyResp.IV != valid12ByteIV {
		t.Errorf("unexpected key response: %+v", keyResp)
	}

	// 2. Owner can retrieve wrapped key
	gotKey, err := svc.GetScreenplayKey(ctx, screenplayID, ownerID)
	if err != nil {
		t.Fatalf("unexpected error getting screenplay key: %v", err)
	}
	if gotKey.WrappedKey != validWrappedKey {
		t.Errorf("expected wrapped key %s, got %s", validWrappedKey, gotKey.WrappedKey)
	}

	// 3. Non-owner cannot store or retrieve key (returns 404)
	_, err = svc.GetScreenplayKey(ctx, screenplayID, nonOwnerID)
	if !errors.Is(err, model.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for non-owner, got %v", err)
	}
	_, err = svc.SetScreenplayKey(ctx, screenplayID, nonOwnerID, validPayload)
	if !errors.Is(err, model.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for non-owner, got %v", err)
	}

	// 4. Validation: Invalid IV length (e.g. 8 bytes instead of 12)
	badIVPayload := validPayload
	badIVPayload.IV = base64.StdEncoding.EncodeToString([]byte("12345678"))
	_, err = svc.SetScreenplayKey(ctx, screenplayID, ownerID, badIVPayload)
	if err == nil || !strings.Contains(err.Error(), "12 bytes") {
		t.Errorf("expected 12 bytes IV validation error, got: %v", err)
	}

	// 5. Validation: Unsupported algorithm
	badAlgoPayload := validPayload
	badAlgoPayload.Algorithm = "RSA-OAEP"
	_, err = svc.SetScreenplayKey(ctx, screenplayID, ownerID, badAlgoPayload)
	if err == nil || !strings.Contains(err.Error(), "unsupported encryption algorithm") {
		t.Errorf("expected unsupported algorithm error, got: %v", err)
	}

	// 6. Validation: Unsupported version
	badVerPayload := validPayload
	badVerPayload.Version = 2
	_, err = svc.SetScreenplayKey(ctx, screenplayID, ownerID, badVerPayload)
	if err == nil || !strings.Contains(err.Error(), "unsupported encryption version") {
		t.Errorf("expected unsupported version error, got: %v", err)
	}
}

func TestEncryptedScreenplayContentAutosaveAndOptimisticConcurrency(t *testing.T) {
	ctx := context.Background()
	ownerID := uuid.New()
	screenplayID := uuid.New()

	valid12ByteIV := base64.StdEncoding.EncodeToString([]byte("123456789012"))
	validCiphertext := base64.StdEncoding.EncodeToString([]byte("encrypted-ciphertext-bytes"))

	validEncryptedPayload := model.EncryptedPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         valid12ByteIV,
		Ciphertext: validCiphertext,
	}

	currentRevision := int64(5)

	repo := &mockScreenplayRepo{
		getOwnershipFunc: func(ctx context.Context, sid, uid uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if sid == screenplayID && uid == ownerID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:     pgtype.UUID{Bytes: sid, Valid: true},
					UserID: pgtype.UUID{Bytes: uid, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
		saveEncryptedContent: func(ctx context.Context, sid uuid.UUID, payload model.EncryptedPayload, rev int64) (*model.ScreenplayContentResponse, error) {
			if rev != currentRevision {
				return nil, model.ErrRevisionConflict
			}
			currentRevision++
			return &model.ScreenplayContentResponse{
				ScreenplayID:      sid,
				Content:           &payload,
				Revision:          currentRevision,
				IsEncrypted:       true,
				EncryptionVersion: payload.Version,
				Algorithm:         payload.Algorithm,
				IV:                payload.IV,
				Ciphertext:        payload.Ciphertext,
				UpdatedAt:         time.Now(),
			}, nil
		},
		saveContentFunc: func(ctx context.Context, sid uuid.UUID, content string, rev int64) (*model.ScreenplayContentResponse, error) {
			if rev != currentRevision {
				return nil, model.ErrRevisionConflict
			}
			currentRevision++
			return &model.ScreenplayContentResponse{
				ScreenplayID: sid,
				Content:      content,
				Revision:     currentRevision,
				IsEncrypted:  false,
				UpdatedAt:    time.Now(),
			}, nil
		},
	}

	svc := NewScreenplayService(repo, &mockProjectRepoForScreenplay{})

	// 1. Successful encrypted save with matching revision 5 -> revision increments to 6
	saveResp, err := svc.SaveContent(ctx, screenplayID, ownerID, model.SaveContentRequest{
		EncryptedContent: &validEncryptedPayload,
		Revision:         5,
	})
	if err != nil {
		t.Fatalf("unexpected error saving encrypted content: %v", err)
	}
	if saveResp.Revision != 6 || !saveResp.IsEncrypted {
		t.Errorf("expected revision 6 and isEncrypted=true, got revision %d, isEncrypted=%v", saveResp.Revision, saveResp.IsEncrypted)
	}

	// 2. Stale save with old revision 5 fails with 409 REVISION_CONFLICT
	_, err = svc.SaveContent(ctx, screenplayID, ownerID, model.SaveContentRequest{
		EncryptedContent: &validEncryptedPayload,
		Revision:         5,
	})
	if !errors.Is(err, model.ErrRevisionConflict) {
		t.Fatalf("expected ErrRevisionConflict on stale revision, got %v", err)
	}

	// 3. Save with JSON RawMessage payload (supporting frontend JSON serialization)
	rawJSON, _ := json.Marshal(validEncryptedPayload)
	saveRawResp, err := svc.SaveContent(ctx, screenplayID, ownerID, model.SaveContentRequest{
		Content:  rawJSON,
		Revision: 6,
	})
	if err != nil {
		t.Fatalf("unexpected error saving raw JSON encrypted content: %v", err)
	}
	if saveRawResp.Revision != 7 || !saveRawResp.IsEncrypted {
		t.Errorf("expected revision 7 and isEncrypted=true, got revision %d, isEncrypted=%v", saveRawResp.Revision, saveRawResp.IsEncrypted)
	}

	// 4. Legacy plaintext backward compatibility
	plainResp, err := svc.SaveContent(ctx, screenplayID, ownerID, model.SaveContentRequest{
		Content:  json.RawMessage(`"<h2 data-type=\"scene-heading\">1. INT. OPENING SCENE - DAY</h2>"`),
		Revision: 7,
	})
	if err != nil {
		t.Fatalf("unexpected error saving legacy plaintext content: %v", err)
	}
	if plainResp.Revision != 8 || plainResp.IsEncrypted {
		t.Errorf("expected revision 8 and isEncrypted=false, got revision %d, isEncrypted=%v", plainResp.Revision, plainResp.IsEncrypted)
	}

	// 5. Zero-knowledge verification: Ciphertext remains unchanged
	if saveResp.Ciphertext != validCiphertext {
		t.Errorf("expected ciphertext %s to be stored unchanged, got %s", validCiphertext, saveResp.Ciphertext)
	}
}

func TestEncryptedVersionHistoryAndRestore(t *testing.T) {
	ctx := context.Background()
	ownerID := uuid.New()
	screenplayID := uuid.New()
	versionID := uuid.New()

	valid12ByteIV := base64.StdEncoding.EncodeToString([]byte("123456789012"))
	validCiphertext := base64.StdEncoding.EncodeToString([]byte("encrypted-ciphertext-version-1"))

	validEncryptedPayload := model.EncryptedPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         valid12ByteIV,
		Ciphertext: validCiphertext,
	}

	repo := &mockScreenplayRepo{
		getOwnershipFunc: func(ctx context.Context, sid, uid uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if sid == screenplayID && uid == ownerID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:     pgtype.UUID{Bytes: sid, Valid: true},
					UserID: pgtype.UUID{Bytes: uid, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
		createVersionFunc: func(ctx context.Context, sid uuid.UUID, title, content string, encPayload *model.EncryptedPayload, createdBy *uuid.UUID) (*model.ScreenplayVersionResponse, error) {
			var parsedContent interface{} = content
			isEnc := false
			var encVer int
			var algo, iv, cipher string
			if encPayload != nil {
				isEnc = true
				parsedContent = encPayload
				encVer = encPayload.Version
				algo = encPayload.Algorithm
				iv = encPayload.IV
				cipher = encPayload.Ciphertext
			}
			return &model.ScreenplayVersionResponse{
				ID:                versionID,
				ScreenplayID:      sid,
				VersionNumber:     1,
				Title:             title,
				Content:           parsedContent,
				IsEncrypted:       isEnc,
				EncryptionVersion: encVer,
				Algorithm:         algo,
				IV:                iv,
				Ciphertext:        cipher,
				CreatedBy:         createdBy,
				CreatedAt:         time.Now(),
			}, nil
		},
		restoreVerFunc: func(ctx context.Context, sid, vid, uid uuid.UUID) (*model.RestoreVersionResponse, error) {
			return &model.RestoreVersionResponse{
				ScreenplayID:   sid,
				RestoredFromID: vid,
				NewRevision:    10,
				Content:        &validEncryptedPayload,
				IsEncrypted:    true,
				RestoreVersion: model.ScreenplayVersionResponse{
					ID:                uuid.New(),
					ScreenplayID:      sid,
					VersionNumber:     2,
					Title:             "Restored from Version 1",
					Content:           &validEncryptedPayload,
					IsEncrypted:       true,
					EncryptionVersion: 1,
					Algorithm:         "AES-GCM",
					IV:                valid12ByteIV,
					Ciphertext:        validCiphertext,
					CreatedBy:         &uid,
					CreatedAt:         time.Now(),
				},
			}, nil
		},
	}

	svc := NewScreenplayService(repo, &mockProjectRepoForScreenplay{})

	// 1. Create encrypted version snapshot
	verResp, err := svc.CreateVersion(ctx, screenplayID, ownerID, model.CreateVersionRequest{
		Title:            "Encrypted Draft 1",
		EncryptedPayload: &validEncryptedPayload,
	})
	if err != nil {
		t.Fatalf("unexpected error creating encrypted version: %v", err)
	}
	if !verResp.IsEncrypted || verResp.Ciphertext != validCiphertext {
		t.Errorf("expected version to preserve ciphertext and isEncrypted=true, got %+v", verResp)
	}

	// 2. Transactional Restore of encrypted version
	restored, err := svc.RestoreVersion(ctx, screenplayID, versionID, ownerID)
	if err != nil {
		t.Fatalf("unexpected error restoring version: %v", err)
	}
	if !restored.IsEncrypted || restored.NewRevision != 10 {
		t.Errorf("expected restored content to be encrypted with new revision 10, got %+v", restored)
	}
}
