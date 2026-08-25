package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
	"backend/sqlc/generated"
)

func uuidToPgtype(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func pgtypeToUUID(pgID pgtype.UUID) uuid.UUID {
	if !pgID.Valid {
		return uuid.Nil
	}
	return uuid.UUID(pgID.Bytes)
}

func pgtypeToTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

type UserRepository interface {
	Create(ctx context.Context, email, passwordHash, name, avatarURL, bio string, preferences model.UserPreferences) (*model.UserResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.UserResponse, error)
	GetByEmail(ctx context.Context, email string) (*generated.User, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, name, avatarURL, bio string, preferences *model.UserPreferences) (*model.UserResponse, error)
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
}

type userRepository struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &userRepository{
		queries: generated.New(pool),
		pool:    pool,
	}
}

func (r *userRepository) Create(ctx context.Context, email, passwordHash, name, avatarURL, bio string, preferences model.UserPreferences) (*model.UserResponse, error) {
	prefBytes, err := json.Marshal(preferences)
	if err != nil {
		return nil, err
	}

	row, err := r.queries.CreateUser(ctx, generated.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		Name:         name,
		AvatarUrl:    avatarURL,
		Bio:          bio,
		Preferences:  prefBytes,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, model.ErrEmailAlreadyExists
		}
		return nil, err
	}

	var parsedPrefs model.UserPreferences
	_ = json.Unmarshal(row.Preferences, &parsedPrefs)

	return &model.UserResponse{
		ID:          pgtypeToUUID(row.ID),
		Email:       row.Email,
		Name:        row.Name,
		AvatarURL:   row.AvatarUrl,
		Bio:         row.Bio,
		Preferences: parsedPrefs,
		CreatedAt:   pgtypeToTime(row.CreatedAt),
		UpdatedAt:   pgtypeToTime(row.UpdatedAt),
	}, nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.UserResponse, error) {
	row, err := r.queries.GetUserByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	var parsedPrefs model.UserPreferences
	_ = json.Unmarshal(row.Preferences, &parsedPrefs)

	return &model.UserResponse{
		ID:          pgtypeToUUID(row.ID),
		Email:       row.Email,
		Name:        row.Name,
		AvatarURL:   row.AvatarUrl,
		Bio:         row.Bio,
		Preferences: parsedPrefs,
		CreatedAt:   pgtypeToTime(row.CreatedAt),
		UpdatedAt:   pgtypeToTime(row.UpdatedAt),
	}, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*generated.User, error) {
	user, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) UpdateProfile(ctx context.Context, id uuid.UUID, name, avatarURL, bio string, preferences *model.UserPreferences) (*model.UserResponse, error) {
	var prefBytes []byte
	if preferences != nil {
		var err error
		prefBytes, err = json.Marshal(preferences)
		if err != nil {
			return nil, err
		}
	}

	row, err := r.queries.UpdateUserProfile(ctx, generated.UpdateUserProfileParams{
		ID:          uuidToPgtype(id),
		Column2:     name,
		Column3:     avatarURL,
		Column4:     bio,
		Preferences: prefBytes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}

	var parsedPrefs model.UserPreferences
	_ = json.Unmarshal(row.Preferences, &parsedPrefs)

	return &model.UserResponse{
		ID:          pgtypeToUUID(row.ID),
		Email:       row.Email,
		Name:        row.Name,
		AvatarURL:   row.AvatarUrl,
		Bio:         row.Bio,
		Preferences: parsedPrefs,
		CreatedAt:   pgtypeToTime(row.CreatedAt),
		UpdatedAt:   pgtypeToTime(row.UpdatedAt),
	}, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	_, err := r.queries.UpdateUserPassword(ctx, generated.UpdateUserPasswordParams{
		ID:           uuidToPgtype(id),
		PasswordHash: passwordHash,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return model.ErrNotFound
		}
		return err
	}
	return nil
}
