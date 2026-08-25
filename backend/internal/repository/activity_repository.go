package repository

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
	"backend/sqlc/generated"
)

type ActivityRepository interface {
	Create(ctx context.Context, projectID, userID uuid.UUID, actType, title, description string, metadata map[string]interface{}) (*model.ActivityItem, error)
	ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]model.ActivityItem, error)
}

type activityRepository struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

func NewActivityRepository(pool *pgxpool.Pool) ActivityRepository {
	return &activityRepository{
		queries: generated.New(pool),
		pool:    pool,
	}
}

func toActivityItem(a generated.Activity) model.ActivityItem {
	var meta map[string]interface{}
	if len(a.Metadata) > 0 {
		_ = json.Unmarshal(a.Metadata, &meta)
	}

	return model.ActivityItem{
		ID:          pgtypeToUUID(a.ID),
		ProjectID:   pgtypeToUUID(a.ProjectID),
		UserID:      pgtypeToUUID(a.UserID),
		Type:        a.Type,
		Title:       a.Title,
		Description: a.Description,
		Metadata:    meta,
		Timestamp:   pgtypeToTime(a.CreatedAt),
	}
}

func (r *activityRepository) Create(ctx context.Context, projectID, userID uuid.UUID, actType, title, description string, metadata map[string]interface{}) (*model.ActivityItem, error) {
	metaBytes, err := json.Marshal(metadata)
	if err != nil {
		metaBytes = []byte("{}")
	}

	a, err := r.queries.CreateActivity(ctx, generated.CreateActivityParams{
		ProjectID:   uuidToPgtype(projectID),
		UserID:      uuidToPgtype(userID),
		Type:        actType,
		Title:       title,
		Description: description,
		Metadata:    metaBytes,
	})
	if err != nil {
		return nil, err
	}

	item := toActivityItem(a)
	return &item, nil
}

func (r *activityRepository) ListByProjectID(ctx context.Context, projectID uuid.UUID) ([]model.ActivityItem, error) {
	activities, err := r.queries.ListActivitiesByProjectID(ctx, uuidToPgtype(projectID))
	if err != nil {
		return nil, err
	}

	res := make([]model.ActivityItem, 0, len(activities))
	for _, a := range activities {
		res = append(res, toActivityItem(a))
	}
	return res, nil
}
