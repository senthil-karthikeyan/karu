package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/service"
)

type ScreenplayHandler struct {
	screenplayService service.ScreenplayService
}

func NewScreenplayHandler(screenplayService service.ScreenplayService) *ScreenplayHandler {
	return &ScreenplayHandler{
		screenplayService: screenplayService,
	}
}

// ListScreenplays gets all screenplays belonging to a project.
func (h *ScreenplayHandler) ListScreenplays(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	param := c.Param("projectId")
	if param == "" {
		param = c.Param("id")
	}
	projectID, err := uuid.Parse(param)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	screenplays, err := h.screenplayService.ListScreenplays(c.Request.Context(), projectID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, screenplays)
}

// CreateScreenplay creates a new screenplay inside a project.
func (h *ScreenplayHandler) CreateScreenplay(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	param := c.Param("projectId")
	if param == "" {
		param = c.Param("id")
	}
	projectID, err := uuid.Parse(param)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.CreateScreenplayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	screenplay, err := h.screenplayService.CreateScreenplay(c.Request.Context(), projectID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusCreated, screenplay)
}

// GetScreenplay gets screenplay metadata and current content.
func (h *ScreenplayHandler) GetScreenplay(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	screenplay, err := h.screenplayService.GetScreenplay(c.Request.Context(), screenplayID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, screenplay)
}

// UpdateScreenplay updates screenplay title and description.
func (h *ScreenplayHandler) UpdateScreenplay(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.UpdateScreenplayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	screenplay, err := h.screenplayService.UpdateScreenplay(c.Request.Context(), screenplayID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, screenplay)
}

// DeleteScreenplay deletes a screenplay.
func (h *ScreenplayHandler) DeleteScreenplay(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	if err := h.screenplayService.DeleteScreenplay(c.Request.Context(), screenplayID, userID); err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, gin.H{"message": "Screenplay deleted successfully"})
}

// GetContent retrieves screenplay content and current revision.
func (h *ScreenplayHandler) GetContent(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	content, err := h.screenplayService.GetContent(c.Request.Context(), screenplayID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, content)
}

// SaveContent performs autosave with optimistic concurrency check.
func (h *ScreenplayHandler) SaveContent(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.SaveContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	saved, err := h.screenplayService.SaveContent(c.Request.Context(), screenplayID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, saved)
}

// GetScreenplayKey retrieves the authenticated user's wrapped SCK for a screenplay.
func (h *ScreenplayHandler) GetScreenplayKey(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	key, err := h.screenplayService.GetScreenplayKey(c.Request.Context(), screenplayID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, key)
}

// SetScreenplayKey stores or updates the authenticated user's wrapped SCK for a screenplay.
func (h *ScreenplayHandler) SetScreenplayKey(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.WrappedKeyPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	key, err := h.screenplayService.SetScreenplayKey(c.Request.Context(), screenplayID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, key)
}

// ListVersions lists version checkpoints for a screenplay.
func (h *ScreenplayHandler) ListVersions(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	versions, err := h.screenplayService.ListVersions(c.Request.Context(), screenplayID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, versions)
}

// GetVersion gets a specific version checkpoint.
func (h *ScreenplayHandler) GetVersion(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	versionID, err := uuid.Parse(c.Param("versionId"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	version, err := h.screenplayService.GetVersion(c.Request.Context(), screenplayID, versionID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, version)
}

// CreateVersion creates a manual version checkpoint.
func (h *ScreenplayHandler) CreateVersion(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.CreateVersionRequest
	_ = c.ShouldBindJSON(&req)

	version, err := h.screenplayService.CreateVersion(c.Request.Context(), screenplayID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusCreated, version)
}

// RestoreVersion restores a screenplay to a past version checkpoint.
func (h *ScreenplayHandler) RestoreVersion(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	screenplayID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	versionID, err := uuid.Parse(c.Param("versionId"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	restored, err := h.screenplayService.RestoreVersion(c.Request.Context(), screenplayID, versionID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, restored)
}
