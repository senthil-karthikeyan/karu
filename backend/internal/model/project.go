package model

import (
	"time"

	"github.com/google/uuid"
)

type ProjectStats struct {
	PageCount  int `json:"pageCount"`
	WordCount  int `json:"wordCount"`
	SceneCount int `json:"sceneCount"`
}

type SceneItem struct {
	ID         uuid.UUID `json:"id"`
	ProjectID  uuid.UUID `json:"projectId"`
	Number     int       `json:"number"`
	Slugline   string    `json:"slugline"`
	Location   string    `json:"location"`
	Time       string    `json:"time"`
	Summary    string    `json:"summary,omitempty"`
	PageNumber int       `json:"pageNumber"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type ActivityItem struct {
	ID          uuid.UUID              `json:"id"`
	ProjectID   uuid.UUID              `json:"projectId"`
	UserID      uuid.UUID              `json:"userId"`
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	Timestamp   time.Time              `json:"timestamp"`
}

type ProjectResponse struct {
	ID              uuid.UUID    `json:"id"`
	UserID          uuid.UUID    `json:"userId"`
	Title           string       `json:"title"`
	Logline         string       `json:"logline"`
	Genre           string       `json:"genre"`
	Format          string       `json:"format"`
	Status          string       `json:"status"`
	Synopsis        string       `json:"synopsis"`
	CoverImage      string       `json:"coverImage"`
	LastEditedScene string       `json:"lastEditedScene"`
	Stats           ProjectStats `json:"stats"`
	CreatedAt       time.Time    `json:"createdAt"`
	UpdatedAt       time.Time    `json:"updatedAt"`
}

type ProjectDetailResponse struct {
	ProjectResponse
	ScreenplayContent string      `json:"screenplayContent"`
	Scenes            []SceneItem `json:"scenes"`
}

type CreateProjectRequest struct {
	Title      string `json:"title" binding:"required"`
	Logline    string `json:"logline"`
	Genre      string `json:"genre"`
	Format     string `json:"format"`
	Status     string `json:"status"`
	Synopsis   string `json:"synopsis"`
	CoverImage string `json:"coverImage"`
}

type UpdateProjectRequest struct {
	Title             *string `json:"title"`
	Logline           *string `json:"logline"`
	Genre             *string `json:"genre"`
	Format            *string `json:"format"`
	Status            *string `json:"status"`
	Synopsis          *string `json:"synopsis"`
	CoverImage        *string `json:"coverImage"`
	ScreenplayContent *string `json:"screenplayContent"`
	LastEditedScene   *string `json:"lastEditedScene"`
}

type CreateSceneRequest struct {
	Number     int    `json:"number" binding:"required"`
	Slugline   string `json:"slugline" binding:"required"`
	Location   string `json:"location"`
	Time       string `json:"time"`
	Summary    string `json:"summary"`
	PageNumber int    `json:"pageNumber"`
}

type UpdateSceneRequest struct {
	Number     *int    `json:"number"`
	Slugline   *string `json:"slugline"`
	Location   *string `json:"location"`
	Time       *string `json:"time"`
	Summary    *string `json:"summary"`
	PageNumber *int    `json:"pageNumber"`
}
