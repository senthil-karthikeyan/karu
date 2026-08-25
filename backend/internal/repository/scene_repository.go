package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
	"backend/sqlc/generated"
)

type SceneRepository interface {
	Create(ctx context.Context, projectID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.SceneItem, error)
	ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]model.SceneItem, error)
	Update(ctx context.Context, id uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error)
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByProjectID(ctx context.Context, projectID uuid.UUID) error
}

type sceneRepository struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

func NewSceneRepository(pool *pgxpool.Pool) SceneRepository {
	return &sceneRepository{
		queries: generated.New(pool),
		pool:    pool,
	}
}

func toSceneItem(s generated.Scene) model.SceneItem {
	return model.SceneItem{
		ID:         pgtypeToUUID(s.ID),
		ProjectID:  pgtypeToUUID(s.ProjectID),
		Number:     int(s.SceneNumber),
		Slugline:   s.Slugline,
		Location:   s.Location,
		Time:       s.TimeOfDay,
		Summary:    s.Summary,
		PageNumber: int(s.PageNumber),
		CreatedAt:  pgtypeToTime(s.CreatedAt),
		UpdatedAt:  pgtypeToTime(s.UpdatedAt),
	}
}

func (r *sceneRepository) Create(ctx context.Context, projectID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error) {
	pageNumber := int32(req.PageNumber)
	if pageNumber <= 0 {
		pageNumber = 1
	}
	timeOfDay := req.Time
	if timeOfDay == "" {
		timeOfDay = "DAY"
	}

	s, err := r.queries.CreateScene(ctx, generated.CreateSceneParams{
		ProjectID:   uuidToPgtype(projectID),
		SceneNumber: int32(req.Number),
		Slugline:    req.Slugline,
		Location:    req.Location,
		TimeOfDay:   timeOfDay,
		Summary:     req.Summary,
		PageNumber:  pageNumber,
	})
	if err != nil {
		return nil, err
	}

	item := toSceneItem(s)
	return &item, nil
}

func (r *sceneRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.SceneItem, error) {
	s, err := r.queries.GetSceneByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	item := toSceneItem(s)
	return &item, nil
}

func (r *sceneRepository) ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]model.SceneItem, error) {
	scenes, err := r.queries.ListScenesByProjectID(ctx, uuidToPgtype(projectID))
	if err != nil {
		return nil, err
	}

	res := make([]model.SceneItem, 0, len(scenes))
	for _, s := range scenes {
		res = append(res, toSceneItem(s))
	}
	return res, nil
}

func (r *sceneRepository) Update(ctx context.Context, id uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error) {
	var sceneNumber int32
	if req.Number != nil {
		sceneNumber = int32(*req.Number)
	}
	var slugline, location, timeOfDay, summary string
	if req.Slugline != nil {
		slugline = *req.Slugline
	}
	if req.Location != nil {
		location = *req.Location
	}
	if req.Time != nil {
		timeOfDay = *req.Time
	}
	if req.Summary != nil {
		summary = *req.Summary
	}
	var pageNumber int32
	if req.PageNumber != nil {
		pageNumber = int32(*req.PageNumber)
	}

	s, err := r.queries.UpdateScene(ctx, generated.UpdateSceneParams{
		ID:          uuidToPgtype(id),
		SceneNumber: sceneNumber,
		Column3:     slugline,
		Location:    location,
		Column5:     timeOfDay,
		Summary:     summary,
		PageNumber:  pageNumber,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	item := toSceneItem(s)
	return &item, nil
}

func (r *sceneRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.queries.DeleteScene(ctx, uuidToPgtype(id))
}

func (r *sceneRepository) DeleteByProjectID(ctx context.Context, projectID uuid.UUID) error {
	return r.queries.DeleteScenesByProjectID(ctx, uuidToPgtype(projectID))
}
