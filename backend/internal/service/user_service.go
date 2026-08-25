package service

import (
	"context"

	"github.com/google/uuid"

	"backend/internal/model"
	"backend/internal/repository"
)

type UserService interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserResponse, error)
}

type userService struct {
	userRepo repository.UserRepository
}

func NewUserService(userRepo repository.UserRepository) UserService {
	return &userService{
		userRepo: userRepo,
	}
}

func (s *userService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserResponse, error) {
	return s.userRepo.GetByID(ctx, userID)
}

func (s *userService) UpdateProfile(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserResponse, error) {
	var name, avatarURL, bio string
	if req.Name != nil {
		name = *req.Name
	}
	if req.AvatarURL != nil {
		avatarURL = *req.AvatarURL
	}
	if req.Bio != nil {
		bio = *req.Bio
	}

	return s.userRepo.UpdateProfile(ctx, userID, name, avatarURL, bio, req.Preferences)
}
