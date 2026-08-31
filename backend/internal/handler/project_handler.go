package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/service"
)

type ProjectHandler struct {
	projectService service.ProjectService
}

func NewProjectHandler(projectService service.ProjectService) *ProjectHandler {
	return &ProjectHandler{
		projectService: projectService,
	}
}

// ListProjects lists all projects for the authenticated user.
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	projects, err := h.projectService.ListProjects(c.Request.Context(), userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, projects)
}

// CreateProject creates a new project for the authenticated user.
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	var req model.CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	project, err := h.projectService.CreateProject(c.Request.Context(), userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusCreated, project)
}

// GetProject gets a project detail by ID with screenplay content and scenes.
func (h *ProjectHandler) GetProject(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	project, err := h.projectService.GetProject(c.Request.Context(), projectID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, project)
}

// UpdateProject updates metadata or screenplay content of a project.
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	project, err := h.projectService.UpdateProject(c.Request.Context(), projectID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, project)
}

// DeleteProject deletes a project.
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	if err := h.projectService.DeleteProject(c.Request.Context(), projectID, userID); err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

// CreateScene adds a scene to a project.
func (h *ProjectHandler) CreateScene(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.CreateSceneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	scene, err := h.projectService.CreateScene(c.Request.Context(), projectID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusCreated, scene)
}

// ListScenes gets all scenes for a project.
func (h *ProjectHandler) ListScenes(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	scenes, err := h.projectService.ListScenes(c.Request.Context(), projectID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, scenes)
}

// UpdateScene updates a scene.
func (h *ProjectHandler) UpdateScene(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	sceneIdParam := c.Param("sceneId")
	sceneID, err := uuid.Parse(sceneIdParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.UpdateSceneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	scene, err := h.projectService.UpdateScene(c.Request.Context(), projectID, sceneID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, scene)
}

// DeleteScene deletes a scene.
func (h *ProjectHandler) DeleteScene(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	sceneIdParam := c.Param("sceneId")
	sceneID, err := uuid.Parse(sceneIdParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	if err := h.projectService.DeleteScene(c.Request.Context(), projectID, sceneID, userID); err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, gin.H{"message": "Scene deleted successfully"})
}

// ListActivities gets activity history for a project.
func (h *ProjectHandler) ListActivities(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	idParam := c.Param("id")
	projectID, err := uuid.Parse(idParam)
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	activities, err := h.projectService.ListActivities(c.Request.Context(), projectID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, activities)
}

// GetProjectKey returns the wrapped Project Encryption Key (PEK) for the authenticated user.
func (h *ProjectHandler) GetProjectKey(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	key, err := h.projectService.GetProjectKey(c.Request.Context(), projectID, userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, key)
}

// SetProjectKey saves or updates the wrapped Project Encryption Key (PEK).
func (h *ProjectHandler) SetProjectKey(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	projectID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrNotFound)
		return
	}

	var req model.WrappedKeyPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	key, err := h.projectService.SetProjectKey(c.Request.Context(), projectID, userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, key)
}
