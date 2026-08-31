package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
	"backend/sqlc/generated"
)

type ScreenplayRepository interface {
	// User Encryption Metadata & Identity
	GetUserEncryptionMetadata(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionMetadataResponse, error)
	UpsertUserEncryptionMetadata(ctx context.Context, userID uuid.UUID, salt string, iterations int, hashAlgo string) (*model.UserEncryptionMetadataResponse, error)
	GetUserEncryptionIdentity(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionIdentityPayload, error)
	GetUserPublicKey(ctx context.Context, userID uuid.UUID) (*model.UserPublicKeyResponse, error)
	UpsertUserEncryptionIdentity(ctx context.Context, userID uuid.UUID, publicKey, encryptedPrivateKey, keyIV, algorithm string, version int) (*model.UserEncryptionIdentityPayload, error)

	// Screenplay Keys
	GetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayKeyResponse, error)
	UpsertScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID, wrappedKey, keyIV, algorithm string, version int) (*model.ScreenplayKeyResponse, error)
	DeleteScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) error

	// Screenplay CRUD & Content
	CreateScreenplay(ctx context.Context, projectID uuid.UUID, title, description, initialContent string, encPayload *model.EncryptedPayload, wrappedKey *model.WrappedKeyPayload, userID uuid.UUID) (*model.ScreenplayDetailResponse, error)
	GetScreenplay(ctx context.Context, id uuid.UUID) (*generated.GetScreenplayByIDRow, error)
	GetScreenplayWithOwnership(ctx context.Context, id, userID uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error)
	GetDefaultScreenplayByProject(ctx context.Context, projectID, userID uuid.UUID) (*model.ScreenplayResponse, error)
	ListScreenplaysByProject(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error)
	UpdateScreenplay(ctx context.Context, id uuid.UUID, title, description *string) (*model.ScreenplayResponse, error)
	DeleteScreenplay(ctx context.Context, id uuid.UUID) error

	GetContent(ctx context.Context, screenplayID uuid.UUID) (*model.ScreenplayContentResponse, error)
	SaveContentWithRevision(ctx context.Context, screenplayID uuid.UUID, content string, revision int64) (*model.ScreenplayContentResponse, error)
	SaveEncryptedContentWithRevision(ctx context.Context, screenplayID uuid.UUID, payload model.EncryptedPayload, revision int64) (*model.ScreenplayContentResponse, error)

	// Versions & Restore
	CreateVersion(ctx context.Context, screenplayID uuid.UUID, title, content string, encPayload *model.EncryptedPayload, createdBy *uuid.UUID) (*model.ScreenplayVersionResponse, error)
	GetLatestVersionNumber(ctx context.Context, screenplayID uuid.UUID) (int, error)
	ListVersions(ctx context.Context, screenplayID uuid.UUID) ([]model.ScreenplayVersionResponse, error)
	GetVersionByID(ctx context.Context, versionID uuid.UUID) (*model.ScreenplayVersionResponse, error)
	RestoreVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error)
}

type screenplayRepository struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

func NewScreenplayRepository(pool *pgxpool.Pool) ScreenplayRepository {
	return &screenplayRepository{
		queries: generated.New(pool),
		pool:    pool,
	}
}

func toScreenplayResponse(id, projectID pgtype.UUID, title, description string, isDefault bool, sortOrder int32, createdAt, updatedAt pgtype.Timestamptz) model.ScreenplayResponse {
	return model.ScreenplayResponse{
		ID:          pgtypeToUUID(id),
		ProjectID:   pgtypeToUUID(projectID),
		Title:       title,
		Description: description,
		IsDefault:   isDefault,
		SortOrder:   int(sortOrder),
		CreatedAt:   pgtypeToTime(createdAt),
		UpdatedAt:   pgtypeToTime(updatedAt),
	}
}

func toCreateVersionResponse(v generated.CreateScreenplayVersionRow) model.ScreenplayVersionResponse {
	var createdBy *uuid.UUID
	if v.CreatedBy.Valid {
		id := uuid.UUID(v.CreatedBy.Bytes)
		createdBy = &id
	}

	var content interface{} = v.Content
	if v.IsEncrypted {
		content = &model.EncryptedPayload{
			Version:    int(v.EncryptionVersion),
			Algorithm:  v.Algorithm,
			IV:         v.Iv,
			Ciphertext: v.Ciphertext,
		}
	}

	return model.ScreenplayVersionResponse{
		ID:                pgtypeToUUID(v.ID),
		ScreenplayID:      pgtypeToUUID(v.ScreenplayID),
		VersionNumber:     int(v.VersionNumber),
		Title:             v.Title,
		Content:           content,
		IsEncrypted:       v.IsEncrypted,
		EncryptionVersion: int(v.EncryptionVersion),
		Algorithm:         v.Algorithm,
		IV:                v.Iv,
		Ciphertext:        v.Ciphertext,
		CreatedBy:         createdBy,
		CreatedAt:         pgtypeToTime(v.CreatedAt),
	}
}

func toListVersionResponse(v generated.ListScreenplayVersionsByScreenplayIDRow) model.ScreenplayVersionResponse {
	var createdBy *uuid.UUID
	if v.CreatedBy.Valid {
		id := uuid.UUID(v.CreatedBy.Bytes)
		createdBy = &id
	}

	var content interface{} = v.Content
	if v.IsEncrypted {
		content = &model.EncryptedPayload{
			Version:    int(v.EncryptionVersion),
			Algorithm:  v.Algorithm,
			IV:         v.Iv,
			Ciphertext: v.Ciphertext,
		}
	}

	return model.ScreenplayVersionResponse{
		ID:                pgtypeToUUID(v.ID),
		ScreenplayID:      pgtypeToUUID(v.ScreenplayID),
		VersionNumber:     int(v.VersionNumber),
		Title:             v.Title,
		Content:           content,
		IsEncrypted:       v.IsEncrypted,
		EncryptionVersion: int(v.EncryptionVersion),
		Algorithm:         v.Algorithm,
		IV:                v.Iv,
		Ciphertext:        v.Ciphertext,
		CreatedBy:         createdBy,
		CreatedAt:         pgtypeToTime(v.CreatedAt),
	}
}

func toGetVersionResponse(v generated.GetScreenplayVersionByIDRow) model.ScreenplayVersionResponse {
	var createdBy *uuid.UUID
	if v.CreatedBy.Valid {
		id := uuid.UUID(v.CreatedBy.Bytes)
		createdBy = &id
	}

	var content interface{} = v.Content
	if v.IsEncrypted {
		content = &model.EncryptedPayload{
			Version:    int(v.EncryptionVersion),
			Algorithm:  v.Algorithm,
			IV:         v.Iv,
			Ciphertext: v.Ciphertext,
		}
	}

	return model.ScreenplayVersionResponse{
		ID:                pgtypeToUUID(v.ID),
		ScreenplayID:      pgtypeToUUID(v.ScreenplayID),
		VersionNumber:     int(v.VersionNumber),
		Title:             v.Title,
		Content:           content,
		IsEncrypted:       v.IsEncrypted,
		EncryptionVersion: int(v.EncryptionVersion),
		Algorithm:         v.Algorithm,
		IV:                v.Iv,
		Ciphertext:        v.Ciphertext,
		CreatedBy:         createdBy,
		CreatedAt:         pgtypeToTime(v.CreatedAt),
	}
}

// User Encryption Metadata

func (r *screenplayRepository) GetUserEncryptionMetadata(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionMetadataResponse, error) {
	m, err := r.queries.GetUserEncryptionMetadata(ctx, uuidToPgtype(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrEncryptionNotInitialized
		}
		return nil, err
	}

	return &model.UserEncryptionMetadataResponse{
		UserID:        pgtypeToUUID(m.UserID),
		Salt:          m.Salt,
		Iterations:    int(m.Iterations),
		HashAlgorithm: m.HashAlgorithm,
		CreatedAt:     pgtypeToTime(m.CreatedAt),
		UpdatedAt:     pgtypeToTime(m.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) UpsertUserEncryptionMetadata(ctx context.Context, userID uuid.UUID, salt string, iterations int, hashAlgo string) (*model.UserEncryptionMetadataResponse, error) {
	m, err := r.queries.UpsertUserEncryptionMetadata(ctx, generated.UpsertUserEncryptionMetadataParams{
		UserID:        uuidToPgtype(userID),
		Salt:          salt,
		Iterations:    int32(iterations),
		HashAlgorithm: hashAlgo,
	})
	if err != nil {
		return nil, err
	}

	return &model.UserEncryptionMetadataResponse{
		UserID:        pgtypeToUUID(m.UserID),
		Salt:          m.Salt,
		Iterations:    int(m.Iterations),
		HashAlgorithm: m.HashAlgorithm,
		CreatedAt:     pgtypeToTime(m.CreatedAt),
		UpdatedAt:     pgtypeToTime(m.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) GetUserEncryptionIdentity(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionIdentityPayload, error) {
	ident, err := r.queries.GetUserEncryptionIdentity(ctx, uuidToPgtype(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	return &model.UserEncryptionIdentityPayload{
		UserID:              pgtypeToUUID(ident.UserID),
		PublicKey:           ident.PublicKey,
		EncryptedPrivateKey: ident.EncryptedPrivateKey,
		KeyIV:               ident.KeyIv,
		Algorithm:           ident.Algorithm,
		Version:             int(ident.Version),
		CreatedAt:           pgtypeToTime(ident.CreatedAt),
		UpdatedAt:           pgtypeToTime(ident.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) GetUserPublicKey(ctx context.Context, userID uuid.UUID) (*model.UserPublicKeyResponse, error) {
	row, err := r.queries.GetUserPublicKey(ctx, uuidToPgtype(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	return &model.UserPublicKeyResponse{
		UserID:    pgtypeToUUID(row.UserID),
		PublicKey: row.PublicKey,
		Algorithm: row.Algorithm,
		Version:   int(row.Version),
	}, nil
}

func (r *screenplayRepository) UpsertUserEncryptionIdentity(ctx context.Context, userID uuid.UUID, publicKey, encryptedPrivateKey, keyIV, algorithm string, version int) (*model.UserEncryptionIdentityPayload, error) {
	ident, err := r.queries.UpsertUserEncryptionIdentity(ctx, generated.UpsertUserEncryptionIdentityParams{
		UserID:              uuidToPgtype(userID),
		PublicKey:           publicKey,
		EncryptedPrivateKey: encryptedPrivateKey,
		KeyIv:               keyIV,
		Algorithm:           algorithm,
		Version:             int32(version),
	})
	if err != nil {
		return nil, err
	}

	return &model.UserEncryptionIdentityPayload{
		UserID:              pgtypeToUUID(ident.UserID),
		PublicKey:           ident.PublicKey,
		EncryptedPrivateKey: ident.EncryptedPrivateKey,
		KeyIV:               ident.KeyIv,
		Algorithm:           ident.Algorithm,
		Version:             int(ident.Version),
		CreatedAt:           pgtypeToTime(ident.CreatedAt),
		UpdatedAt:           pgtypeToTime(ident.UpdatedAt),
	}, nil
}

// Screenplay Keys

func (r *screenplayRepository) GetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayKeyResponse, error) {
	k, err := r.queries.GetScreenplayKeyByScreenplayAndUser(ctx, generated.GetScreenplayKeyByScreenplayAndUserParams{
		ScreenplayID: uuidToPgtype(screenplayID),
		UserID:       uuidToPgtype(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrScreenplayKeyNotFound
		}
		return nil, err
	}

	return &model.ScreenplayKeyResponse{
		ScreenplayID: pgtypeToUUID(k.ScreenplayID),
		Version:      int(k.Version),
		Algorithm:    k.Algorithm,
		IV:           k.KeyIv,
		WrappedKey:   k.WrappedKey,
		CreatedAt:    pgtypeToTime(k.CreatedAt),
		UpdatedAt:    pgtypeToTime(k.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) UpsertScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID, wrappedKey, keyIV, algorithm string, version int) (*model.ScreenplayKeyResponse, error) {
	k, err := r.queries.UpsertScreenplayKey(ctx, generated.UpsertScreenplayKeyParams{
		ScreenplayID: uuidToPgtype(screenplayID),
		UserID:       uuidToPgtype(userID),
		WrappedKey:   wrappedKey,
		KeyIv:        keyIV,
		Algorithm:    algorithm,
		Version:      int32(version),
	})
	if err != nil {
		return nil, err
	}

	return &model.ScreenplayKeyResponse{
		ScreenplayID: pgtypeToUUID(k.ScreenplayID),
		Version:      int(k.Version),
		Algorithm:    k.Algorithm,
		IV:           k.KeyIv,
		WrappedKey:   k.WrappedKey,
		CreatedAt:    pgtypeToTime(k.CreatedAt),
		UpdatedAt:    pgtypeToTime(k.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) DeleteScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) error {
	return r.queries.DeleteScreenplayKey(ctx, generated.DeleteScreenplayKeyParams{
		ScreenplayID: uuidToPgtype(screenplayID),
		UserID:       uuidToPgtype(userID),
	})
}

// Screenplay CRUD

func (r *screenplayRepository) CreateScreenplay(
	ctx context.Context,
	projectID uuid.UUID,
	title, description, initialContent string,
	encPayload *model.EncryptedPayload,
	wrappedKey *model.WrappedKeyPayload,
	userID uuid.UUID,
) (*model.ScreenplayDetailResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	// 1. Insert Screenplay
	screenplay, err := qtx.CreateScreenplay(ctx, generated.CreateScreenplayParams{
		ProjectID:   uuidToPgtype(projectID),
		Title:       title,
		Description: description,
		IsDefault:   false,
		SortOrder:   1,
	})
	if err != nil {
		return nil, err
	}

	// 2. Insert Screenplay Content
	contentParams := generated.CreateScreenplayContentParams{
		ScreenplayID:      screenplay.ID,
		Content:           initialContent,
		Revision:          1,
		IsEncrypted:       false,
		EncryptionVersion: 1,
		Algorithm:         "AES-GCM",
		Iv:                "",
		Ciphertext:        "",
	}

	var detailContent interface{} = initialContent
	if encPayload != nil {
		contentParams.IsEncrypted = true
		contentParams.EncryptionVersion = int32(encPayload.Version)
		contentParams.Algorithm = encPayload.Algorithm
		contentParams.Iv = encPayload.IV
		contentParams.Ciphertext = encPayload.Ciphertext
		contentParams.Content = ""
		detailContent = encPayload
	}

	content, err := qtx.CreateScreenplayContent(ctx, contentParams)
	if err != nil {
		return nil, err
	}

	// 3. If wrapped key provided, insert screenplay key
	if wrappedKey != nil {
		_, err = qtx.UpsertScreenplayKey(ctx, generated.UpsertScreenplayKeyParams{
			ScreenplayID: screenplay.ID,
			UserID:       uuidToPgtype(userID),
			WrappedKey:   wrappedKey.WrappedKey,
			KeyIv:        wrappedKey.IV,
			Algorithm:    wrappedKey.Algorithm,
			Version:      int32(wrappedKey.Version),
		})
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit tx: %w", err)
	}

	return &model.ScreenplayDetailResponse{
		ScreenplayResponse: toScreenplayResponse(screenplay.ID, screenplay.ProjectID, screenplay.Title, screenplay.Description, screenplay.IsDefault, screenplay.SortOrder, screenplay.CreatedAt, screenplay.UpdatedAt),
		Content:            detailContent,
		Revision:           content.Revision,
		IsEncrypted:        content.IsEncrypted,
		EncryptionVersion:  int(content.EncryptionVersion),
		Algorithm:          content.Algorithm,
		IV:                 content.Iv,
		Ciphertext:         content.Ciphertext,
	}, nil
}

func (r *screenplayRepository) GetScreenplay(ctx context.Context, id uuid.UUID) (*generated.GetScreenplayByIDRow, error) {
	s, err := r.queries.GetScreenplayByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *screenplayRepository) GetScreenplayWithOwnership(ctx context.Context, id, userID uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error) {
	row, err := r.queries.GetScreenplayByIDAndUserID(ctx, generated.GetScreenplayByIDAndUserIDParams{
		ID:     uuidToPgtype(id),
		UserID: uuidToPgtype(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &row, nil
}

func (r *screenplayRepository) GetDefaultScreenplayByProject(ctx context.Context, projectID, userID uuid.UUID) (*model.ScreenplayResponse, error) {
	row, err := r.queries.GetDefaultScreenplayByProjectID(ctx, generated.GetDefaultScreenplayByProjectIDParams{
		ProjectID: uuidToPgtype(projectID),
		UserID:    uuidToPgtype(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	resp := toScreenplayResponse(row.ID, row.ProjectID, row.Title, row.Description, row.IsDefault, row.SortOrder, row.CreatedAt, row.UpdatedAt)
	return &resp, nil
}

func (r *screenplayRepository) ListScreenplaysByProject(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error) {
	rows, err := r.queries.ListScreenplaysByProjectID(ctx, generated.ListScreenplaysByProjectIDParams{
		ProjectID: uuidToPgtype(projectID),
		UserID:    uuidToPgtype(userID),
	})
	if err != nil {
		return nil, err
	}

	res := make([]model.ScreenplayResponse, 0, len(rows))
	for _, row := range rows {
		res = append(res, toScreenplayResponse(row.ID, row.ProjectID, row.Title, row.Description, row.IsDefault, row.SortOrder, row.CreatedAt, row.UpdatedAt))
	}
	return res, nil
}

func (r *screenplayRepository) UpdateScreenplay(ctx context.Context, id uuid.UUID, title, description *string) (*model.ScreenplayResponse, error) {
	var t, d string
	if title != nil {
		t = *title
	}
	if description != nil {
		d = *description
	}

	s, err := r.queries.UpdateScreenplay(ctx, generated.UpdateScreenplayParams{
		ID:          uuidToPgtype(id),
		Column2:     t,
		Description: d,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	resp := toScreenplayResponse(s.ID, s.ProjectID, s.Title, s.Description, s.IsDefault, s.SortOrder, s.CreatedAt, s.UpdatedAt)
	return &resp, nil
}

func (r *screenplayRepository) DeleteScreenplay(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteScreenplay(ctx, uuidToPgtype(id))
}

// Content

func (r *screenplayRepository) GetContent(ctx context.Context, screenplayID uuid.UUID) (*model.ScreenplayContentResponse, error) {
	c, err := r.queries.GetScreenplayContent(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	var content interface{} = c.Content
	if c.IsEncrypted {
		content = &model.EncryptedPayload{
			Version:    int(c.EncryptionVersion),
			Algorithm:  c.Algorithm,
			IV:         c.Iv,
			Ciphertext: c.Ciphertext,
		}
	}

	return &model.ScreenplayContentResponse{
		ScreenplayID:      pgtypeToUUID(c.ScreenplayID),
		Content:           content,
		Revision:          c.Revision,
		IsEncrypted:       c.IsEncrypted,
		EncryptionVersion: int(c.EncryptionVersion),
		Algorithm:         c.Algorithm,
		IV:                c.Iv,
		Ciphertext:        c.Ciphertext,
		UpdatedAt:         pgtypeToTime(c.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) SaveContentWithRevision(ctx context.Context, screenplayID uuid.UUID, content string, revision int64) (*model.ScreenplayContentResponse, error) {
	c, err := r.queries.UpdateScreenplayContentWithRevision(ctx, generated.UpdateScreenplayContentWithRevisionParams{
		ScreenplayID: uuidToPgtype(screenplayID),
		Revision:     revision,
		Content:      content,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrRevisionConflict
		}
		return nil, err
	}

	return &model.ScreenplayContentResponse{
		ScreenplayID:      pgtypeToUUID(c.ScreenplayID),
		Content:           c.Content,
		Revision:          c.Revision,
		IsEncrypted:       c.IsEncrypted,
		EncryptionVersion: int(c.EncryptionVersion),
		Algorithm:         c.Algorithm,
		IV:                c.Iv,
		Ciphertext:        c.Ciphertext,
		UpdatedAt:         pgtypeToTime(c.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) SaveEncryptedContentWithRevision(ctx context.Context, screenplayID uuid.UUID, payload model.EncryptedPayload, revision int64) (*model.ScreenplayContentResponse, error) {
	c, err := r.queries.UpdateEncryptedScreenplayContentWithRevision(ctx, generated.UpdateEncryptedScreenplayContentWithRevisionParams{
		ScreenplayID:      uuidToPgtype(screenplayID),
		Revision:          revision,
		EncryptionVersion: int32(payload.Version),
		Algorithm:         payload.Algorithm,
		Iv:                payload.IV,
		Ciphertext:        payload.Ciphertext,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrRevisionConflict
		}
		return nil, err
	}

	return &model.ScreenplayContentResponse{
		ScreenplayID:      pgtypeToUUID(c.ScreenplayID),
		Content:           &payload,
		Revision:          c.Revision,
		IsEncrypted:       true,
		EncryptionVersion: payload.Version,
		Algorithm:         payload.Algorithm,
		IV:                payload.IV,
		Ciphertext:        payload.Ciphertext,
		UpdatedAt:         pgtypeToTime(c.UpdatedAt),
	}, nil
}

// Versions & Restore

func (r *screenplayRepository) GetLatestVersionNumber(ctx context.Context, screenplayID uuid.UUID) (int, error) {
	num, err := r.queries.GetLatestVersionNumber(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		return 0, err
	}
	return int(num), nil
}

func (r *screenplayRepository) CreateVersion(
	ctx context.Context,
	screenplayID uuid.UUID,
	title, content string,
	encPayload *model.EncryptedPayload,
	createdBy *uuid.UUID,
) (*model.ScreenplayVersionResponse, error) {
	latestNum, err := r.GetLatestVersionNumber(ctx, screenplayID)
	if err != nil {
		return nil, err
	}

	newVersionNumber := int32(latestNum + 1)
	if title == "" {
		title = fmt.Sprintf("Version %d", newVersionNumber)
	}

	params := generated.CreateScreenplayVersionParams{
		ScreenplayID:      uuidToPgtype(screenplayID),
		VersionNumber:     newVersionNumber,
		Title:             title,
		Content:           content,
		IsEncrypted:       false,
		EncryptionVersion: 1,
		Algorithm:         "AES-GCM",
		Iv:                "",
		Ciphertext:        "",
	}
	if createdBy != nil {
		params.CreatedBy = uuidToPgtype(*createdBy)
	}

	if encPayload != nil {
		params.IsEncrypted = true
		params.EncryptionVersion = int32(encPayload.Version)
		params.Algorithm = encPayload.Algorithm
		params.Iv = encPayload.IV
		params.Ciphertext = encPayload.Ciphertext
		params.Content = ""
	}

	v, err := r.queries.CreateScreenplayVersion(ctx, params)
	if err != nil {
		return nil, err
	}

	resp := toCreateVersionResponse(v)
	return &resp, nil
}

func (r *screenplayRepository) ListVersions(ctx context.Context, screenplayID uuid.UUID) ([]model.ScreenplayVersionResponse, error) {
	versions, err := r.queries.ListScreenplayVersionsByScreenplayID(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		return nil, err
	}

	res := make([]model.ScreenplayVersionResponse, 0, len(versions))
	for _, v := range versions {
		res = append(res, toListVersionResponse(v))
	}
	return res, nil
}

func (r *screenplayRepository) GetVersionByID(ctx context.Context, versionID uuid.UUID) (*model.ScreenplayVersionResponse, error) {
	v, err := r.queries.GetScreenplayVersionByID(ctx, uuidToPgtype(versionID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	resp := toGetVersionResponse(v)
	return &resp, nil
}

func (r *screenplayRepository) RestoreVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start tx: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := r.queries.WithTx(tx)

	// 1. Read Target Version
	v, err := qtx.GetScreenplayVersionByID(ctx, uuidToPgtype(versionID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	if pgtypeToUUID(v.ScreenplayID) != screenplayID {
		return nil, model.ErrNotFound
	}

	// 2. Force Update Screenplay Content
	updatedContent, err := qtx.ForceSetScreenplayContent(ctx, generated.ForceSetScreenplayContentParams{
		ScreenplayID:      uuidToPgtype(screenplayID),
		Content:           v.Content,
		IsEncrypted:       v.IsEncrypted,
		EncryptionVersion: v.EncryptionVersion,
		Algorithm:         v.Algorithm,
		Iv:                v.Iv,
		Ciphertext:        v.Ciphertext,
	})
	if err != nil {
		return nil, err
	}

	// 3. Create a new Version checkpoint marking the restore
	latestNum, err := qtx.GetLatestVersionNumber(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		return nil, err
	}

	newVersionNum := latestNum + 1
	restoreTitle := fmt.Sprintf("Restored from Version %d (%s)", v.VersionNumber, v.Title)

	restoreVer, err := qtx.CreateScreenplayVersion(ctx, generated.CreateScreenplayVersionParams{
		ScreenplayID:      uuidToPgtype(screenplayID),
		VersionNumber:     newVersionNum,
		Title:             restoreTitle,
		Content:           v.Content,
		CreatedBy:         uuidToPgtype(userID),
		IsEncrypted:       v.IsEncrypted,
		EncryptionVersion: v.EncryptionVersion,
		Algorithm:         v.Algorithm,
		Iv:                v.Iv,
		Ciphertext:        v.Ciphertext,
	})
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit tx: %w", err)
	}

	var content interface{} = updatedContent.Content
	if updatedContent.IsEncrypted {
		content = &model.EncryptedPayload{
			Version:    int(updatedContent.EncryptionVersion),
			Algorithm:  updatedContent.Algorithm,
			IV:         updatedContent.Iv,
			Ciphertext: updatedContent.Ciphertext,
		}
	}

	return &model.RestoreVersionResponse{
		ScreenplayID:   screenplayID,
		RestoredFromID: versionID,
		NewRevision:    updatedContent.Revision,
		Content:        content,
		IsEncrypted:    updatedContent.IsEncrypted,
		RestoreVersion: toCreateVersionResponse(restoreVer),
	}, nil
}
