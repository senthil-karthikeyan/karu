package server

import (
	"fmt"
	"net/http"
	"time"

	"backend/internal/auth"
	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/handler"
	"backend/internal/repository"
	"backend/internal/router"
	"backend/internal/service"
)

// NewServer initializes all dependencies, wiring repository, service, handler, and router layers.
func NewServer() (*http.Server, database.Service, error) {
	cfg := config.Load()

	dbService, err := database.New(cfg.Database)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Initialize Token Manager & Goth Authenticator
	tokenManager := auth.NewTokenManager(cfg.JWT.AccessSecret, cfg.JWT.AccessExpiry, cfg.JWT.RefreshExpiry)
	gothAuth := auth.InitGoth(cfg.GothSessionSecret, cfg.GoogleOAuth)

	// Repositories
	userRepo := repository.NewUserRepository(dbService.Pool())
	authIdentityRepo := repository.NewAuthIdentityRepository(dbService.Pool())
	refreshTokenRepo := repository.NewRefreshTokenRepository(dbService.Pool())
	projectRepo := repository.NewProjectRepository(dbService.Pool())
	sceneRepo := repository.NewSceneRepository(dbService.Pool())
	activityRepo := repository.NewActivityRepository(dbService.Pool())
	screenplayRepo := repository.NewScreenplayRepository(dbService.Pool())

	// Services
	authSvc := service.NewAuthService(userRepo, authIdentityRepo, refreshTokenRepo, tokenManager)
	userSvc := service.NewUserService(userRepo, screenplayRepo)
	projectSvc := service.NewProjectService(projectRepo, sceneRepo, activityRepo)
	screenplaySvc := service.NewScreenplayService(screenplayRepo, projectRepo)

	// Handlers
	healthH := handler.NewHealthHandler(dbService)
	authH := handler.NewAuthHandler(authSvc, gothAuth, cfg.FrontendURL)
	userH := handler.NewUserHandler(userSvc)
	projectH := handler.NewProjectHandler(projectSvc)
	screenplayH := handler.NewScreenplayHandler(screenplaySvc)

	// Router
	engine := router.NewRouter(router.RouterDependencies{
		Config:            cfg,
		TokenManager:      tokenManager,
		HealthHandler:     healthH,
		AuthHandler:       authH,
		UserHandler:       userH,
		ProjectHandler:    projectH,
		ScreenplayHandler: screenplayH,
	})

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      engine,
		IdleTimeout:  time.Minute,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return httpServer, dbService, nil
}
