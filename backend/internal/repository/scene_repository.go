package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
)

// SceneRepository defines the interface for scene access.
// Deprecated: Scenes are canonically stored and derived dynamically within the TipTap JSON document.
type SceneRepository interface {
	Create(ctx context.Context, projectID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.SceneItem, error)
	ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]model.SceneItem, error)
	Update(ctx context.Context, id uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error)
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByProjectID(ctx context.Context, projectID uuid.UUID) error
}

type sceneRepository struct{}

func NewSceneRepository(_ *pgxpool.Pool) SceneRepository {
	return &sceneRepository{}
}

func (r *sceneRepository) Create(ctx context.Context, projectID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error) {
	return &model.SceneItem{
		ID:         uuid.New(),
		ProjectID:  projectID,
		Number:     req.Number,
		Slugline:   req.Slugline,
		Location:   req.Location,
		Time:       req.Time,
		Summary:    req.Summary,
		PageNumber: req.PageNumber,
	}, nil
}

func (r *sceneRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.SceneItem, error) {
	return nil, model.ErrNotFound
}

func (r *sceneRepository) ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]model.SceneItem, error) {
	return []model.SceneItem{}, nil
}

func (r *sceneRepository) Update(ctx context.Context, id uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error) {
	return nil, model.ErrNotFound
}

func (r *sceneRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (r *sceneRepository) DeleteByProjectID(ctx context.Context, projectID uuid.UUID) error {
	return nil
}
