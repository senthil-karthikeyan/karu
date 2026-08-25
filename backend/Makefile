# Makefile for Karu backend

.PHONY: all build run dev test test-integration itest sqlc migrate-create migrate-up migrate-down migrate-version docker-up docker-down clean fmt lint

DATABASE_URL ?= postgresql://postgres:postgres@localhost:5432/karu?sslmode=disable

all: build test

# Build the application binary
build:
	@echo "Building Karu API..."
	@go build -o main.exe cmd/api/main.go

# Run the application locally
run:
	@go run cmd/api/main.go

# Live reload development server using air
dev:
	@powershell -ExecutionPolicy Bypass -Command "if (Get-Command air -ErrorAction SilentlyContinue) { air } else { Write-Output 'Installing air...'; go install github.com/air-verse/air@latest; air }"

# Run unit tests
test:
	@echo "Running unit tests..."
	@go test ./internal/auth ./internal/service ./internal/handler ./internal/server -v

# Run integration tests (Testcontainers + PostgreSQL)
test-integration:
	@echo "Running integration tests..."
	@go test ./internal/database -v

itest: test-integration

# Generate type-safe SQL code using sqlc
sqlc:
	@echo "Generating sqlc queries..."
	@go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.28.0 generate

# Create a new migration: make migrate-create name=add_feature
migrate-create:
	@powershell -ExecutionPolicy Bypass -Command "if (!(Get-Command migrate -ErrorAction SilentlyContinue)) { go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest }; migrate create -ext sql -dir db/migrations -seq $(name)"

# Apply migrations
migrate-up:
	@powershell -ExecutionPolicy Bypass -Command "if (!(Get-Command migrate -ErrorAction SilentlyContinue)) { go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest }; migrate -path db/migrations -database '$(DATABASE_URL)' up"

# Rollback migrations
migrate-down:
	@powershell -ExecutionPolicy Bypass -Command "if (!(Get-Command migrate -ErrorAction SilentlyContinue)) { go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest }; migrate -path db/migrations -database '$(DATABASE_URL)' down 1"

# Check migration version
migrate-version:
	@powershell -ExecutionPolicy Bypass -Command "if (!(Get-Command migrate -ErrorAction SilentlyContinue)) { go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest }; migrate -path db/migrations -database '$(DATABASE_URL)' version"

# Docker containers
docker-up:
	@docker compose up --build -d

docker-run: docker-up

docker-down:
	@docker compose down

# Code formatting and vetting
fmt:
	@go fmt ./...

lint:
	@go vet ./...

# Clean build artifacts
clean:
	@powershell -ExecutionPolicy Bypass -Command "Remove-Item -Force -ErrorAction SilentlyContinue main.exe, main, tmp"
