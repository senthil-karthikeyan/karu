package service

import (
	"context"
	"log"

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

func (s *userService) GetProfile(
	ctx context.Context,
	userID uuid.UUID,
) (*model.UserResponse, error) {

	log.Printf("[USER SERVICE] GetProfile user_id=%s", userID)

	profile, err := s.userRepo.GetByID(ctx, userID)

	if err != nil {
		log.Printf(
			"[USER SERVICE] GetByID ERROR user_id=%s err=%v",
			userID,
			err,
		)
		return nil, err
	}

	log.Printf(
		"[USER SERVICE] GetProfile SUCCESS user_id=%s",
		userID,
	)

	return profile, nil
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
