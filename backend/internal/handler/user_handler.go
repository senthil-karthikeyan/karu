package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/middleware"
	"backend/internal/model"
	"backend/internal/service"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetMe returns current authenticated user's profile.
func (h *UserHandler) GetMe(c *gin.Context) {
	log.Printf("[USERS ME] request received")

	userID, err := middleware.GetUserID(c)
	if err != nil {
		log.Printf("[USERS ME] GetUserID error: %v", err)
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	log.Printf("[USERS ME] user_id=%s", userID)

	profile, err := h.userService.GetProfile(
		c.Request.Context(),
		userID,
	)
	if err != nil {
		log.Printf(
			"[USERS ME] GetProfile error user_id=%s err=%v",
			userID,
			err,
		)
		model.SendError(c, err)
		return
	}

	log.Printf("[USERS ME] success user_id=%s", userID)
	model.SendSuccess(c, http.StatusOK, profile)
}

// UpdateMe updates current authenticated user's profile.
func (h *UserHandler) UpdateMe(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	updated, err := h.userService.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, updated)
}

// GetEncryptionMetadata returns the user's public salt and PBKDF2 parameters for deriving their UEK.
func (h *UserHandler) GetEncryptionMetadata(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	metadata, err := h.userService.GetEncryptionMetadata(c.Request.Context(), userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, metadata)
}

// SetEncryptionMetadata saves or updates the user's encryption salt and PBKDF2 configuration.
func (h *UserHandler) SetEncryptionMetadata(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	var req model.UserEncryptionMetadataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	metadata, err := h.userService.SetEncryptionMetadata(c.Request.Context(), userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, metadata)
}
