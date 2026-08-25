package model

import (
	"time"

	"github.com/google/uuid"
)

type UserPreferences struct {
	EditorTheme string `json:"editorTheme"`
	FontSize    int    `json:"fontSize"`
	SpellCheck  bool   `json:"spellCheck"`
	WordWrap    bool   `json:"wordWrap"`
	AutoSave    bool   `json:"autoSave"`
}

func DefaultPreferences() UserPreferences {
	return UserPreferences{
		EditorTheme: "dark",
		FontSize:    14,
		SpellCheck:  true,
		WordWrap:    true,
		AutoSave:    true,
	}
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type UpdateUserRequest struct {
	Name        *string          `json:"name"`
	AvatarURL   *string          `json:"avatarUrl"`
	Bio         *string          `json:"bio"`
	Preferences *UserPreferences `json:"preferences"`
}

type UserResponse struct {
	ID          uuid.UUID       `json:"id"`
	Email       string          `json:"email"`
	Name        string          `json:"name"`
	AvatarURL   string          `json:"avatarUrl"`
	Bio         string          `json:"bio"`
	Preferences UserPreferences `json:"preferences"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresIn    int64        `json:"expiresIn"`
}
