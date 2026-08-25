package middleware

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"backend/internal/auth"
	"backend/internal/model"
)

const (
	ContextUserIDKey = "auth_user_id"
	ContextEmailKey  = "auth_email"
)

// AuthMiddleware creates a Gin middleware that validates JWT bearer tokens.
func AuthMiddleware(tokenManager auth.TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			model.SendError(c, model.ErrUnauthorized)
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && strings.EqualFold(parts[0], "Bearer")) {
			model.SendError(c, model.ErrUnauthorized)
			c.Abort()
			return
		}

		tokenString := strings.TrimSpace(parts[1])
		claims, err := tokenManager.ValidateAccessToken(tokenString)
		if err != nil {
			model.SendError(c, model.ErrUnauthorized)
			c.Abort()
			return
		}

		c.Set(ContextUserIDKey, claims.UserID)
		c.Set(ContextEmailKey, claims.Email)
		c.Next()
	}
}

// GetUserID extracts the authenticated user's ID from the Gin context.
func GetUserID(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get(ContextUserIDKey)
	if !exists {
		return uuid.Nil, errors.New("user ID not found in context")
	}

	id, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.New("invalid user ID type in context")
	}

	return id, nil
}

// GetUserEmail extracts the authenticated user's email from the Gin context.
func GetUserEmail(c *gin.Context) string {
	val, exists := c.Get(ContextEmailKey)
	if !exists {
		return ""
	}
	email, ok := val.(string)
	if !ok {
		return ""
	}
	return email
}
