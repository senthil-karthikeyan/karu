package database

import (
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func normalizeMigrateURL(dbURL string) string {
	if strings.HasPrefix(dbURL, "postgresql://") {
		return "pgx5://" + strings.TrimPrefix(dbURL, "postgresql://")
	}
	if strings.HasPrefix(dbURL, "postgres://") {
		return "pgx5://" + strings.TrimPrefix(dbURL, "postgres://")
	}
	return dbURL
}

// RunMigrations applies all pending up migrations from the specified migrations path.
func RunMigrations(dbURL string, migrationsPath string) error {
	cleanPath := filepath.ToSlash(filepath.Clean(migrationsPath))
	sourceURL := fmt.Sprintf("file://%s", cleanPath)
	targetURL := normalizeMigrateURL(dbURL)

	m, err := migrate.New(sourceURL, targetURL)
	if err != nil {
		return fmt.Errorf("failed to initialize migrator: %w", err)
	}
	defer func() {
		srcErr, dbErr := m.Close()
		if srcErr != nil {
			log.Printf("migrate source close error: %v", srcErr)
		}
		if dbErr != nil {
			log.Printf("migrate db close error: %v", dbErr)
		}
	}()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("Database migrations: schema is up to date (no change)")
			return nil
		}
		return fmt.Errorf("failed to apply migrations: %w", err)
	}

	log.Println("Database migrations applied successfully")
	return nil
}

// RollbackMigration rolls back the last migration step.
func RollbackMigration(dbURL string, migrationsPath string) error {
	cleanPath := filepath.ToSlash(filepath.Clean(migrationsPath))
	sourceURL := fmt.Sprintf("file://%s", cleanPath)
	targetURL := normalizeMigrateURL(dbURL)

	m, err := migrate.New(sourceURL, targetURL)
	if err != nil {
		return fmt.Errorf("failed to initialize migrator: %w", err)
	}
	defer func() {
		_, _ = m.Close()
	}()

	if err := m.Steps(-1); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			log.Println("Database migrations rollback: no change")
			return nil
		}
		return fmt.Errorf("failed to rollback migration: %w", err)
	}

	log.Println("Database migration rolled back successfully")
	return nil
}
