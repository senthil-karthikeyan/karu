package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/model"
	"backend/sqlc/generated"
)

type AuthIdentityRepository interface {
	Create(ctx context.Context, userID uuid.UUID, provider, providerUserID, passwordHash string) (*generated.AuthIdentity, error)
	GetByProvider(ctx context.Context, provider, providerUserID string) (*generated.AuthIdentity, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]generated.AuthIdentity, error)
	UpdatePassword(ctx context.Context, userID uuid.UUID, provider, passwordHash string) (*generated.AuthIdentity, error)
}

type authIdentityRepository struct {
	queries *generated.Queries
	pool    *pgxpool.Pool
}

func NewAuthIdentityRepository(pool *pgxpool.Pool) AuthIdentityRepository {
	return &authIdentityRepository{
		queries: generated.New(pool),
		pool:    pool,
	}
}

func (r *authIdentityRepository) Create(ctx context.Context, userID uuid.UUID, provider, providerUserID, passwordHash string) (*generated.AuthIdentity, error) {
	identity, err := r.queries.CreateAuthIdentity(ctx, generated.CreateAuthIdentityParams{
		UserID:         uuidToPgtype(userID),
		Provider:       provider,
		ProviderUserID: providerUserID,
		PasswordHash:   passwordHash,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, model.ErrConflict
		}
		return nil, err
	}
	return &identity, nil
}

func (r *authIdentityRepository) GetByProvider(ctx context.Context, provider, providerUserID string) (*generated.AuthIdentity, error) {
	identity, err := r.queries.GetAuthIdentityByProvider(ctx, generated.GetAuthIdentityByProviderParams{
		Provider:       provider,
		ProviderUserID: providerUserID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &identity, nil
}

func (r *authIdentityRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]generated.AuthIdentity, error) {
	return r.queries.GetAuthIdentitiesByUserID(ctx, uuidToPgtype(userID))
}

func (r *authIdentityRepository) UpdatePassword(ctx context.Context, userID uuid.UUID, provider, passwordHash string) (*generated.AuthIdentity, error) {
	identity, err := r.queries.UpdateAuthIdentityPassword(ctx, generated.UpdateAuthIdentityPasswordParams{
		UserID:       uuidToPgtype(userID),
		Provider:     provider,
		PasswordHash: passwordHash,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound
		}
		return nil, err
	}
	return &identity, nil
}
