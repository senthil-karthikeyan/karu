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

	LookupUserByEmail(ctx context.Context, email string) (*model.UserResponse, error)
	GetEncryptionKeys(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionKeysResponse, error)
	SetEncryptionKeys(ctx context.Context, userID uuid.UUID, req model.UserEncryptionKeysRequest) (*model.UserEncryptionKeysResponse, error)
	GetRecoveryCredentials(ctx context.Context, userID uuid.UUID) (*model.UserRecoveryCredentialResponse, error)
	SetRecoveryCredentials(ctx context.Context, userID uuid.UUID, req model.UserRecoveryCredentialRequest) (*model.UserRecoveryCredentialResponse, error)
	RecoveryLookup(ctx context.Context, email string) (*model.RecoveryLookupResponse, error)
	RecoveryReset(ctx context.Context, req model.RecoveryResetRequest) error
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

func (s *userService) LookupUserByEmail(ctx context.Context, email string) (*model.UserResponse, error) {
	u, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	id := uuid.UUID(u.ID.Bytes)
	return &model.UserResponse{
		ID:        id,
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarUrl,
		Bio:       u.Bio,
		CreatedAt: u.CreatedAt.Time,
		UpdatedAt: u.UpdatedAt.Time,
	}, nil
}

func (s *userService) GetEncryptionKeys(ctx context.Context, userID uuid.UUID) (*model.UserEncryptionKeysResponse, error) {
	return s.screenplayRepo.GetUserEncryptionKeys(ctx, userID)
}

func (s *userService) SetEncryptionKeys(ctx context.Context, userID uuid.UUID, req model.UserEncryptionKeysRequest) (*model.UserEncryptionKeysResponse, error) {
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
		return nil, fmt.Errorf("%w: unsupported hash algorithm '%s'", model.ErrBadRequest, hashAlgo)
	}

	return s.screenplayRepo.UpsertUserEncryptionKeys(ctx, userID, req)
}

func (s *userService) GetRecoveryCredentials(ctx context.Context, userID uuid.UUID) (*model.UserRecoveryCredentialResponse, error) {
	return s.screenplayRepo.GetUserRecoveryCredential(ctx, userID, "recovery_key")
}

func (s *userService) SetRecoveryCredentials(ctx context.Context, userID uuid.UUID, req model.UserRecoveryCredentialRequest) (*model.UserRecoveryCredentialResponse, error) {
	if err := model.ValidateSalt(req.Salt); err != nil {
		return nil, fmt.Errorf("%w: %s", model.ErrBadRequest, err.Error())
	}
	return s.screenplayRepo.UpsertUserRecoveryCredential(ctx, userID, req)
}

func (s *userService) RecoveryLookup(ctx context.Context, email string) (*model.RecoveryLookupResponse, error) {
	u, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, model.ErrNotFound
	}
	id := uuid.UUID(u.ID.Bytes)

	cred, err := s.screenplayRepo.GetUserRecoveryCredential(ctx, id, "recovery_key")
	if err != nil {
		return nil, model.ErrNotFound
	}

	return &model.RecoveryLookupResponse{
		UserID:                  id,
		CredentialType:          cred.CredentialType,
		Salt:                    cred.Salt,
		Iterations:              cred.Iterations,
		HashAlgorithm:           cred.HashAlgorithm,
		DoubleWrappedDEK:        cred.DoubleWrappedDEK,
		DoubleWrappedPrivateKey: cred.DoubleWrappedPrivateKey,
		KeyIV:                   cred.KeyIV,
		Version:                 cred.Version,
	}, nil
}

func (s *userService) RecoveryReset(ctx context.Context, req model.RecoveryResetRequest) error {
	u, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return model.ErrNotFound
	}
	id := uuid.UUID(u.ID.Bytes)

	if err := model.ValidateSalt(req.NewEncryptionKeys.Salt); err != nil {
		return fmt.Errorf("%w: %s", model.ErrBadRequest, err.Error())
	}

	_, err = s.screenplayRepo.UpsertUserEncryptionKeys(ctx, id, req.NewEncryptionKeys)
	if err != nil {
		return err
	}

	if req.NewRecoveryCredential != nil {
		_, err = s.screenplayRepo.UpsertUserRecoveryCredential(ctx, id, *req.NewRecoveryCredential)
		if err != nil {
			return err
		}
	}

	return nil
}
