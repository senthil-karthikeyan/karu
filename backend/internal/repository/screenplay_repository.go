package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
	"backend/sqlc/generated"
)

type ScreenplayRepository interface {
	CreateScreenplay(ctx context.Context, projectID uuid.UUID, title, description, initialContent string) (*model.ScreenplayDetailResponse, error)
	GetScreenplay(ctx context.Context, id uuid.UUID) (*generated.Screenplay, error)
	GetScreenplayWithOwnership(ctx context.Context, id, userID uuid.UUID) (*generated.GetScreenplayByIDAndUserIDRow, error)
	ListScreenplaysByProject(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error)
	UpdateScreenplay(ctx context.Context, id uuid.UUID, title, description *string) (*model.ScreenplayResponse, error)
	DeleteScreenplay(ctx context.Context, id uuid.UUID) error

	GetContent(ctx context.Context, screenplayID uuid.UUID) (*model.ScreenplayContentResponse, error)
	SaveContentWithRevision(ctx context.Context, screenplayID uuid.UUID, content string, revision int64) (*model.ScreenplayContentResponse, error)

	CreateVersion(ctx context.Context, screenplayID uuid.UUID, title, content string, createdBy uuid.UUID) (*model.ScreenplayVersionResponse, error)
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

func toScreenplayResponse(s generated.Screenplay) model.ScreenplayResponse {
	return model.ScreenplayResponse{
		ID:          pgtypeToUUID(s.ID),
		ProjectID:   pgtypeToUUID(s.ProjectID),
		Title:       s.Title,
		Description: s.Description,
		CreatedAt:   pgtypeToTime(s.CreatedAt),
		UpdatedAt:   pgtypeToTime(s.UpdatedAt),
	}
}

func toVersionResponse(v generated.ScreenplayVersion) model.ScreenplayVersionResponse {
	var createdBy *uuid.UUID
	if v.CreatedBy.Valid {
		id := uuid.UUID(v.CreatedBy.Bytes)
		createdBy = &id
	}

	return model.ScreenplayVersionResponse{
		ID:            pgtypeToUUID(v.ID),
		ScreenplayID:  pgtypeToUUID(v.ScreenplayID),
		VersionNumber: int(v.VersionNumber),
		Title:         v.Title,
		Content:       v.Content,
		CreatedBy:     createdBy,
		CreatedAt:     pgtypeToTime(v.CreatedAt),
	}
}

func (r *screenplayRepository) CreateScreenplay(ctx context.Context, projectID uuid.UUID, title, description, initialContent string) (*model.ScreenplayDetailResponse, error) {
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
	})
	if err != nil {
		return nil, err
	}

	// 2. Insert Screenplay Content
	content, err := qtx.CreateScreenplayContent(ctx, generated.CreateScreenplayContentParams{
		ScreenplayID: screenplay.ID,
		Content:      initialContent,
		Revision:     1,
	})
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit tx: %w", err)
	}

	return &model.ScreenplayDetailResponse{
		ScreenplayResponse: toScreenplayResponse(screenplay),
		Content:            content.Content,
		Revision:           content.Revision,
	}, nil
}

func (r *screenplayRepository) GetScreenplay(ctx context.Context, id uuid.UUID) (*generated.Screenplay, error) {
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
		res = append(res, model.ScreenplayResponse{
			ID:          pgtypeToUUID(row.ID),
			ProjectID:   pgtypeToUUID(row.ProjectID),
			Title:       row.Title,
			Description: row.Description,
			CreatedAt:   pgtypeToTime(row.CreatedAt),
			UpdatedAt:   pgtypeToTime(row.UpdatedAt),
		})
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

	resp := toScreenplayResponse(s)
	return &resp, nil
}

func (r *screenplayRepository) DeleteScreenplay(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteScreenplay(ctx, uuidToPgtype(id))
}

func (r *screenplayRepository) GetContent(ctx context.Context, screenplayID uuid.UUID) (*model.ScreenplayContentResponse, error) {
	c, err := r.queries.GetScreenplayContent(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	return &model.ScreenplayContentResponse{
		ScreenplayID: pgtypeToUUID(c.ScreenplayID),
		Content:      c.Content,
		Revision:     c.Revision,
		UpdatedAt:    pgtypeToTime(c.UpdatedAt),
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
		ScreenplayID: pgtypeToUUID(c.ScreenplayID),
		Content:      c.Content,
		Revision:     c.Revision,
		UpdatedAt:    pgtypeToTime(c.UpdatedAt),
	}, nil
}

func (r *screenplayRepository) GetLatestVersionNumber(ctx context.Context, screenplayID uuid.UUID) (int, error) {
	num, err := r.queries.GetLatestVersionNumber(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		return 0, err
	}
	return int(num), nil
}

func (r *screenplayRepository) CreateVersion(ctx context.Context, screenplayID uuid.UUID, title, content string, createdBy uuid.UUID) (*model.ScreenplayVersionResponse, error) {
	latestNum, err := r.GetLatestVersionNumber(ctx, screenplayID)
	if err != nil {
		return nil, err
	}

	newVersionNumber := int32(latestNum + 1)
	if title == "" {
		title = fmt.Sprintf("Version %d", newVersionNumber)
	}

	v, err := r.queries.CreateScreenplayVersion(ctx, generated.CreateScreenplayVersionParams{
		ScreenplayID:  uuidToPgtype(screenplayID),
		VersionNumber: newVersionNumber,
		Title:         title,
		Content:       content,
		CreatedBy:     uuidToPgtype(createdBy),
	})
	if err != nil {
		return nil, err
	}

	resp := toVersionResponse(v)
	return &resp, nil
}

func (r *screenplayRepository) ListVersions(ctx context.Context, screenplayID uuid.UUID) ([]model.ScreenplayVersionResponse, error) {
	versions, err := r.queries.ListScreenplayVersionsByScreenplayID(ctx, uuidToPgtype(screenplayID))
	if err != nil {
		return nil, err
	}

	res := make([]model.ScreenplayVersionResponse, 0, len(versions))
	for _, v := range versions {
		res = append(res, toVersionResponse(v))
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
	resp := toVersionResponse(v)
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
		ScreenplayID: uuidToPgtype(screenplayID),
		Content:      v.Content,
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
		ScreenplayID:  uuidToPgtype(screenplayID),
		VersionNumber: newVersionNum,
		Title:         restoreTitle,
		Content:       v.Content,
		CreatedBy:     uuidToPgtype(userID),
	})
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit tx: %w", err)
	}

	return &model.RestoreVersionResponse{
		ScreenplayID:   screenplayID,
		RestoredFromID: versionID,
		NewRevision:    updatedContent.Revision,
		Content:        updatedContent.Content,
		RestoreVersion: toVersionResponse(restoreVer),
	}, nil
}
