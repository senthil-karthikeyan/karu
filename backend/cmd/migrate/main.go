package main

import (
	"fmt"
	"log"

	"backend/internal/database"
)

const dbURL = "postgresql://postgres:OIPxL6Fz8DQFkI7Q@db.anvostqjwfyzbuctfutb.supabase.co:5432/postgres"

func main() {
	fmt.Println("Applying database migrations...")
	err := database.RunMigrations(dbURL, "db/migrations")
	if err != nil {
		log.Fatalf("RunMigrations failed: %v", err)
	}
	fmt.Println("Database migrations applied successfully!")
}
