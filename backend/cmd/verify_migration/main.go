package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	fmt.Println("==================================================")
	fmt.Println("  Karu E2EE & Screenplay Unified Architecture Audit")
	fmt.Println("==================================================")

	// 1. Projects count
	var projectCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM projects").Scan(&projectCount); err != nil {
		log.Fatalf("Failed to count projects: %v", err)
	}
	fmt.Printf("Total Projects in DB: %d\n", projectCount)

	// 2. Screenplays count
	var screenplayCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM screenplays").Scan(&screenplayCount); err != nil {
		log.Fatalf("Failed to count screenplays: %v", err)
	}
	fmt.Printf("Total Screenplays in DB: %d\n", screenplayCount)

	// 3. Screenplay Contents count
	var contentCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM screenplay_contents").Scan(&contentCount); err != nil {
		log.Fatalf("Failed to count screenplay_contents: %v", err)
	}
	fmt.Printf("Total Screenplay Contents in DB: %d\n", contentCount)

	// 4. Screenplay Keys count
	var keyCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM screenplay_keys").Scan(&keyCount); err != nil {
		log.Fatalf("Failed to count screenplay_keys: %v", err)
	}
	fmt.Printf("Total Screenplay Keys in DB: %d\n", keyCount)

	// 5. Check default screenplay mapping coverage
	var unmappedProjects int
	err = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM projects p 
		WHERE NOT EXISTS (
			SELECT 1 FROM screenplays s WHERE s.project_id = p.id AND s.is_default = true
		)
	`).Scan(&unmappedProjects)
	if err != nil {
		log.Fatalf("Failed to check unmapped projects: %v", err)
	}
	fmt.Printf("Projects without a default screenplay: %d\n", unmappedProjects)

	// 6. Check encrypted vs plaintext content distribution
	var encryptedCount, plaintextCount int
	_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM screenplay_contents WHERE is_encrypted = true").Scan(&encryptedCount)
	_ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM screenplay_contents WHERE is_encrypted = false").Scan(&plaintextCount)
	fmt.Printf("Screenplay Contents Distribution -> Encrypted: %d, Plaintext: %d\n", encryptedCount, plaintextCount)

	fmt.Println("==================================================")
	if unmappedProjects == 0 && screenplayCount >= projectCount {
		fmt.Println("✅ DATABASE INTEGRITY VERIFICATION PASSED (100% Coverage)")
	} else {
		fmt.Println("⚠️ Data disparity found")
	}
	fmt.Println("==================================================")
}
