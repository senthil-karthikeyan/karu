package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

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

// GetEncryptionIdentity returns the user's public key and UEK-wrapped private key.
func (h *UserHandler) GetEncryptionIdentity(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	identity, err := h.userService.GetEncryptionIdentity(c.Request.Context(), userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, identity)
}

// SetEncryptionIdentity saves or updates the user's public key and wrapped private key.
func (h *UserHandler) SetEncryptionIdentity(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	var req model.UserEncryptionIdentityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	identity, err := h.userService.SetEncryptionIdentity(c.Request.Context(), userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, identity)
}

// GetUserPublicKey returns the public key export for a given user ID.
func (h *UserHandler) GetUserPublicKey(c *gin.Context) {
	targetUserID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		model.SendError(c, model.ErrBadRequest)
		return
	}

	pubKey, err := h.userService.GetUserPublicKey(c.Request.Context(), targetUserID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, pubKey)
}

// LookupUserByEmail finds a user by their email address (for sharing screenplays).
func (h *UserHandler) LookupUserByEmail(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", "email query parameter is required", http.StatusBadRequest, nil))
		return
	}

	user, err := h.userService.LookupUserByEmail(c.Request.Context(), email)
	if err != nil {
		model.SendError(c, err)
		return
	}

	// Also fetch their public key if available
	pubKey, _ := h.userService.GetUserPublicKey(c.Request.Context(), user.ID)

	type UserLookupResponse struct {
		ID        uuid.UUID                  `json:"id"`
		Email     string                     `json:"email"`
		Name      string                     `json:"name"`
		AvatarURL string                     `json:"avatarUrl"`
		PublicKey *model.UserPublicKeyResponse `json:"publicKey,omitempty"`
	}

	resp := UserLookupResponse{
		ID:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
		PublicKey: pubKey,
	}

	model.SendSuccess(c, http.StatusOK, resp)
}

// GetEncryptionKeys returns the full consolidated user encryption keys record.
func (h *UserHandler) GetEncryptionKeys(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	keys, err := h.userService.GetEncryptionKeys(c.Request.Context(), userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, keys)
}

// SetEncryptionKeys sets or updates the full consolidated user encryption keys record.
func (h *UserHandler) SetEncryptionKeys(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	var req model.UserEncryptionKeysRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	keys, err := h.userService.SetEncryptionKeys(c.Request.Context(), userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, keys)
}

// GetRecoveryCredentials returns the user's enrolled recovery credential info.
func (h *UserHandler) GetRecoveryCredentials(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	cred, err := h.userService.GetRecoveryCredentials(c.Request.Context(), userID)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, cred)
}

// SetRecoveryCredentials saves or updates the user's recovery credential.
func (h *UserHandler) SetRecoveryCredentials(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		model.SendError(c, model.ErrUnauthorized)
		return
	}

	var req model.UserRecoveryCredentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	cred, err := h.userService.SetRecoveryCredentials(c.Request.Context(), userID, req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, cred)
}

// RecoveryLookup handles public lookup of recovery credentials by email.
func (h *UserHandler) RecoveryLookup(c *gin.Context) {
	var req model.RecoveryLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	resp, err := h.userService.RecoveryLookup(c.Request.Context(), req.Email)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, resp)
}

// RecoveryReset resets user encryption credentials using recovery parameters.
func (h *UserHandler) RecoveryReset(c *gin.Context) {
	var req model.RecoveryResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		model.SendError(c, model.NewAppError("VALIDATION_ERROR", err.Error(), http.StatusUnprocessableEntity, err))
		return
	}

	err := h.userService.RecoveryReset(c.Request.Context(), req)
	if err != nil {
		model.SendError(c, err)
		return
	}

	model.SendSuccess(c, http.StatusOK, gin.H{
		"message": "credentials reset successfully",
	})
}
