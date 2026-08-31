package service

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"

	"backend/internal/model"
	"backend/internal/repository"
)

type UserService interface {
	GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req model.UpdateUserRequest) (*model.UserResponse, error)

	GetEncryptionMetadata(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionMetadataResponse, error)
	SetEncryptionMetadata(ctx context.Context, userID uuid.UUID, req model.UserEncryptionMetadataRequest) (*model.UserEncryptionMetadataResponse, error)

	GetEncryptionIdentity(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionIdentityPayload, error)
	SetEncryptionIdentity(ctx context.Context, userID uuid.UUID, req model.UserEncryptionIdentityRequest) (*model.UserEncryptionIdentityPayload, error)
	GetUserPublicKey(ctx context.Context, userID uuid.UUID) (*model.UserPublicKeyResponse, error)
}

type userService struct {
	userRepo       repository.UserRepository
	screenplayRepo repository.ScreenplayRepository
}

func NewUserService(userRepo repository.UserRepository, screenplayRepo repository.ScreenplayRepository) UserService {
	return &userService{
		userRepo:       userRepo,
		screenplayRepo: screenplayRepo,
	}
}

func (s *userService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserResponse, error) {
	log.Printf("[USER SERVICE] GetProfile user_id=%s", userID)

	profile, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		log.Printf("[USER SERVICE] GetByID ERROR user_id=%s err=%v", userID, err)
		return nil, err
	}

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

func (s *userService) GetEncryptionMetadata(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionMetadataResponse, error) {
	return s.screenplayRepo.GetUserEncryptionMetadata(ctx, userID)
}

func (s *userService) SetEncryptionMetadata(ctx context.Context, userID uuid.UUID, req model.UserEncryptionMetadataRequest) (*model.UserEncryptionMetadataResponse, error) {
	if err := model.ValidateSalt(req.Salt); err != nil {
		return nil, fmt.Errorf("%w: %s", model.ErrBadRequest, err.Error())
	}

	iterations := req.Iterations
	if iterations == 0 {
		iterations = model.DefaultPBKDF2Iterations
	}
	if iterations < model.MinPBKDF2Iterations || iterations > model.MaxPBKDF2Iterations {
		return nil, fmt.Errorf("%w: iterations must be between %d and %d", model.ErrBadRequest, model.MinPBKDF2Iterations, model.MaxPBKDF2Iterations)
	}

	hashAlgo := req.HashAlgorithm
	if hashAlgo == "" {
		hashAlgo = model.ExpectedHashAlgorithm
	}
	if hashAlgo != model.ExpectedHashAlgorithm {
		return nil, fmt.Errorf("%w: unsupported hash algorithm '%s' (expected '%s')", model.ErrBadRequest, hashAlgo, model.ExpectedHashAlgorithm)
	}

	return s.screenplayRepo.UpsertUserEncryptionMetadata(ctx, userID, req.Salt, iterations, hashAlgo)
}

func (s *userService) GetEncryptionIdentity(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionIdentityPayload, error) {
	return s.screenplayRepo.GetUserEncryptionIdentity(ctx, userID)
}

func (s *userService) SetEncryptionIdentity(ctx context.Context, userID uuid.UUID, req model.UserEncryptionIdentityRequest) (*model.UserEncryptionIdentityPayload, error) {
	if err := model.ValidateUserEncryptionIdentityRequest(req); err != nil {
		return nil, fmt.Errorf("%w: %s", model.ErrBadRequest, err.Error())
	}

	algo := req.Algorithm
	if algo == "" {
		algo = model.ExpectedAsymmetricAlgorithm
	}
	if algo != model.ExpectedAsymmetricAlgorithm {
		return nil, fmt.Errorf("%w: unsupported identity algorithm '%s' (expected '%s')", model.ErrBadRequest, algo, model.ExpectedAsymmetricAlgorithm)
	}

	version := req.Version
	if version == 0 {
		version = model.ExpectedEncryptionVersion
	}
	if version != model.ExpectedEncryptionVersion {
		return nil, fmt.Errorf("%w: unsupported encryption version %d (expected %d)", model.ErrBadRequest, version, model.ExpectedEncryptionVersion)
	}

	return s.screenplayRepo.UpsertUserEncryptionIdentity(ctx, userID, req.PublicKey, req.EncryptedPrivateKey, req.KeyIV, algo, version)
}

func (s *userService) GetUserPublicKey(ctx context.Context, userID uuid.UUID) (*model.UserPublicKeyResponse, error) {
	return s.screenplayRepo.GetUserPublicKey(ctx, userID)
}
