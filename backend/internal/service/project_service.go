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
}

type projectService struct {
	projectRepo  repository.ProjectRepository
	sceneRepo    repository.SceneRepository
	activityRepo repository.ActivityRepository
}

func NewProjectService(
	projectRepo repository.ProjectRepository,
	sceneRepo repository.SceneRepository,
	activityRepo repository.ActivityRepository,
) ProjectService {
	return &projectService{
		projectRepo:  projectRepo,
		sceneRepo:    sceneRepo,
		activityRepo: activityRepo,
	}
}

func calculateStats(content string, sceneCount int) (pageCount int32, wordCount int32) {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return 0, 0
	}

	words := strings.Fields(trimmed)
	wCount := int32(len(words))

	// Approximate screenplay pages: ~250 words per page
	pCount := int32((len(words) / 250) + 1)
	if pCount == 0 && len(words) > 0 {
		pCount = 1
	}

	return pCount, wCount
}

func (s *projectService) CreateProject(ctx context.Context, userID uuid.UUID, req model.CreateProjectRequest) (*model.ProjectResponse, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, model.ErrBadRequest
	}

	project, err := s.projectRepo.Create(ctx, userID, req)
	if err != nil {
		return nil, err
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
		ScreenplayContent: p.ScreenplayContent,
		Scenes:            scenes,
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

	// If metadata changed, update metadata
	if req.Title != nil || req.Logline != nil || req.Genre != nil || req.Format != nil || req.Status != nil || req.Synopsis != nil || req.CoverImage != nil {
		updatedProject, err = s.projectRepo.Update(ctx, id, userID, req)
		if err != nil {
			return nil, err
		}
	}

	// If content changed, calculate stats and update content
	if req.ScreenplayContent != nil || req.LastEditedScene != nil {
		content := existing.ScreenplayContent
		if req.ScreenplayContent != nil {
			content = *req.ScreenplayContent
		}

		lastEdited := existing.LastEditedScene
		if req.LastEditedScene != nil {
			lastEdited = *req.LastEditedScene
		}

		pageCount, wordCount := calculateStats(content, int(existing.SceneCount))
		updatedProject, err = s.projectRepo.UpdateContent(ctx, id, userID, content, pageCount, wordCount, existing.SceneCount, lastEdited)
		if err != nil {
			return nil, err
		}

		_, _ = s.activityRepo.Create(ctx, id, userID, "edited", "Screenplay Edited", "Updated screenplay content", map[string]interface{}{
			"wordCount":  wordCount,
			"pageCount":  pageCount,
			"sceneCount": existing.SceneCount,
		})
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
	proj, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	scene, err := s.sceneRepo.Create(ctx, projectID, req)
	if err != nil {
		return nil, err
	}

	// Update project scene count
	newSceneCount := proj.SceneCount + 1
	_, _ = s.projectRepo.UpdateContent(ctx, projectID, userID, proj.ScreenplayContent, proj.PageCount, proj.WordCount, newSceneCount, req.Slugline)

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
	proj, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return err
	}

	if err := s.sceneRepo.Delete(ctx, sceneID); err != nil {
		return err
	}

	newSceneCount := proj.SceneCount - 1
	if newSceneCount < 0 {
		newSceneCount = 0
	}
	_, _ = s.projectRepo.UpdateContent(ctx, projectID, userID, proj.ScreenplayContent, proj.PageCount, proj.WordCount, newSceneCount, proj.LastEditedScene)

	return nil
}

func (s *projectService) ListActivities(ctx context.Context, projectID, userID uuid.UUID) ([]model.ActivityItem, error) {
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}
	return s.activityRepo.ListByProjectID(ctx, projectID)
}
