package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"backend/internal/model"
	"backend/internal/repository"
)

type ScreenplayService interface {
	CreateScreenplay(ctx context.Context, projectID, userID uuid.UUID, req model.CreateScreenplayRequest) (*model.ScreenplayDetailResponse, error)
	GetScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error)
	GetProjectDefaultScreenplay(ctx context.Context, projectID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error)
	ListScreenplays(ctx context.Context, projectID, userID uuid.UUID) ([]model.ScreenplayResponse, error)
	UpdateScreenplay(ctx context.Context, screenplayID, userID uuid.UUID, req model.UpdateScreenplayRequest) (*model.ScreenplayResponse, error)
	DeleteScreenplay(ctx context.Context, screenplayID, userID uuid.UUID) error

	GetContent(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayContentResponse, error)
	SaveContent(ctx context.Context, screenplayID, userID uuid.UUID, req model.SaveContentRequest) (*model.ScreenplayContentResponse, error)

	GetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayKeyResponse, error)
	SetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID, req model.WrappedKeyPayload) (*model.ScreenplayKeyResponse, error)

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

	if req.EncryptedPayload != nil {
		if err := model.ValidateEncryptedPayload(*req.EncryptedPayload); err != nil {
			return nil, fmt.Errorf("%w: %s", model.ErrInvalidEncryptedPayload, err.Error())
		}
	}
	if req.WrappedKey != nil {
		if err := model.ValidateWrappedKeyPayload(*req.WrappedKey); err != nil {
			return nil, fmt.Errorf("%w: %s", model.ErrInvalidWrappedKey, err.Error())
		}
	}

	initialContent := `<h2 data-type="scene-heading">1. INT. OPENING SCENE - DAY</h2><p data-type="action">Write your opening action here...</p>`
	return s.screenplayRepo.CreateScreenplay(ctx, projectID, title, req.Description, initialContent, req.EncryptedPayload, req.WrappedKey, userID)
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
		Content:           content.Content,
		Revision:          content.Revision,
		IsEncrypted:       content.IsEncrypted,
		EncryptionVersion: content.EncryptionVersion,
		Algorithm:         content.Algorithm,
		IV:                content.IV,
		Ciphertext:        content.Ciphertext,
	}, nil
}

func (s *screenplayService) GetProjectDefaultScreenplay(ctx context.Context, projectID, userID uuid.UUID) (*model.ScreenplayDetailResponse, error) {
	proj, err := s.projectRepo.GetByIDAndUserID(ctx, projectID, userID)
	if err != nil {
		return nil, err
	}

	screenplay, err := s.screenplayRepo.GetDefaultScreenplayByProject(ctx, projectID, userID)
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			// Auto-create default screenplay for this project
			initialContent := `<h2 data-type="scene-heading">1. INT. OPENING SCENE - DAY</h2><p data-type="action">Write your opening action here...</p>`
			created, err := s.screenplayRepo.CreateScreenplay(
				ctx,
				projectID,
				proj.Title,
				proj.Logline,
				initialContent,
				nil,
				nil,
				userID,
			)
			if err != nil {
				return nil, err
			}
			return created, nil
		}
		return nil, err
	}

	content, err := s.screenplayRepo.GetContent(ctx, screenplay.ID)
	if err != nil {
		return nil, err
	}

	return &model.ScreenplayDetailResponse{
		ScreenplayResponse: *screenplay,
		Content:            content.Content,
		Revision:           content.Revision,
		IsEncrypted:        content.IsEncrypted,
		EncryptionVersion:  content.EncryptionVersion,
		Algorithm:          content.Algorithm,
		IV:                 content.IV,
		Ciphertext:         content.Ciphertext,
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

	// 1. Check if explicitly provided as EncryptedContent
	if req.EncryptedContent != nil {
		if err := model.ValidateEncryptedPayload(*req.EncryptedContent); err != nil {
			return nil, fmt.Errorf("%w: %s", model.ErrInvalidEncryptedPayload, err.Error())
		}
		return s.screenplayRepo.SaveEncryptedContentWithRevision(ctx, screenplayID, *req.EncryptedContent, req.Revision)
	}

	// 2. Check if req.Content is provided
	if len(req.Content) > 0 {
		// Check if Content is an EncryptedPayload JSON object
		var encPayload model.EncryptedPayload
		if err := json.Unmarshal(req.Content, &encPayload); err == nil && encPayload.Version > 0 && encPayload.Algorithm != "" && encPayload.IV != "" && encPayload.Ciphertext != "" {
			if err := model.ValidateEncryptedPayload(encPayload); err != nil {
				return nil, fmt.Errorf("%w: %s", model.ErrInvalidEncryptedPayload, err.Error())
			}
			return s.screenplayRepo.SaveEncryptedContentWithRevision(ctx, screenplayID, encPayload, req.Revision)
		}

		// Check if Content is a stringified JSON string containing an EncryptedPayload
		var strVal string
		if err := json.Unmarshal(req.Content, &strVal); err == nil {
			var nestedEnc model.EncryptedPayload
			if err := json.Unmarshal([]byte(strVal), &nestedEnc); err == nil && nestedEnc.Version > 0 && nestedEnc.Algorithm != "" && nestedEnc.IV != "" && nestedEnc.Ciphertext != "" {
				if err := model.ValidateEncryptedPayload(nestedEnc); err != nil {
					return nil, fmt.Errorf("%w: %s", model.ErrInvalidEncryptedPayload, err.Error())
				}
				return s.screenplayRepo.SaveEncryptedContentWithRevision(ctx, screenplayID, nestedEnc, req.Revision)
			}

			// Plaintext string
			return s.screenplayRepo.SaveContentWithRevision(ctx, screenplayID, strVal, req.Revision)
		}

		// Plaintext raw representation
		return s.screenplayRepo.SaveContentWithRevision(ctx, screenplayID, string(req.Content), req.Revision)
	}

	return nil, fmt.Errorf("%w: content or encryptedContent must be provided", model.ErrBadRequest)
}

func (s *screenplayService) verifyOwnership(ctx context.Context, id, userID uuid.UUID) error {
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, id, userID)
	if err == nil {
		return nil
	}
	_, pErr := s.projectRepo.GetByIDAndUserID(ctx, id, userID)
	if pErr == nil {
		return nil
	}
	return err
}

func (s *screenplayService) GetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID) (*model.ScreenplayKeyResponse, error) {
	// Verify ownership against screenplay or project
	if err := s.verifyOwnership(ctx, screenplayID, userID); err != nil {
		return nil, err
	}

	return s.screenplayRepo.GetScreenplayKey(ctx, screenplayID, userID)
}

func (s *screenplayService) SetScreenplayKey(ctx context.Context, screenplayID, userID uuid.UUID, req model.WrappedKeyPayload) (*model.ScreenplayKeyResponse, error) {
	// Verify ownership against screenplay or project
	if err := s.verifyOwnership(ctx, screenplayID, userID); err != nil {
		return nil, err
	}

	if err := model.ValidateWrappedKeyPayload(req); err != nil {
		return nil, fmt.Errorf("%w: %s", model.ErrInvalidWrappedKey, err.Error())
	}

	return s.screenplayRepo.UpsertScreenplayKey(ctx, screenplayID, userID, req.WrappedKey, req.IV, req.Algorithm, req.Version)
}

func (s *screenplayService) CreateVersion(ctx context.Context, screenplayID, userID uuid.UUID, req model.CreateVersionRequest) (*model.ScreenplayVersionResponse, error) {
	// Verify ownership
	_, err := s.screenplayRepo.GetScreenplayWithOwnership(ctx, screenplayID, userID)
	if err != nil {
		return nil, err
	}

	// If explicit encrypted payload provided:
	if req.EncryptedPayload != nil {
		if err := model.ValidateEncryptedPayload(*req.EncryptedPayload); err != nil {
			return nil, fmt.Errorf("%w: %s", model.ErrInvalidEncryptedPayload, err.Error())
		}
		return s.screenplayRepo.CreateVersion(ctx, screenplayID, req.Title, "", req.EncryptedPayload, &userID)
	}

	// If explicit content string provided:
	if req.Content != nil {
		// Check if it's stringified JSON of EncryptedPayload
		var nestedEnc model.EncryptedPayload
		if err := json.Unmarshal([]byte(*req.Content), &nestedEnc); err == nil && nestedEnc.Version > 0 && nestedEnc.Algorithm != "" && nestedEnc.IV != "" && nestedEnc.Ciphertext != "" {
			if err := model.ValidateEncryptedPayload(nestedEnc); err != nil {
				return nil, fmt.Errorf("%w: %s", model.ErrInvalidEncryptedPayload, err.Error())
			}
			return s.screenplayRepo.CreateVersion(ctx, screenplayID, req.Title, "", &nestedEnc, &userID)
		}
		return s.screenplayRepo.CreateVersion(ctx, screenplayID, req.Title, *req.Content, nil, &userID)
	}

	// Otherwise, snapshot current content
	curr, err := s.screenplayRepo.GetContent(ctx, screenplayID)
	if err != nil {
		return nil, err
	}

	if curr.IsEncrypted {
		enc := &model.EncryptedPayload{
			Version:    curr.EncryptionVersion,
			Algorithm:  curr.Algorithm,
			IV:         curr.IV,
			Ciphertext: curr.Ciphertext,
		}
		return s.screenplayRepo.CreateVersion(ctx, screenplayID, req.Title, "", enc, &userID)
	}

	plainContent := ""
	if str, ok := curr.Content.(string); ok {
		plainContent = str
	}
	return s.screenplayRepo.CreateVersion(ctx, screenplayID, req.Title, plainContent, nil, &userID)
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
