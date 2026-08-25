package model

import (
	"time"

	"github.com/google/uuid"
)

type ScreenplayResponse struct {
	ID          uuid.UUID `json:"id"`
	ProjectID   uuid.UUID `json:"projectId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ScreenplayDetailResponse struct {
	ScreenplayResponse
	Content  string `json:"content"`
	Revision int64  `json:"revision"`
}

type CreateScreenplayRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
}

type UpdateScreenplayRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
}

type ScreenplayContentResponse struct {
	ScreenplayID uuid.UUID `json:"screenplayId"`
	Content      string    `json:"content"`
	Revision     int64     `json:"revision"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type SaveContentRequest struct {
	Content  string `json:"content"`
	Revision int64  `json:"revision"`
}

type ScreenplayVersionResponse struct {
	ID            uuid.UUID  `json:"id"`
	ScreenplayID  uuid.UUID  `json:"screenplayId"`
	VersionNumber int        `json:"versionNumber"`
	Title         string     `json:"title"`
	Content       string     `json:"content"`
	CreatedBy     *uuid.UUID `json:"createdBy,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

type CreateVersionRequest struct {
	Title   string  `json:"title"`
	Content *string `json:"content"`
}

type RestoreVersionResponse struct {
	ScreenplayID   uuid.UUID                 `json:"screenplayId"`
	RestoredFromID uuid.UUID                 `json:"restoredFromId"`
	NewRevision    int64                     `json:"newRevision"`
	Content        string                    `json:"content"`
	RestoreVersion ScreenplayVersionResponse `json:"restoreVersion"`
}
