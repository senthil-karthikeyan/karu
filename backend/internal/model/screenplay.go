package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ScreenplayResponse struct {
	ID          uuid.UUID `json:"id"`
	ProjectID   uuid.UUID `json:"projectId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	IsDefault   bool      `json:"isDefault"`
	SortOrder   int       `json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ScreenplayDetailResponse struct {
	ScreenplayResponse
	Content           interface{} `json:"content"`
	Revision          int64       `json:"revision"`
	IsEncrypted       bool        `json:"isEncrypted"`
	EncryptionVersion int         `json:"encryptionVersion,omitempty"`
	Algorithm         string      `json:"algorithm,omitempty"`
	IV                string      `json:"iv,omitempty"`
	Ciphertext        string      `json:"ciphertext,omitempty"`
}

type CreateScreenplayRequest struct {
	Title            string             `json:"title" binding:"required"`
	Description      string             `json:"description"`
	IsDefault        bool               `json:"isDefault,omitempty"`
	SortOrder        int                `json:"sortOrder,omitempty"`
	EncryptedPayload *EncryptedPayload  `json:"encryptedPayload,omitempty"`
	WrappedKey       *WrappedKeyPayload `json:"wrappedKey,omitempty"`
}

type UpdateScreenplayRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	IsDefault   *bool   `json:"isDefault"`
	SortOrder   *int    `json:"sortOrder"`
}

type ScreenplayContentResponse struct {
	ScreenplayID      uuid.UUID   `json:"screenplayId"`
	Content           interface{} `json:"content"`
	Revision          int64       `json:"revision"`
	IsEncrypted       bool        `json:"isEncrypted"`
	EncryptionVersion int         `json:"encryptionVersion,omitempty"`
	Algorithm         string      `json:"algorithm,omitempty"`
	IV                string      `json:"iv,omitempty"`
	Ciphertext        string      `json:"ciphertext,omitempty"`
	UpdatedAt         time.Time   `json:"updatedAt"`
}

type SaveContentRequest struct {
	Content          json.RawMessage   `json:"content,omitempty"`
	EncryptedContent *EncryptedPayload `json:"encryptedContent,omitempty"`
	Revision         int64             `json:"revision"`
}

type ScreenplayVersionResponse struct {
	ID                uuid.UUID   `json:"id"`
	ScreenplayID      uuid.UUID   `json:"screenplayId"`
	VersionNumber     int         `json:"versionNumber"`
	Title             string      `json:"title"`
	Content           interface{} `json:"content"`
	IsEncrypted       bool        `json:"isEncrypted"`
	EncryptionVersion int         `json:"encryptionVersion,omitempty"`
	Algorithm         string      `json:"algorithm,omitempty"`
	IV                string      `json:"iv,omitempty"`
	Ciphertext        string      `json:"ciphertext,omitempty"`
	CreatedBy         *uuid.UUID  `json:"createdBy,omitempty"`
	CreatedAt         time.Time   `json:"createdAt"`
}

type CreateVersionRequest struct {
	Title            string            `json:"title"`
	Content          *string           `json:"content,omitempty"`
	EncryptedPayload *EncryptedPayload `json:"encryptedPayload,omitempty"`
}

type RestoreVersionResponse struct {
	ScreenplayID   uuid.UUID                 `json:"screenplayId"`
	RestoredFromID uuid.UUID                 `json:"restoredFromId"`
	NewRevision    int64                     `json:"newRevision"`
	Content        interface{}               `json:"content"`
	IsEncrypted    bool                      `json:"isEncrypted"`
	RestoreVersion ScreenplayVersionResponse `json:"restoreVersion"`
}
