package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/auth"
	"backend/internal/config"
	"backend/internal/handler"
	"backend/internal/middleware"
)

type RouterDependencies struct {
	Config            *config.Config
	TokenManager      auth.TokenManager
	HealthHandler     *handler.HealthHandler
	AuthHandler       *handler.AuthHandler
	UserHandler       *handler.UserHandler
	ProjectHandler    *handler.ProjectHandler
	ScreenplayHandler *handler.ScreenplayHandler
}

// NewRouter constructs and configures the Gin HTTP handler.
func NewRouter(deps RouterDependencies) *gin.Engine {
	if deps.Config.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global Middlewares
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(middleware.Recovery())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS(deps.Config.CORS))

	// Root & Health Check Endpoints
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"app":     "Karu API",
			"version": "1.0.0",
			"status":  "running",
		})
	})

	r.GET("/health", deps.HealthHandler.Health)
	r.GET("/ready", deps.HealthHandler.Ready)

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Public Auth routes
		authGroup := v1.Group("/auth")
		{
			authGroup.POST("/register", deps.AuthHandler.Register)
			authGroup.POST("/login", deps.AuthHandler.Login)
			authGroup.POST("/refresh", deps.AuthHandler.Refresh)
			authGroup.POST("/logout", deps.AuthHandler.Logout)

			// Goth Google OAuth
			authGroup.GET("/google", deps.AuthHandler.BeginGoogleAuth)
			authGroup.GET("/google/callback", deps.AuthHandler.GoogleCallback)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(deps.TokenManager))
		{
			// User endpoints
			users := protected.Group("/users")
			{
				users.GET("/me", deps.UserHandler.GetMe)
				users.PATCH("/me", deps.UserHandler.UpdateMe)
				users.GET("/me/encryption-metadata", deps.UserHandler.GetEncryptionMetadata)
				users.POST("/me/encryption-metadata", deps.UserHandler.SetEncryptionMetadata)
				users.GET("/me/encryption-identity", deps.UserHandler.GetEncryptionIdentity)
				users.POST("/me/encryption-identity", deps.UserHandler.SetEncryptionIdentity)
				users.GET("/:id/public-key", deps.UserHandler.GetUserPublicKey)
			}

			// Project endpoints
			projects := protected.Group("/projects")
			{
				projects.GET("", deps.ProjectHandler.ListProjects)
				projects.POST("", deps.ProjectHandler.CreateProject)
				projects.GET("/:id", deps.ProjectHandler.GetProject)
				projects.PATCH("/:id", deps.ProjectHandler.UpdateProject)
				projects.DELETE("/:id", deps.ProjectHandler.DeleteProject)

				// Project Key Management (E2EE PEK)
				projects.GET("/:id/key", deps.ProjectHandler.GetProjectKey)
				projects.POST("/:id/key", deps.ProjectHandler.SetProjectKey)

				// Scene endpoints
				projects.GET("/:id/scenes", deps.ProjectHandler.ListScenes)
				projects.POST("/:id/scenes", deps.ProjectHandler.CreateScene)
				projects.PATCH("/:id/scenes/:sceneId", deps.ProjectHandler.UpdateScene)
				projects.DELETE("/:id/scenes/:sceneId", deps.ProjectHandler.DeleteScene)

				// Activity endpoints
				projects.GET("/:id/activities", deps.ProjectHandler.ListActivities)

				// Nested Screenplay endpoints
				if deps.ScreenplayHandler != nil {
					projects.GET("/:id/screenplay", deps.ScreenplayHandler.GetProjectDefaultScreenplay)
					projects.GET("/:id/screenplays", deps.ScreenplayHandler.ListScreenplays)
					projects.POST("/:id/screenplays", deps.ScreenplayHandler.CreateScreenplay)
				}
			}

			// Screenplay endpoints
			if deps.ScreenplayHandler != nil {
				screenplays := protected.Group("/screenplays")
				{
					screenplays.GET("/:id", deps.ScreenplayHandler.GetScreenplay)
					screenplays.PATCH("/:id", deps.ScreenplayHandler.UpdateScreenplay)
					screenplays.DELETE("/:id", deps.ScreenplayHandler.DeleteScreenplay)

					// Screenplay Key Management (E2EE)
					screenplays.GET("/:id/key", deps.ScreenplayHandler.GetScreenplayKey)
					screenplays.POST("/:id/key", deps.ScreenplayHandler.SetScreenplayKey)

					// Screenplay Content & Autosave
					screenplays.GET("/:id/content", deps.ScreenplayHandler.GetContent)
					screenplays.PUT("/:id/content", deps.ScreenplayHandler.SaveContent)

					// Screenplay Versioning & Restore
					screenplays.GET("/:id/versions", deps.ScreenplayHandler.ListVersions)
					screenplays.POST("/:id/versions", deps.ScreenplayHandler.CreateVersion)
					screenplays.GET("/:id/versions/:versionId", deps.ScreenplayHandler.GetVersion)
					screenplays.POST("/:id/versions/:versionId/restore", deps.ScreenplayHandler.RestoreVersion)
				}
			}
		}
	}

	return r
}
