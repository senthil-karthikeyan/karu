package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const dbURL = "postgresql://postgres:OIPxL6Fz8DQFkI7Q@db.anvostqjwfyzbuctfutb.supabase.co:5432/postgres"

func main() {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(ctx)

	fmt.Println("=== 1. Verify 'projects' schema has NO statistics columns ===")
	rows, err := conn.Query(ctx, `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_name = 'projects' 
		  AND column_name IN ('word_count', 'page_count', 'scene_count', 'last_edited_scene');
	`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query failed: %v\n", err)
		os.Exit(1)
	}
	var forbiddenCols []string
	for rows.Next() {
		var col string
		_ = rows.Scan(&col)
		forbiddenCols = append(forbiddenCols, col)
	}
	rows.Close()

	if len(forbiddenCols) > 0 {
		fmt.Fprintf(os.Stderr, "ERROR: Found forbidden columns in projects: %v\n", forbiddenCols)
		os.Exit(1)
	}
	fmt.Println("SUCCESS: 'projects' contains ZERO statistics or last_edited_scene columns!")

	fmt.Println("\n=== 2. Verify 'screenplays' schema has statistics columns ===")
	rows, err = conn.Query(ctx, `
		SELECT column_name, data_type, column_default 
		FROM information_schema.columns 
		WHERE table_name = 'screenplays' 
		  AND column_name IN ('word_count', 'page_count', 'scene_count')
		ORDER BY column_name;
	`)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Query failed: %v\n", err)
		os.Exit(1)
	}
	statsColsCount := 0
	for rows.Next() {
		var col, dtype string
		var defVal *string
		_ = rows.Scan(&col, &dtype, &defVal)
		statsColsCount++
		fmt.Printf(" - %s (%s, default: %v)\n", col, dtype, defVal)
	}
	rows.Close()

	if statsColsCount != 3 {
		fmt.Fprintf(os.Stderr, "ERROR: Expected 3 stats columns in screenplays, found %d\n", statsColsCount)
		os.Exit(1)
	}
	fmt.Println("SUCCESS: 'screenplays' table contains all 3 statistics columns!")

	fmt.Println("\n=== 3. Live End-to-End Project & Multi-Screenplay Statistics Flow ===")
	// Find or create test user
	var userID uuid.UUID
	err = conn.QueryRow(ctx, "SELECT id FROM users LIMIT 1").Scan(&userID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get user: %v\n", err)
		os.Exit(1)
	}

	// 1. Create Project
	var projectID uuid.UUID
	var title, genre, format string
	err = conn.QueryRow(ctx, `
		INSERT INTO projects (user_id, title, genre, format, logline, synopsis)
		VALUES ($1, 'Live Stats Test Project', 'Drama', 'Feature Film', 'Test logline', 'Test synopsis')
		RETURNING id, title, genre, format;
	`, userID).Scan(&projectID, &title, &genre, &format)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create test project: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Created test project: %s (%s, %s)\n", title, projectID, format)

	// 2. Create Screenplay 1
	var sp1ID uuid.UUID
	var sp1Words, sp1Pages, sp1Scenes int
	err = conn.QueryRow(ctx, `
		INSERT INTO screenplays (project_id, title, description, is_default, sort_order, word_count, page_count, scene_count)
		VALUES ($1, 'Main Draft', 'Default screenplay', TRUE, 1, 0, 0, 0)
		RETURNING id, word_count, page_count, scene_count;
	`, projectID).Scan(&sp1ID, &sp1Words, &sp1Pages, &sp1Scenes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create screenplay 1: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Created Screenplay 1: %s (initial stats: %d words, %d pages, %d scenes)\n", sp1ID, sp1Words, sp1Pages, sp1Scenes)

	// 3. Create Screenplay 2
	var sp2ID uuid.UUID
	var sp2Words, sp2Pages, sp2Scenes int
	err = conn.QueryRow(ctx, `
		INSERT INTO screenplays (project_id, title, description, is_default, sort_order, word_count, page_count, scene_count)
		VALUES ($1, 'Director Cut', 'Alternative cut', FALSE, 2, 0, 0, 0)
		RETURNING id, word_count, page_count, scene_count;
	`, projectID).Scan(&sp2ID, &sp2Words, &sp2Pages, &sp2Scenes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create screenplay 2: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Created Screenplay 2: %s (initial stats: %d words, %d pages, %d scenes)\n", sp2ID, sp2Words, sp2Pages, sp2Scenes)

	// 4. Update stats on Screenplay 1 (e.g. 15000 words, 60 pages, 35 scenes)
	err = conn.QueryRow(ctx, `
		UPDATE screenplays
		SET word_count = 15000, page_count = 60, scene_count = 35, updated_at = NOW()
		WHERE id = $1
		RETURNING word_count, page_count, scene_count;
	`, sp1ID).Scan(&sp1Words, &sp1Pages, &sp1Scenes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to update screenplay 1 stats: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Updated Screenplay 1 stats: %d words, %d pages, %d scenes\n", sp1Words, sp1Pages, sp1Scenes)

	// 5. Verify Screenplay 2 remains unchanged
	err = conn.QueryRow(ctx, `
		SELECT word_count, page_count, scene_count
		FROM screenplays
		WHERE id = $1;
	`, sp2ID).Scan(&sp2Words, &sp2Pages, &sp2Scenes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to check screenplay 2 stats: %v\n", err)
		os.Exit(1)
	}
	if sp2Words != 0 || sp2Pages != 0 || sp2Scenes != 0 {
		fmt.Fprintf(os.Stderr, "ERROR: Screenplay 2 stats mutated unexpectedly: %d, %d, %d\n", sp2Words, sp2Pages, sp2Scenes)
		os.Exit(1)
	}
	fmt.Printf("Verified Screenplay 2 stats isolation: %d words, %d pages, %d scenes\n", sp2Words, sp2Pages, sp2Scenes)

	// 6. Clean up test project and cascaded screenplays
	_, err = conn.Exec(ctx, "DELETE FROM projects WHERE id = $1", projectID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Warning: cleanup failed: %v\n", err)
	} else {
		fmt.Println("Cleaned up test project and screenplays successfully.")
	}

	fmt.Println("\n🎉 LIVE DATABASE VERIFICATION COMPLETED SUCCESSFULLY!")
}
