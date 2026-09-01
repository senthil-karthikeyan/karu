package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"backend/internal/model"
	"backend/internal/repository"
)

type ProjectService interface {
	CreateProject(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error)
	GetProject(ctx context.Context, id, userID uuid.UUID) (*model.ProjectDetailResponse, error)
	ListProjects(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error)
	UpdateProject(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error)
	DeleteProject(ctx context.Context, id, userID uuid.UUID) error

	CreateScene(ctx context.Context, projectID, userID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error)
	ListScenes(ctx context.Context, projectID, userID uuid.UUID) ([]model.SceneItem, error)
	UpdateScene(ctx context.Context, projectID, sceneID, userID uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error)
	DeleteScene(ctx context.Context, projectID, sceneID, userID uuid.UUID) error

	ListActivities(ctx context.Context, projectID, userID uuid.UUID) ([]model.ActivityItem, error)

	// Project Encryption Keys (PEK)
	GetProjectKey(ctx context.Context, projectID, userID uuid.UUID) (*model.ProjectKeyResponse, error)
	SetProjectKey(ctx context.Context, projectID, userID uuid.UUID, req model.WrappedKeyPayload) (*model.ProjectKeyResponse, error)
}

type projectService struct {
	projectRepo    repository.ProjectRepository
	sceneRepo      repository.SceneRepository
	activityRepo   repository.ActivityRepository
	screenplayRepo repository.ScreenplayRepository
}

func NewProjectService(
	projectRepo repository.ProjectRepository,
	sceneRepo repository.SceneRepository,
	activityRepo repository.ActivityRepository,
	screenplayRepo repository.ScreenplayRepository,
) ProjectService {
	return &projectService{
		projectRepo:    projectRepo,
		sceneRepo:      sceneRepo,
		activityRepo:   activityRepo,
		screenplayRepo: screenplayRepo,
	}
}

func (s *projectService) CreateProject(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, model.ErrBadRequest
	}

	project, err := s.projectRepo.Create(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	// Create canonical default screenplay
	if s.screenplayRepo != nil {
		_, _ = s.screenplayRepo.CreateScreenplay(ctx, project.ID, "Draft 1", "Default screenplay", "", nil, nil, userID)
	}

	// Create initial activity log
	_, _ = s.activityRepo.Create(ctx, project.ID, userID, "created", "Project Created", "Created "+project.Title, map[string]interface{}{
		"format": project.Format,
		"genre":  project.Genre,
	})

	return project, nil
}

func (s *projectService) GetProject(ctx context.Context, id, userID uuid.UUID) (*model.ProjectDetailResponse, error) {
	p, err := s.projectRepo.GetByIDAndUserID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	scenes, err := s.sceneRepo.ListByProjectID(ctx, id)
	if err != nil {
		return nil, err
	}

	return &model.ProjectDetailResponse{
		ProjectResponse: model.ProjectResponse{
			ID:              id,
			UserID:          userID,
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
			CreatedAt: p.CreatedAt.Time,
			UpdatedAt: p.UpdatedAt.Time,
		},
		Scenes: scenes,
	}, nil
}

func (s *projectService) ListProjects(ctx context.Context, userID uuid.UUID) ([]model.ProjectResponse, error) {
	return s.projectRepo.ListByUserID(ctx, userID)
}

func (s *projectService) UpdateProject(ctx context.Context, id, userID uuid.UUID, req model.UpdateProjectRequest) (*model.ProjectResponse, error) {
	// First verify ownership
	existing, err := s.projectRepo.GetByIDAndUserID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	var updatedProject *model.ProjectResponse

	// If metadata or last edited scene changed, update metadata
	if req.Title != nil || req.Logline != nil || req.Genre != nil || req.Format != nil || req.Status != nil || req.Synopsis != nil || req.CoverImage != nil || req.LastEditedScene != nil {
		updatedProject, err = s.projectRepo.Update(ctx, id, userID, req)
		if err != nil {
			return nil, err
		}

		_, _ = s.activityRepo.Create(ctx, id, userID, "updated", "Project Updated", "Updated project metadata", nil)
	}

	if updatedProject == nil {
		resp := model.ProjectResponse{
			ID:              id,
			UserID:          userID,
			Title:           existing.Title,
			Logline:         existing.Logline,
			Genre:           existing.Genre,
			Format:          existing.Format,
			Status:          existing.Status,
			Synopsis:        existing.Synopsis,
			CoverImage:      existing.CoverImage,
			LastEditedScene: existing.LastEditedScene,
			Stats: model.ProjectStats{
				PageCount:  int(existing.PageCount),
				WordCount:  int(existing.WordCount),
				SceneCount: int(existing.SceneCount),
			},
			CreatedAt: existing.CreatedAt.Time,
			UpdatedAt: existing.UpdatedAt.Time,
		}
		return &resp, nil
	}

	return updatedProject, nil
}

func (s *projectService) DeleteProject(ctx context.Context, id, userID uuid.UUID) error {
	// Verify ownership first
	_, err := s.projectRepo.GetByIDAndUserID(ctx, id, userID)
	if err != nil {
		return err
	}
	return s.projectRepo.Delete(ctx, id, userID)
}

func (s *projectService) CreateScene(ctx context.Context, projectID, userID uuid.UUID, req model.CreateSceneRequest) (*model.SceneItem, error) {
	// Verify project ownership
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	scene, err := s.sceneRepo.Create(ctx, projectID, req)
	if err != nil {
		return nil, err
	}

	// Update last edited scene
	_, _ = s.projectRepo.Update(ctx, projectID, userID, model.UpdateProjectRequest{
		LastEditedScene: &req.Slugline,
	})

	// Record activity
	_, _ = s.activityRepo.Create(ctx, projectID, userID, "edited", "Scene Added", "Added scene "+req.Slugline, map[string]interface{}{
		"sceneNumber": req.Number,
	})

	return scene, nil
}

func (s *projectService) ListScenes(ctx context.Context, projectID, userID uuid.UUID) ([]model.SceneItem, error) {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}
	return s.sceneRepo.ListByProjectID(ctx, projectID)
}

func (s *projectService) UpdateScene(ctx context.Context, projectID, sceneID, userID uuid.UUID, req model.UpdateSceneRequest) (*model.SceneItem, error) {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}
	return s.sceneRepo.Update(ctx, sceneID, req)
}

func (s *projectService) DeleteScene(ctx context.Context, projectID, sceneID, userID uuid.UUID) error {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return err
	}

	if err := s.sceneRepo.Delete(ctx, sceneID); err != nil {
		return err
	}

	return nil
}

func (s *projectService) ListActivities(ctx context.Context, projectID, userID uuid.UUID) ([]model.ActivityItem, error) {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}
	return s.activityRepo.ListByProjectID(ctx, projectID)
}

func (s *projectService) GetProjectKey(ctx context.Context, projectID, userID uuid.UUID) (*model.ProjectKeyResponse, error) {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	key, err := s.projectRepo.GetProjectKey(ctx, projectID, userID)
	if err == nil && key != nil {
		return key, nil
	}

	// Fallback to default screenplay key if project key is missing
	if s.screenplayRepo != nil {
		sp, err := s.screenplayRepo.GetDefaultScreenplayByProject(ctx, projectID, userID)
		if err == nil && sp != nil {
			spKey, err := s.screenplayRepo.GetScreenplayKey(ctx, sp.ID, userID)
			if err == nil && spKey != nil {
				return &model.ProjectKeyResponse{
					ProjectID:  projectID,
					UserID:     userID,
					Version:    spKey.Version,
					Algorithm:  spKey.Algorithm,
					IV:         spKey.IV,
					WrappedKey: spKey.WrappedKey,
					CreatedAt:  spKey.CreatedAt,
					UpdatedAt:  spKey.UpdatedAt,
				}, nil
			}
		}
	}

	return nil, model.ErrNotFound
}

func (s *projectService) SetProjectKey(ctx context.Context, projectID, userID uuid.UUID, req model.WrappedKeyPayload) (*model.ProjectKeyResponse, error) {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	if err := model.ValidateWrappedKeyPayload(req); err != nil {
		return nil, err
	}

	algo := req.Algorithm
	if algo == "" {
		algo = model.ExpectedEncryptionAlgorithm
	}

	version := req.Version
	if version == 0 {
		version = model.ExpectedEncryptionVersion
	}

	resp, err := s.projectRepo.UpsertProjectKey(ctx, projectID, userID, req.WrappedKey, req.IV, algo, version)
	if err != nil {
		return nil, err
	}

	// Also sync to default screenplay key
	if s.screenplayRepo != nil {
		sp, err := s.screenplayRepo.GetDefaultScreenplayByProject(ctx, projectID, userID)
		if err == nil && sp != nil {
			_, _ = s.screenplayRepo.UpsertScreenplayKey(ctx, sp.ID, userID, req.WrappedKey, req.IV, algo, version)
		}
	}

	return resp, nil
}
