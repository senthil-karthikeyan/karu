package database

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"backend/internal/config"
)

// Service represents the database connection pool management service.
type Service interface {
	// Pool returns the underlying pgxpool.Pool.
	Pool() *pgxpool.Pool

	// Health returns a map containing health statistics for the connection pool.
	Health(ctx context.Context) map[string]string

	// Ready performs a live ping to verify database connectivity.
	Ready(ctx context.Context) error

	// Close gracefully terminates all connections in the pool.
	Close()

	// WithTx executes a function within a database transaction.
	WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error
}

type service struct {
	pool *pgxpool.Pool
	cfg  config.DatabaseConfig
}

// New creates and verifies a new pgxpool connection pool using DATABASE_URL.
func New(cfg config.DatabaseConfig) (Service, error) {
	connStr := cfg.ConnectionString()
	if connStr == "" {
		return nil, fmt.Errorf("DATABASE_URL is not configured")
	}

	poolConfig, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config from DATABASE_URL: %w", err)
	}

	if cfg.MaxConns > 0 {
		poolConfig.MaxConns = cfg.MaxConns
	}
	if cfg.MinConns > 0 {
		poolConfig.MinConns = cfg.MinConns
	}
	if cfg.MaxConnLifetime > 0 {
		poolConfig.MaxConnLifetime = cfg.MaxConnLifetime
	}
	if cfg.MaxConnIdleTime > 0 {
		poolConfig.MaxConnIdleTime = cfg.MaxConnIdleTime
	}
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	timeout := cfg.ConnectTimeout
	if timeout <= 0 {
		timeout = 10 * time.Second
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify database connection at startup
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return &service{
		pool: pool,
		cfg:  cfg,
	}, nil
}

func (s *service) Pool() *pgxpool.Pool {
	return s.pool
}

// Ready pings the database with the given context.
func (s *service) Ready(ctx context.Context) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}
	return s.pool.Ping(ctx)
}

// Health checks the health and returns statistics about the connection pool.
func (s *service) Health(ctx context.Context) map[string]string {
	stats := make(map[string]string)

	if s.pool == nil {
		stats["status"] = "down"
		stats["error"] = "pool not initialized"
		return stats
	}

	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	if err := s.pool.Ping(pingCtx); err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db down: %v", err)
		return stats
	}

	stats["status"] = "up"
	stats["message"] = "It's healthy"

	poolStat := s.pool.Stat()
	stats["total_connections"] = strconv.Itoa(int(poolStat.TotalConns()))
	stats["acquired_connections"] = strconv.Itoa(int(poolStat.AcquiredConns()))
	stats["idle_connections"] = strconv.Itoa(int(poolStat.IdleConns()))
	stats["max_connections"] = strconv.Itoa(int(poolStat.MaxConns()))
	stats["acquire_count"] = strconv.FormatInt(poolStat.AcquireCount(), 10)
	stats["acquire_duration"] = poolStat.AcquireDuration().String()

	if poolStat.TotalConns() >= poolStat.MaxConns() && poolStat.MaxConns() > 0 {
		stats["message"] = "The database connection pool has reached max connections."
	}

	return stats
}

// Close gracefully closes all database connections.
func (s *service) Close() {
	if s.pool != nil {
		log.Println("Closing database connection pool")
		s.pool.Close()
	}
}

// WithTx runs the provided function inside a database transaction.
func (s *service) WithTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("unable to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil && rbErr != pgx.ErrTxClosed {
			return fmt.Errorf("error in tx (%w) and rollback failed: %v", err, rbErr)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("unable to commit transaction: %w", err)
	}

	return nil
}
