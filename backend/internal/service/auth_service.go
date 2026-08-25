package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"backend/internal/auth"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/sqlc/generated"
)

type AuthService interface {
	Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error)
	Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error)
	HandleGoogleAuth(ctx context.Context, oauthUser *auth.OAuthUser) (*model.AuthResponse, error)
	RefreshToken(ctx context.Context, req model.RefreshTokenRequest) (*auth.TokenPair, error)
	Logout(ctx context.Context, rawRefreshToken string) error
}

type authService struct {
	userRepo         repository.UserRepository
	authIdentityRepo repository.AuthIdentityRepository
	refreshTokenRepo repository.RefreshTokenRepository
	tokenManager     auth.TokenManager
}

func NewAuthService(
	userRepo repository.UserRepository,
	authIdentityRepo repository.AuthIdentityRepository,
	refreshTokenRepo repository.RefreshTokenRepository,
	tokenManager auth.TokenManager,
) AuthService {
	return &authService{
		userRepo:         userRepo,
		authIdentityRepo: authIdentityRepo,
		refreshTokenRepo: refreshTokenRepo,
		tokenManager:     tokenManager,
	}
}

func (s *authService) createSessionTokens(ctx context.Context, user model.UserResponse) (*model.AuthResponse, error) {
	// 1. Generate short-lived Access Token
	accessToken, expiresIn, err := s.tokenManager.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	// 2. Generate random Refresh Token and insert hash in DB
	rawRefreshToken, tokenHash, expiresAt, err := s.tokenManager.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	_, err = s.refreshTokenRepo.Create(ctx, user.ID, tokenHash, expiresAt)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		ExpiresIn:    expiresIn,
	}, nil
}

func (s *authService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		return nil, model.ErrBadRequest
	}
	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	// Check if user already exists
	_, err := s.userRepo.GetByEmail(ctx, email)
	if err == nil {
		return nil, model.ErrEmailAlreadyExists
	} else if !errors.Is(err, model.ErrNotFound) {
		return nil, err
	}

	// Hash password
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// 1. Create User
	user, err := s.userRepo.Create(ctx, email, hash, req.Name, "", "", model.DefaultPreferences())
	if err != nil {
		return nil, err
	}

	// 2. Create Email Auth Identity
	_, err = s.authIdentityRepo.Create(ctx, user.ID, "email", email, hash)
	if err != nil {
		return nil, err
	}

	// 3. Issue Session Tokens
	return s.createSessionTokens(ctx, *user)
}

func (s *authService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		return nil, model.ErrInvalidCredentials
	}

	// Find email auth identity
	identity, err := s.authIdentityRepo.GetByProvider(ctx, "email", email)
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			return nil, model.ErrInvalidCredentials
		}
		return nil, err
	}

	// Verify password
	if !auth.CheckPasswordHash(req.Password, identity.PasswordHash) {
		return nil, model.ErrInvalidCredentials
	}

	// Get full user profile
	user, err := s.userRepo.GetByID(ctx, identity.UserID.Bytes)
	if err != nil {
		return nil, model.ErrInvalidCredentials
	}

	// Issue Session Tokens
	return s.createSessionTokens(ctx, *user)
}

func (s *authService) HandleGoogleAuth(ctx context.Context, oauthUser *auth.OAuthUser) (*model.AuthResponse, error) {
	if oauthUser == nil || oauthUser.ProviderUserID == "" {
		return nil, model.ErrBadRequest
	}

	email := strings.ToLower(strings.TrimSpace(oauthUser.Email))

	// Scenario A: Check if Google identity already exists
	identity, err := s.authIdentityRepo.GetByProvider(ctx, "google", oauthUser.ProviderUserID)
	if err == nil {
		// Existing Google Identity -> find user
		user, err := s.userRepo.GetByID(ctx, identity.UserID.Bytes)
		if err != nil {
			return nil, err
		}
		return s.createSessionTokens(ctx, *user)
	} else if !errors.Is(err, model.ErrNotFound) {
		return nil, err
	}

	// Google identity does NOT exist.
	// Check if a user with this email already exists (Scenario C vs Scenario B)
	var targetUser *model.UserResponse
	if email != "" {
		existingUser, err := s.userRepo.GetByEmail(ctx, email)
		if err == nil {
			// Scenario C: User already exists with email -> Link Google Identity
			targetUser, err = s.userRepo.GetByID(ctx, existingUser.ID.Bytes)
			if err != nil {
				return nil, err
			}
		} else if !errors.Is(err, model.ErrNotFound) {
			return nil, err
		}
	}

	if targetUser == nil {
		// Scenario B: User does not exist -> Create new user and Google identity
		newUser, err := s.userRepo.Create(
			ctx,
			email,
			"", // no password hash for OAuth
			oauthUser.Name,
			oauthUser.AvatarURL,
			"",
			model.DefaultPreferences(),
		)
		if err != nil {
			return nil, err
		}
		targetUser = newUser
	}

	// Create Google identity linked to targetUser
	_, err = s.authIdentityRepo.Create(ctx, targetUser.ID, "google", oauthUser.ProviderUserID, "")
	if err != nil {
		return nil, err
	}

	return s.createSessionTokens(ctx, *targetUser)
}

func (s *authService) RefreshToken(ctx context.Context, req model.RefreshTokenRequest) (*auth.TokenPair, error) {
	rawToken := strings.TrimSpace(req.RefreshToken)
	if rawToken == "" {
		return nil, model.ErrUnauthorized
	}

	tokenHash := s.tokenManager.HashToken(rawToken)

	// Look up refresh token in database
	dbToken, err := s.refreshTokenRepo.GetByHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, model.ErrNotFound) {
			return nil, model.ErrUnauthorized
		}
		return nil, err
	}

	// Validate: must not be revoked and not expired
	if dbToken.RevokedAt.Valid {
		return nil, model.ErrUnauthorized
	}
	if time.Now().After(dbToken.ExpiresAt.Time) {
		return nil, model.ErrUnauthorized
	}

	// 1. Revoke the old token (Token Rotation)
	if err := s.refreshTokenRepo.Revoke(ctx, tokenHash); err != nil {
		return nil, model.ErrUnauthorized
	}

	// 2. Fetch User to verify user still exists
	user, err := s.userRepo.GetByID(ctx, dbToken.UserID.Bytes)
	if err != nil {
		return nil, model.ErrUnauthorized
	}

	// 3. Generate New Access Token
	accessToken, expiresIn, err := s.tokenManager.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}

	// 4. Generate New Refresh Token and save in DB
	newRawToken, newTokenHash, newExpiresAt, err := s.tokenManager.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	_, err = s.refreshTokenRepo.Create(ctx, user.ID, newTokenHash, newExpiresAt)
	if err != nil {
		return nil, err
	}

	return &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: newRawToken,
		ExpiresIn:    expiresIn,
		ExpiresAt:    newExpiresAt,
	}, nil
}

func (s *authService) Logout(ctx context.Context, rawRefreshToken string) error {
	rawToken := strings.TrimSpace(rawRefreshToken)
	if rawToken == "" {
		return nil
	}

	tokenHash := s.tokenManager.HashToken(rawToken)
	_ = s.refreshTokenRepo.Revoke(ctx, tokenHash)
	return nil
}

// Unused dummy to prevent compiler warnings
var _ = generated.AuthIdentity{}
