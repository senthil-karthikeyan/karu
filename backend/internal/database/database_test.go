package database

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"runtime"
	"strconv"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"backend/internal/config"
	"backend/internal/model"
	"backend/internal/repository"
)

var (
	testDBService Service
	testCfg       config.DatabaseConfig
)

func getMigrationsDir() string {
	_, b, _, _ := runtime.Caller(0)
	basepath := filepath.Dir(b)
	return filepath.Join(basepath, "..", "..", "db", "migrations")
}

func mustStartPostgresContainer() (func(context.Context, ...testcontainers.TerminateOption) error, error) {
	var (
		dbName = "karu_test"
		dbPwd  = "testpass123"
		dbUser = "karu_user"
	)

	ctx := context.Background()

	dbContainer, err := postgres.Run(
		ctx,
		"postgres:16-alpine",
		postgres.WithDatabase(dbName),
		postgres.WithUsername(dbUser),
		postgres.WithPassword(dbPwd),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second)),
	)
	if err != nil {
		return nil, err
	}

	connURL, err := dbContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		dbHost, hErr := dbContainer.Host(ctx)
		if hErr != nil {
			return dbContainer.Terminate, hErr
		}
		dbPort, pErr := dbContainer.MappedPort(ctx, "5432/tcp")
		if pErr != nil {
			return dbContainer.Terminate, pErr
		}
		portInt, _ := strconv.Atoi(dbPort.Port())
		connURL = fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable", dbUser, dbPwd, dbHost, portInt, dbName)
	}

	testCfg = config.DatabaseConfig{
		URL:             connURL,
		MaxConns:        10,
		MinConns:        2,
		MaxConnLifetime: 10 * time.Minute,
		MaxConnIdleTime: 5 * time.Minute,
		ConnectTimeout:  10 * time.Second,
	}

	// Apply migrations using DATABASE_URL
	migrationsPath := getMigrationsDir()
	log.Printf("Applying migrations from %s to %s", migrationsPath, testCfg.ConnectionString())

	if err := RunMigrations(testCfg.ConnectionString(), migrationsPath); err != nil {
		return dbContainer.Terminate, fmt.Errorf("migration error: %w", err)
	}

	testDBService, err = New(testCfg)
	if err != nil {
		return dbContainer.Terminate, fmt.Errorf("failed to init db service: %w", err)
	}

	return dbContainer.Terminate, nil
}

func TestMain(m *testing.M) {
	teardown, err := mustStartPostgresContainer()
	if err != nil {
		log.Printf("Skipping postgres container tests if Docker unavailable: %v", err)
		return
	}

	code := m.Run()

	if testDBService != nil {
		testDBService.Close()
	}

	if teardown != nil {
		_ = teardown(context.Background())
	}

	if code != 0 {
		log.Fatalf("Tests failed with code %d", code)
	}
}

func TestDBServiceHealthAndReady(t *testing.T) {
	if testDBService == nil {
		t.Skip("Postgres container not running")
	}

	ctx := context.Background()

	// Ready check
	if err := testDBService.Ready(ctx); err != nil {
		t.Fatalf("Expected database to be ready, got error: %v", err)
	}

	// Health check
	stats := testDBService.Health(ctx)
	if stats["status"] != "up" {
		t.Fatalf("Expected status to be up, got: %s", stats["status"])
	}
	if stats["message"] != "It's healthy" {
		t.Fatalf("Expected message 'It's healthy', got: %s", stats["message"])
	}
	if stats["total_connections"] == "" {
		t.Fatalf("Expected total_connections to be reported")
	}
}

func TestDatabaseTransactions(t *testing.T) {
	if testDBService == nil {
		t.Skip("Postgres container not running")
	}

	ctx := context.Background()

	// Successful transaction
	err := testDBService.WithTx(ctx, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, "CREATE TEMP TABLE tx_test (id INT PRIMARY KEY);")
		return err
	})
	if err != nil {
		t.Fatalf("Expected successful transaction, got: %v", err)
	}

	// Rollback transaction on error
	err = testDBService.WithTx(ctx, func(tx pgx.Tx) error {
		_, _ = tx.Exec(ctx, "CREATE TEMP TABLE tx_fail (id INT);")
		return fmt.Errorf("forced transaction failure")
	})
	if err == nil {
		t.Fatalf("Expected transaction to fail and return error")
	}
}

func TestRepositoriesIntegration(t *testing.T) {
	if testDBService == nil {
		t.Skip("Postgres container not running")
	}

	ctx := context.Background()
	pool := testDBService.Pool()

	userRepo := repository.NewUserRepository(pool)
	authIdentityRepo := repository.NewAuthIdentityRepository(pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(pool)
	projectRepo := repository.NewProjectRepository(pool)
	screenplayRepo := repository.NewScreenplayRepository(pool)

	// 1. Create User
	email := fmt.Sprintf("writer-%s@karu.app", uuid.New().String()[:8])
	user, err := userRepo.Create(ctx, email, "hashed_pw", "Test Writer", "https://karu.app/avatar.png", "Screenwriter bio", model.DefaultPreferences())
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// 2. Multi-Provider Auth Identity (Email & Google)
	_, err = authIdentityRepo.Create(ctx, user.ID, "email", email, "hashed_pw")
	if err != nil {
		t.Fatalf("Failed to create email auth identity: %v", err)
	}

	googleUID := fmt.Sprintf("google-uid-%s", uuid.New().String()[:8])
	_, err = authIdentityRepo.Create(ctx, user.ID, "google", googleUID, "")
	if err != nil {
		t.Fatalf("Failed to create google auth identity: %v", err)
	}

	identities, err := authIdentityRepo.GetByUserID(ctx, user.ID)
	if err != nil || len(identities) != 2 {
		t.Fatalf("Expected 2 identities for user, got %d (err: %v)", len(identities), err)
	}

	// 3. Refresh Tokens & Revocation
	tokenHash := "mock-token-hash-12345"
	_, err = refreshTokenRepo.Create(ctx, user.ID, tokenHash, time.Now().Add(7*24*time.Hour))
	if err != nil {
		t.Fatalf("Failed to create refresh token: %v", err)
	}
	foundRT, err := refreshTokenRepo.GetByHash(ctx, tokenHash)
	if err != nil || foundRT.TokenHash != tokenHash {
		t.Fatalf("Failed to find refresh token by hash: %v", err)
	}

	if err := refreshTokenRepo.Revoke(ctx, tokenHash); err != nil {
		t.Fatalf("Failed to revoke refresh token: %v", err)
	}

	revokedRT, _ := refreshTokenRepo.GetByHash(ctx, tokenHash)
	if !revokedRT.RevokedAt.Valid {
		t.Fatalf("Expected refresh token to be marked as revoked")
	}

	// 4. Create Project
	proj, err := projectRepo.Create(ctx, user.ID, model.CreateProjectRequest{
		Title:    "The Quantum Paradox",
		Logline:  "A scientist discovers parallel timelines.",
		Genre:    "Sci-Fi",
		Format:   "Feature Film",
		Status:   "In Progress",
		Synopsis: "Detailed screenplay synopsis.",
	})
	if err != nil {
		t.Fatalf("Failed to create project: %v", err)
	}

	// 5. Screenplay Creation & Initial Content
	screenplay, err := screenplayRepo.CreateScreenplay(ctx, proj.ID, "Draft 1", "Initial draft", "<p>Scene 1</p>", nil, nil, user.ID, 0, 0, 0)
	if err != nil {
		t.Fatalf("Failed to create screenplay: %v", err)
	}
	if screenplay.Revision != 1 {
		t.Errorf("Expected initial revision 1, got %d", screenplay.Revision)
	}

	// 6. Optimistic Concurrency Autosave
	updatedContent, err := screenplayRepo.SaveContentWithRevision(ctx, screenplay.ID, "<p>Scene 1: Added dialogue</p>", 1)
	if err != nil {
		t.Fatalf("Autosave with matching revision failed: %v", err)
	}
	if updatedContent.Revision != 2 {
		t.Errorf("Expected revision 2, got %d", updatedContent.Revision)
	}

	// Outdated revision -> Conflict
	_, err = screenplayRepo.SaveContentWithRevision(ctx, screenplay.ID, "<p>Stale update</p>", 1)
	if err != model.ErrRevisionConflict {
		t.Errorf("Expected ErrRevisionConflict for stale revision, got %v", err)
	}

	// 7. Version Checkpoint & Transactional Restore
	version1, err := screenplayRepo.CreateVersion(ctx, screenplay.ID, "Version 1 Checkpoint", updatedContent.Content.(string), nil, &user.ID)
	if err != nil {
		t.Fatalf("Failed to create version: %v", err)
	}
	if version1.VersionNumber != 1 {
		t.Errorf("Expected version number 1, got %d", version1.VersionNumber)
	}

	// Update content further
	_, _ = screenplayRepo.SaveContentWithRevision(ctx, screenplay.ID, "<p>Draft with changes</p>", 2)

	// Restore version 1
	restored, err := screenplayRepo.RestoreVersion(ctx, screenplay.ID, version1.ID, user.ID)
	if err != nil {
		t.Fatalf("Failed to restore version: %v", err)
	}
	if restored.RestoredFromID != version1.ID {
		t.Errorf("Expected restoredFromID %v, got %v", version1.ID, restored.RestoredFromID)
	}
	if restored.Content != updatedContent.Content {
		t.Errorf("Expected restored content to match version 1 content")
	}

	// 8. Multi-tenant Cross-user Ownership Isolation
	otherUserID := uuid.New()
	_, err = screenplayRepo.GetScreenplayWithOwnership(ctx, screenplay.ID, otherUserID)
	if err != model.ErrNotFound {
		t.Errorf("Expected ErrNotFound when querying screenplay with different user ID, got %v", err)
	}
}
