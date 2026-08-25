package service

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"backend/internal/model"
	"backend/internal/repository"
)

type ScreenplayService interface {
	CreateScreenplay(ctx context.Context, projectID, userID uuid.UUID, req model.CreateScreenplayRequest) (*model.ScreenplayDetailResponse, error)
	GetScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error)
	ListScreenplays(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error)
	UpdateScreenplay(ctx context.Context, screenplayID, userID uuid.UUID, req model.UpdateScreenplayRequest) (*model.ScreenplayResponse, error)
	DeleteScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) error

	GetContent(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayContentResponse, error)
	SaveContent(ctx context.Context, screenplayID, userID uuid.UUID, req model.SaveContentRequest) (*model.ScreenplayContentResponse, error)

	CreateVersion(ctx context.Context, screenplayID, userID uuid.UUID, req model.CreateVersionRequest) (*model.ScreenplayVersionResponse, error)
	ListVersions(ctx context.Context, screenplayID, userID uuid.UUID) ([]model.ScreenplayVersionResponse, error)
	GetVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.ScreenplayVersionResponse, error)
	RestoreVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error)
}

type screenplayService struct {
	screenplayRepo repository.ScreenplayRepository
	projectRepo    repository.ProjectRepository
}

func NewScreenplayService(
	screenplayRepo repository.ScreenplayRepository,
	projectRepo repository.ProjectRepository,
) ScreenplayService {
	return &screenplayService{
		screenplayRepo: screenplayRepo,
		projectRepo:    projectRepo,
	}
}

func (s *screenplayService) CreateScreenplay(ctx context.Context, projectID, userID uuid.UUID, req model.CreateScreenplayRequest) (*model.ScreenplayDetailResponse, error) {
	// Verify project ownership
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, model.ErrBadRequest
	}

	initialContent := `<h2 data-type="scene-heading">1. INT. OPENING SCENE - DAY</h2><p data-type="action">Write your opening action here...</p>`
	return s.screenplayRepo.CreateScreenplay(ctx, projectID, title, req.Description, initialContent)
}

func (s *screenplayService) GetScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error) {
	// Verify ownership
	row, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	content, err := s.screenplayRepo.GetContent(ctx, screenplayID)
	if err != nil {
		return nil, err
	}

	return &model.ScreenplayDetailResponse{
		ScreenplayResponse: model.ScreenplayResponse{
			ID:          screenplayID,
			ProjectID:   uuid.UUID(row.ProjectID.Bytes),
			Title:       row.Title,
			Description: row.Description,
			CreatedAt:   row.CreatedAt.Time,
			UpdatedAt:   row.UpdatedAt.Time,
		},
		Content:  content.Content,
		Revision: content.Revision,
	}, nil
}

func (s *screenplayService) ListScreenplays(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error) {
	// Verify project ownership
	_, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	return s.screenplayRepo.ListScreenplaysByProject(ctx, projectID, userID)
}

func (s *screenplayService) UpdateScreenplay(ctx context.Context, screenplayID, userID uuid.UUID, req model.UpdateScreenplayRequest) (*model.ScreenplayResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	return s.screenplayRepo.UpdateScreenplay(ctx, screenplayID, req.Title, req.Description)
}

func (s *screenplayService) DeleteScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) error {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return err
	}

	return s.screenplayRepo.DeleteScreenplay(ctx, screenplayID)
}

func (s *screenplayService) GetContent(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayContentResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	return s.screenplayRepo.GetContent(ctx, screenplayID)
}

func (s *screenplayService) SaveContent(ctx context.Context, screenplayID, userID uuid.UUID, req model.SaveContentRequest) (*model.ScreenplayContentResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	if req.Revision <= 0 {
		return nil, model.ErrBadRequest
	}

	// Update with optimistic concurrency check
	return s.screenplayRepo.SaveContentWithRevision(ctx, screenplayID, req.Content, req.Revision)
}

func (s *screenplayService) CreateVersion(ctx context.Context, screenplayID, userID uuid.UUID, req model.CreateVersionRequest) (*model.ScreenplayVersionResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	content := ""
	if req.Content != nil {
		content = *req.Content
	} else {
		currContent, err := s.screenplayRepo.GetContent(ctx, screenplayID)
		if err != nil {
			return nil, err
		}
		content = currContent.Content
	}

	return s.screenplayRepo.CreateVersion(ctx, screenplayID, req.Title, content, userID)
}

func (s *screenplayService) ListVersions(ctx context.Context, screenplayID, userID uuid.UUID) ([]model.ScreenplayVersionResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	return s.screenplayRepo.ListVersions(ctx, screenplayID)
}

func (s *screenplayService) GetVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.ScreenplayVersionResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	v, err := s.screenplayRepo.GetVersionByID(ctx, versionID)
	if err != nil {
		return nil, err
	}

	if v.ScreenplayID != screenplayID {
		return nil, model.ErrNotFound
	}

	return v, nil
}

func (s *screenplayService) RestoreVersion(ctx context.Context, screenplayID, versionID, userID uuid.UUID) (*model.RestoreVersionResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	return s.screenplayRepo.RestoreVersion(ctx, screenplayID, versionID, userID)
}
