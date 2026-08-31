package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"backend/internal/auth"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"
)

func main() {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	dbURL := os.Getenv("DATABASE_URL")
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("pool error: %v", err)
	}
	defer pool.Close()

	userRepo := repository.NewUserRepository(pool)
	authIdentityRepo := repository.NewAuthIdentityRepository(pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(pool)
	tokenMgr := auth.NewTokenManager("test_secret_32_bytes_long_value_123", 60*time.Minute, 7*24*time.Hour)

	authSvc := service.NewAuthService(userRepo, authIdentityRepo, refreshTokenRepo, tokenMgr)

	testEmail := fmt.Sprintf("debug.%d@karu.test", os.Getpid())
	resp, err := authSvc.Register(ctx, model.RegisterRequest{
		Name:     "Test User",
		Email:    testEmail,
		Password: "Password123!@#",
	})
	if err != nil {
		fmt.Printf("REGISTER ERROR: %+v\n", err)
	} else {
		fmt.Printf("REGISTER SUCCESS: %+v\n", resp.User.Email)
	}
}
