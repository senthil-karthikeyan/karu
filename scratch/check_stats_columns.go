package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

const dbURL = "postgresql://postgres:OIPxL6Fz8DQFkI7Q@db.anvostqjwfyzbuctfutb.supabase.co:5432/postgres"

func main() {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer pool.Close()

	fmt.Println("=== Columns in 'projects' ===")
	rows, err := pool.Query(ctx, `
		SELECT column_name, data_type, column_default 
		FROM information_schema.columns 
		WHERE table_name = 'projects'
		ORDER BY ordinal_position;
	`)
	if err != nil {
		log.Fatalf("Failed to query projects columns: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var col, dtype string
		var cdef *string
		_ = rows.Scan(&col, &dtype, &cdef)
		defStr := "NULL"
		if cdef != nil {
			defStr = *cdef
		}
		fmt.Printf("projects.%-20s | %-15s | default: %s\n", col, dtype, defStr)
	}

	fmt.Println("\n=== Columns in 'screenplays' ===")
	rows2, err := pool.Query(ctx, `
		SELECT column_name, data_type, column_default 
		FROM information_schema.columns 
		WHERE table_name = 'screenplays'
		ORDER BY ordinal_position;
	`)
	if err != nil {
		log.Fatalf("Failed to query screenplays columns: %v", err)
	}
	defer rows2.Close()
	for rows2.Next() {
		var col, dtype string
		var cdef *string
		_ = rows2.Scan(&col, &dtype, &cdef)
		defStr := "NULL"
		if cdef != nil {
			defStr = *cdef
		}
		fmt.Printf("screenplays.%-20s | %-15s | default: %s\n", col, dtype, defStr)
	}

	fmt.Println("\n=== Current data in 'projects' statistics columns ===")
	var projCount int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects`).Scan(&projCount)
	fmt.Printf("Total projects: %d\n", projCount)

	rows3, _ := pool.Query(ctx, `SELECT id, title, page_count, word_count, scene_count, last_edited_scene FROM projects LIMIT 10`)
	defer rows3.Close()
	for rows3.Next() {
		var id, title, lastEdited string
		var pCount, wCount, sCount int
		_ = rows3.Scan(&id, &title, &pCount, &wCount, &sCount, &lastEdited)
		fmt.Printf("Project: %s | Title: %-25s | pages: %d, words: %d, scenes: %d, lastEdited: '%s'\n", id[:8], title, pCount, wCount, sCount, lastEdited)
	}
}
