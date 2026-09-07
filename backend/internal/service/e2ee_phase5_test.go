package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"backend/internal/model"
	"backend/sqlc/generated"
)

// -----------------------------------------------------------------------------
// Phase 5 E2EE Test Suite: Consolidated Keys, Recovery, Sharing & OCC
// -----------------------------------------------------------------------------

func TestUserEncryptionKeysService(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	userEmail := "writer@karu.film"

	validSalt := base64.StdEncoding.EncodeToString([]byte("1234567890123456")) // 16 bytes
	validPubKey := base64.StdEncoding.EncodeToString([]byte("32-bytes-of-spki-public-key-here"))
	validPrivKey := base64.StdEncoding.EncodeToString([]byte("32-bytes-of-wrapped-private-key!"))
	validIV := base64.StdEncoding.EncodeToString([]byte("123456789012"))

	var storedKeys *model.UserEncryptionKeysResponse

	screenplayRepo := &mockScreenplayRepo{
		upsertUserEncryptionKeysFunc: func(ctx context.Context, uid uuid.UUID, req model.UserEncryptionKeysRequest) (*model.UserEncryptionKeysResponse, error) {
			if uid != userID {
				t.Fatalf("unexpected userID: %s", uid)
			}
			storedKeys = &model.UserEncryptionKeysResponse{
				UserID:              uid,
				Salt:                req.Salt,
				Iterations:          req.Iterations,
				HashAlgorithm:       req.HashAlgorithm,
				PublicKey:           req.PublicKey,
				EncryptedPrivateKey: req.EncryptedPrivateKey,
				KeyIV:               req.KeyIV,
				Algorithm:           req.Algorithm,
				Version:             req.Version,
				CreatedAt:           time.Now(),
				UpdatedAt:           time.Now(),
			}
			return storedKeys, nil
		},
		getUserEncryptionKeysFunc: func(ctx context.Context, uid uuid.UUID) (*model.UserEncryptionKeysResponse, error) {
			if uid == userID && storedKeys != nil {
				return storedKeys, nil
			}
			return nil, model.ErrNotFound
		},
	}

	userRepo := &mockUserRepo{
		getByEmailFunc: func(ctx context.Context, email string) (*generated.User, error) {
			if email == userEmail {
				return &generated.User{
					ID:    pgtype.UUID{Bytes: userID, Valid: true},
					Email: userEmail,
					Name:  "Test Writer",
				}, nil
			}
			return nil, model.ErrNotFound
		},
	}

	userSvc := NewUserService(userRepo, screenplayRepo)

	// 1. Set valid encryption keys
	setResp, err := userSvc.SetEncryptionKeys(ctx, userID, model.UserEncryptionKeysRequest{
		Salt:                validSalt,
		Iterations:          600000,
		HashAlgorithm:       "SHA-256",
		PublicKey:           &validPubKey,
		EncryptedPrivateKey: &validPrivKey,
		KeyIV:               &validIV,
		Algorithm:           "ECDH-P256",
		Version:             1,
	})
	if err != nil {
		t.Fatalf("unexpected error setting encryption keys: %v", err)
	}
	if setResp.PublicKey == nil || *setResp.PublicKey != validPubKey || setResp.Iterations != 600000 {
		t.Errorf("unexpected keys response: %+v", setResp)
	}

	// 2. Retrieve encryption keys
	getResp, err := userSvc.GetEncryptionKeys(ctx, userID)
	if err != nil {
		t.Fatalf("unexpected error getting encryption keys: %v", err)
	}
	if getResp.EncryptedPrivateKey == nil || *getResp.EncryptedPrivateKey != validPrivKey {
		t.Errorf("expected encrypted private key %s, got %v", validPrivKey, getResp.EncryptedPrivateKey)
	}

	// 3. Lookup user by email returns user details
	lookupResp, err := userSvc.LookupUserByEmail(ctx, userEmail)
	if err != nil {
		t.Fatalf("unexpected error looking up user by email: %v", err)
	}
	if lookupResp.Email != userEmail || lookupResp.ID != userID {
		t.Errorf("lookup user mismatch: %+v", lookupResp)
	}

	// 4. Validation: Invalid Salt (not base64)
	_, err = userSvc.SetEncryptionKeys(ctx, userID, model.UserEncryptionKeysRequest{
		Salt:                "not-valid-base64!@#",
		Iterations:          600000,
		HashAlgorithm:       "SHA-256",
		PublicKey:           &validPubKey,
		EncryptedPrivateKey: &validPrivKey,
		KeyIV:               &validIV,
	})
	if err == nil {
		t.Error("expected error for invalid base64 salt, got nil")
	}

	// 5. Validation: Salt too short (< 8 bytes)
	shortSalt := base64.StdEncoding.EncodeToString([]byte("1234")) // 4 bytes
	_, err = userSvc.SetEncryptionKeys(ctx, userID, model.UserEncryptionKeysRequest{
		Salt:                shortSalt,
		Iterations:          600000,
		HashAlgorithm:       "SHA-256",
		PublicKey:           &validPubKey,
		EncryptedPrivateKey: &validPrivKey,
		KeyIV:               &validIV,
	})
	if err == nil {
		t.Error("expected error for salt shorter than minimum bytes, got nil")
	}

	// 6. Validation: Iterations too low (< 100,000)
	_, err = userSvc.SetEncryptionKeys(ctx, userID, model.UserEncryptionKeysRequest{
		Salt:                validSalt,
		Iterations:          5000,
		HashAlgorithm:       "SHA-256",
		PublicKey:           &validPubKey,
		EncryptedPrivateKey: &validPrivKey,
		KeyIV:               &validIV,
	})
	if err == nil {
		t.Error("expected error for iterations < 100k, got nil")
	}
}

func TestUserRecoveryCredentialsService(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	userEmail := "recovery@karu.film"

	validSalt := base64.StdEncoding.EncodeToString([]byte("1234567890123456"))
	validIV := base64.StdEncoding.EncodeToString([]byte("123456789012"))
	validWrappedKey := base64.StdEncoding.EncodeToString([]byte("recovery-wrapped-private-key-bytes"))

	var storedCred *model.UserRecoveryCredentialResponse
	var storedKeys *model.UserEncryptionKeysResponse

	screenplayRepo := &mockScreenplayRepo{
		upsertUserRecoveryCredentialFunc: func(ctx context.Context, uid uuid.UUID, req model.UserRecoveryCredentialRequest) (*model.UserRecoveryCredentialResponse, error) {
			storedCred = &model.UserRecoveryCredentialResponse{
				UserID:                  uid,
				CredentialType:          req.CredentialType,
				Salt:                    req.Salt,
				Iterations:              req.Iterations,
				HashAlgorithm:           req.HashAlgorithm,
				DoubleWrappedPrivateKey: req.DoubleWrappedPrivateKey,
				KeyIV:                   req.KeyIV,
				Version:                 req.Version,
				CreatedAt:               time.Now(),
				UpdatedAt:               time.Now(),
			}
			return storedCred, nil
		},
		getUserRecoveryCredentialFunc: func(ctx context.Context, uid uuid.UUID, credType string) (*model.UserRecoveryCredentialResponse, error) {
			if uid == userID && storedCred != nil {
				return storedCred, nil
			}
			return nil, model.ErrNotFound
		},
		getUserEncryptionKeysFunc: func(ctx context.Context, uid uuid.UUID) (*model.UserEncryptionKeysResponse, error) {
			if uid == userID && storedKeys != nil {
				return storedKeys, nil
			}
			return nil, model.ErrNotFound
		},
		upsertUserEncryptionKeysFunc: func(ctx context.Context, uid uuid.UUID, req model.UserEncryptionKeysRequest) (*model.UserEncryptionKeysResponse, error) {
			storedKeys = &model.UserEncryptionKeysResponse{
				UserID:              uid,
				Salt:                req.Salt,
				Iterations:          req.Iterations,
				HashAlgorithm:       req.HashAlgorithm,
				PublicKey:           req.PublicKey,
				EncryptedPrivateKey: req.EncryptedPrivateKey,
				KeyIV:               req.KeyIV,
				Algorithm:           req.Algorithm,
				Version:             req.Version,
				CreatedAt:           time.Now(),
				UpdatedAt:           time.Now(),
			}
			return storedKeys, nil
		},
	}

	userRepo := &mockUserRepo{
		getByEmailFunc: func(ctx context.Context, email string) (*generated.User, error) {
			if email == userEmail {
				return &generated.User{
					ID:    pgtype.UUID{Bytes: userID, Valid: true},
					Email: userEmail,
					Name:  "Recovery User",
				}, nil
			}
			return nil, model.ErrNotFound
		},
	}

	userSvc := NewUserService(userRepo, screenplayRepo)

	// 1. Set recovery credentials
	credResp, err := userSvc.SetRecoveryCredentials(ctx, userID, model.UserRecoveryCredentialRequest{
		CredentialType:          "recovery_key",
		Salt:                    validSalt,
		Iterations:              600000,
		HashAlgorithm:           "SHA-256",
		DoubleWrappedPrivateKey: &validWrappedKey,
		KeyIV:                   validIV,
		Version:                 1,
	})
	if err != nil {
		t.Fatalf("unexpected error setting recovery credentials: %v", err)
	}
	if credResp.DoubleWrappedPrivateKey == nil || *credResp.DoubleWrappedPrivateKey != validWrappedKey {
		t.Errorf("expected wrapped private key %s, got %v", validWrappedKey, credResp.DoubleWrappedPrivateKey)
	}

	// 2. Get recovery credentials
	getCred, err := userSvc.GetRecoveryCredentials(ctx, userID)
	if err != nil {
		t.Fatalf("unexpected error getting recovery credentials: %v", err)
	}
	if getCred.Salt != validSalt {
		t.Errorf("expected recovery salt %s, got %s", validSalt, getCred.Salt)
	}

	// 3. Recovery lookup by email
	lookupResp, err := userSvc.RecoveryLookup(ctx, userEmail)
	if err != nil {
		t.Fatalf("unexpected error in recovery lookup: %v", err)
	}
	if lookupResp.DoubleWrappedPrivateKey == nil || *lookupResp.DoubleWrappedPrivateKey != validWrappedKey || lookupResp.Iterations != 600000 {
		t.Errorf("unexpected recovery lookup response: %+v", lookupResp)
	}

	// 4. Recovery lookup for non-existent email
	_, err = userSvc.RecoveryLookup(ctx, "unknown@karu.film")
	if !errors.Is(err, model.ErrNotFound) {
		t.Errorf("expected ErrNotFound for unknown email, got %v", err)
	}

	// 5. Recovery reset with new passphrase-derived keys
	newPrivKey := base64.StdEncoding.EncodeToString([]byte("new-uek-wrapped-private-key-bytes"))
	newIV := base64.StdEncoding.EncodeToString([]byte("987654321098"))
	newSalt := base64.StdEncoding.EncodeToString([]byte("new-salt-16-bytes!"))

	err = userSvc.RecoveryReset(ctx, model.RecoveryResetRequest{
		Email:          userEmail,
		CredentialType: "recovery_key",
		NewEncryptionKeys: model.UserEncryptionKeysRequest{
			Salt:                newSalt,
			Iterations:          600000,
			HashAlgorithm:       "SHA-256",
			EncryptedPrivateKey: &newPrivKey,
			KeyIV:               &newIV,
			Algorithm:           "ECDH-P256",
			Version:             1,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error during recovery reset: %v", err)
	}

	// Verify the stored keys were updated
	keys, err := userSvc.GetEncryptionKeys(ctx, userID)
	if err != nil {
		t.Fatalf("unexpected error retrieving updated keys: %v", err)
	}
	if keys.Salt != newSalt || keys.EncryptedPrivateKey == nil || *keys.EncryptedPrivateKey != newPrivKey {
		t.Errorf("unexpected updated keys after recovery reset: %+v", keys)
	}
}

func TestScreenplaySharingAndRolesService(t *testing.T) {
	ctx := context.Background()
	ownerID := uuid.New()
	editorID := uuid.New()
	viewerID := uuid.New()
	strangerID := uuid.New()
	screenplayID := uuid.New()

	valid12ByteIV := base64.StdEncoding.EncodeToString([]byte("123456789012"))
	validWrappedKey := base64.StdEncoding.EncodeToString([]byte("32-bytes-of-wrapped-key-material"))
	validEphemeralKey := base64.StdEncoding.EncodeToString([]byte("ephemeral-ecdh-public-key-spki"))

	accessKeys := make(map[uuid.UUID]*model.ScreenplayAccessKeyResponse)

	// Pre-populate owner key
	accessKeys[ownerID] = &model.ScreenplayAccessKeyResponse{
		ScreenplayID: screenplayID,
		UserID:       ownerID,
		Role:         "owner",
		KeyIV:        valid12ByteIV,
		WrappedKey:   validWrappedKey,
		Version:      1,
		Algorithm:    "AES-GCM",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	currentRevision := int64(1)

	screenplayRepo := &mockScreenplayRepo{
		getOwnershipFunc: func(ctx context.Context, sid, uid uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if sid == screenplayID && uid == ownerID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:     pgtype.UUID{Bytes: sid, Valid: true},
					UserID: pgtype.UUID{Bytes: ownerID, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
		upsertScreenplayAccessKeyFunc: func(ctx context.Context, sid, uid uuid.UUID, req model.ScreenplayAccessKeyRequest, grantedBy *uuid.UUID) (*model.ScreenplayAccessKeyResponse, error) {
			resp := &model.ScreenplayAccessKeyResponse{
				ScreenplayID:       sid,
				UserID:             uid,
				Role:               req.Role,
				KeyIV:              req.KeyIV,
				WrappedKey:         req.WrappedKey,
				EphemeralPublicKey: req.EphemeralPublicKey,
				Version:            req.Version,
				Algorithm:          req.Algorithm,
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}
			accessKeys[uid] = resp
			return resp, nil
		},
		getScreenplayKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) (*model.ScreenplayKeyResponse, error) {
			if sid == screenplayID {
				if key, ok := accessKeys[uid]; ok {
					return &model.ScreenplayKeyResponse{
						ScreenplayID:       sid,
						Role:               key.Role,
						IV:                 key.KeyIV,
						WrappedKey:         key.WrappedKey,
						EphemeralPublicKey: key.EphemeralPublicKey,
						Version:            key.Version,
						Algorithm:          key.Algorithm,
					}, nil
				}
			}
			return nil, model.ErrScreenplayKeyNotFound
		},
		getScreenplayAccessKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) (*model.ScreenplayAccessKeyResponse, error) {
			if sid == screenplayID {
				if key, ok := accessKeys[uid]; ok {
					return key, nil
				}
			}
			return nil, model.ErrScreenplayKeyNotFound
		},
		deleteScreenplayAccessKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) error {
			if sid == screenplayID {
				delete(accessKeys, uid)
				return nil
			}
			return model.ErrNotFound
		},
		deleteScreenplayKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) error {
			if sid == screenplayID {
				delete(accessKeys, uid)
				return nil
			}
			return model.ErrNotFound
		},
		listCollaboratorsFunc: func(ctx context.Context, sid uuid.UUID) ([]model.ScreenplayCollaboratorResponse, error) {
			var list []model.ScreenplayCollaboratorResponse
			for uid, key := range accessKeys {
				list = append(list, model.ScreenplayCollaboratorResponse{
					UserID: uid,
					Role:   key.Role,
				})
			}
			return list, nil
		},
		saveEncryptedContent: func(ctx context.Context, sid uuid.UUID, payload model.EncryptedPayload, revision int64) (*model.ScreenplayContentResponse, error) {
			if revision != currentRevision {
				return nil, model.ErrRevisionConflict
			}
			currentRevision++
			return &model.ScreenplayContentResponse{
				ScreenplayID: sid,
				Ciphertext:   payload.Ciphertext,
				IV:           payload.IV,
				Revision:     currentRevision,
				UpdatedAt:    time.Now(),
			}, nil
		},
	}

	svc := NewScreenplayService(screenplayRepo, &mockProjectRepoForScreenplay{})

	// 1. Owner shares with Editor via ECIES-wrapped key
	shareResp, err := svc.ShareScreenplay(ctx, screenplayID, ownerID, model.ShareScreenplayRequest{
		RecipientUserID:    editorID,
		Role:               "editor",
		WrappedKey:         validWrappedKey,
		KeyIV:              valid12ByteIV,
		EphemeralPublicKey: validEphemeralKey,
		Algorithm:          "ECIES-P256-AES-GCM",
		Version:            1,
	})
	if err != nil {
		t.Fatalf("unexpected error sharing screenplay with editor: %v", err)
	}
	if shareResp.Role != "editor" || shareResp.EphemeralPublicKey == nil || *shareResp.EphemeralPublicKey != validEphemeralKey {
		t.Errorf("unexpected share response: %+v", shareResp)
	}

	// 2. Owner shares with Viewer
	_, err = svc.ShareScreenplay(ctx, screenplayID, ownerID, model.ShareScreenplayRequest{
		RecipientUserID:    viewerID,
		Role:               "viewer",
		WrappedKey:         validWrappedKey,
		KeyIV:              valid12ByteIV,
		EphemeralPublicKey: validEphemeralKey,
		Algorithm:          "ECIES-P256-AES-GCM",
		Version:            1,
	})
	if err != nil {
		t.Fatalf("unexpected error sharing screenplay with viewer: %v", err)
	}

	// 3. Non-owner (editor) cannot share with another user
	_, err = svc.ShareScreenplay(ctx, screenplayID, editorID, model.ShareScreenplayRequest{
		RecipientUserID:    strangerID,
		Role:               "viewer",
		WrappedKey:         validWrappedKey,
		KeyIV:              valid12ByteIV,
		EphemeralPublicKey: validEphemeralKey,
	})
	if !errors.Is(err, model.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized when non-owner shares, got %v", err)
	}

	// 4. Editor can retrieve their own access key
	editorKey, err := svc.GetScreenplayKey(ctx, screenplayID, editorID)
	if err != nil {
		t.Fatalf("unexpected error retrieving editor key: %v", err)
	}
	if editorKey.EphemeralPublicKey == nil || *editorKey.EphemeralPublicKey != validEphemeralKey {
		t.Errorf("expected ephemeral public key %s, got %v", validEphemeralKey, editorKey.EphemeralPublicKey)
	}

	// 5. Editor can save encrypted content
	validEncPayload := &model.EncryptedPayload{
		Version:    1,
		Algorithm:  "AES-GCM",
		IV:         valid12ByteIV,
		Ciphertext: base64.StdEncoding.EncodeToString([]byte("encrypted-tiptap-ast-ciphertext")),
	}
	saveResp, err := svc.SaveContent(ctx, screenplayID, editorID, model.SaveContentRequest{
		EncryptedContent: validEncPayload,
		Revision:         currentRevision,
	})
	if err != nil {
		t.Fatalf("unexpected error saving content as editor: %v", err)
	}
	if saveResp.Revision != 2 {
		t.Errorf("expected revision 2 after save, got %d", saveResp.Revision)
	}

	// 6. Viewer cannot save content (unauthorized)
	_, err = svc.SaveContent(ctx, screenplayID, viewerID, model.SaveContentRequest{
		EncryptedContent: validEncPayload,
		Revision:         currentRevision,
	})
	if !errors.Is(err, model.ErrUnauthorized) {
		t.Errorf("expected ErrUnauthorized when viewer saves content, got %v", err)
	}

	// 7. Stranger has zero access (not found)
	_, err = svc.GetScreenplay(ctx, screenplayID, strangerID)
	if !errors.Is(err, model.ErrNotFound) {
		t.Errorf("expected ErrNotFound for stranger, got %v", err)
	}

	// 8. Owner revokes Editor access
	err = svc.RevokeCollaborator(ctx, screenplayID, ownerID, editorID)
	if err != nil {
		t.Fatalf("unexpected error revoking collaborator: %v", err)
	}

	// 9. Editor access is completely gone (returns ErrNotFound)
	_, err = svc.GetScreenplayKey(ctx, screenplayID, editorID)
	if !errors.Is(err, model.ErrNotFound) {
		t.Errorf("expected ErrNotFound after revocation, got %v", err)
	}
}

func TestPlaintextContentRejection(t *testing.T) {
	ctx := context.Background()
	ownerID := uuid.New()
	screenplayID := uuid.New()

	screenplayRepo := &mockScreenplayRepo{
		getOwnershipFunc: func(ctx context.Context, sid, uid uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
			if sid == screenplayID && uid == ownerID {
				return &generated.GetScreenplayByIDAndUserIDRow{
					ID:     pgtype.UUID{Bytes: sid, Valid: true},
					UserID: pgtype.UUID{Bytes: ownerID, Valid: true},
				}, nil
			}
			return nil, model.ErrNotFound
		},
		getScreenplayAccessKeyFunc: func(ctx context.Context, sid, uid uuid.UUID) (*model.ScreenplayAccessKeyResponse, error) {
			return &model.ScreenplayAccessKeyResponse{Role: "owner"}, nil
		},
	}

	svc := NewScreenplayService(screenplayRepo, &mockProjectRepoForScreenplay{})

	// 1. SaveContent with nil EncryptedContent and no content is rejected
	_, err := svc.SaveContent(ctx, screenplayID, ownerID, model.SaveContentRequest{
		Revision: 1,
	})
	if err == nil || !errors.Is(err, model.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for empty save request, got %v", err)
	}

	// 2. SaveContent with plaintext JSON is strictly rejected
	_, err = svc.SaveContent(ctx, screenplayID, ownerID, model.SaveContentRequest{
		Content:  json.RawMessage(`"Plaintext screenplay content"`),
		Revision: 1,
	})
	if err == nil || !errors.Is(err, model.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for plaintext content, got %v", err)
	}

	// 3. CreateVersion with plaintext string is strictly rejected
	plainContent := "Plaintext version text"
	_, err = svc.CreateVersion(ctx, screenplayID, ownerID, model.CreateVersionRequest{
		Title:   "Draft 1 Snapshot",
		Content: &plainContent,
	})
	if err == nil || !errors.Is(err, model.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for plaintext version content, got %v", err)
	}
}
