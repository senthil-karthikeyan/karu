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

type ProjectRepository interface {
	Create(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*generated.Project, error)
	GetByIDAndUserID(ctx context.Context, id, userID uuid.UUID) (*generated.Project, error)
	ListByUserID(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error)
	Update(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

type projectRepository struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

func NewProjectRepository(pool *pgxpool.Pool) ProjectRepository {
	return &projectRepository{
		queries: generated.New(pool),
		pool:    pool,
	}
}

func toProjectResponse(p generated.Project) model.ProjectResponse {
	return model.ProjectResponse{
		ID:              pgtypeToUUID(p.ID),
		UserID:          pgtypeToUUID(p.UserID),
		Title:           p.Title,
		Logline:         p.Logline,
		Genre:           p.Genre,
		Format:          p.Format,
		Status:          p.Status,
		Synopsis:        p.Synopsis,
		CoverImage:      p.CoverImage,
		LastEditedScene: p.LastEditedScene,
		Stats: model.ProjectStats{
			PageCount:  int(p.PageCount),
			WordCount:  int(p.WordCount),
			SceneCount: int(p.SceneCount),
		},
		CreatedAt: pgtypeToTime(p.CreatedAt),
		UpdatedAt: pgtypeToTime(p.UpdatedAt),
	}
}

func (r *projectRepository) Create(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error) {
	genre := req.Genre
	if genre == "" {
		genre = "Drama"
	}
	format := req.Format
	if format == "" {
		format = "Feature Film"
	}
	status := req.Status
	if status == "" {
		status = "Draft"
	}

	p, err := r.queries.CreateProject(ctx, generated.CreateProjectParams{
		UserID:          uuidToPgtype(userID),
		Title:           req.Title,
		Logline:         req.Logline,
		Genre:           genre,
		Format:          format,
		Status:          status,
		Synopsis:        req.Synopsis,
		CoverImage:      req.CoverImage,
		PageCount:       0,
		WordCount:       0,
		SceneCount:      0,
		LastEditedScene: "",
	})
	if err != nil {
		return nil, err
	}

	resp := toProjectResponse(p)
	return &resp, nil
}

func (r *projectRepository) GetByID(ctx context.Context, id uuid.UUID) (*generated.Project, error) {
	p, err := r.queries.GetProjectByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *projectRepository) GetByIDAndUserID(ctx context.Context, id, userID uuid.UUID) (*generated.Project, error) {
	p, err := r.queries.GetProjectByIDAndUserID(ctx, generated.GetProjectByIDAndUserIDParams{
		ID:     uuidToPgtype(id),
		UserID: uuidToPgtype(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *projectRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error) {
	projects, err := r.queries.ListProjectsByUserID(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}

	res := make([]model.ProjectResponse, 0, len(projects))
	for _, p := range projects {
		res = append(res, toProjectResponse(p))
	}
	return res, nil
}

func (r *projectRepository) Update(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error) {
	var title, logline, genre, format, status, synopsis, coverImage, lastEditedScene string
	if req.Title != nil {
		title = *req.Title
	}
	if req.Logline != nil {
		logline = *req.Logline
	}
	if req.Genre != nil {
		genre = *req.Genre
	}
	if req.Format != nil {
		format = *req.Format
	}
	if req.Status != nil {
		status = *req.Status
	}
	if req.Synopsis != nil {
		synopsis = *req.Synopsis
	}
	if req.CoverImage != nil {
		coverImage = *req.CoverImage
	}
	if req.LastEditedScene != nil {
		lastEditedScene = *req.LastEditedScene
	}

	p, err := r.queries.UpdateProject(ctx, generated.UpdateProjectParams{
		ID:              uuidToPgtype(id),
		UserID:          uuidToPgtype(userID),
		Column3:         title,
		Logline:         logline,
		Column5:         genre,
		Column6:         format,
		Column7:         status,
		Synopsis:        synopsis,
		CoverImage:      coverImage,
		LastEditedScene: lastEditedScene,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	resp := toProjectResponse(p)
	return &resp, nil
}

func (r *projectRepository) Delete(ctx context.Context, id, userID uuid.UUID) error {
	err := r.queries.DeleteProject(ctx, generated.DeleteProjectParams{
		ID:     uuidToPgtype(id),
		UserID: uuidToPgtype(userID),
	})
	if err != nil {
		return err
	}
	return nil
}
