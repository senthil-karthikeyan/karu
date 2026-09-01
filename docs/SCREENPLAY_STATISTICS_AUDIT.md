# Karu — Screenplay Statistics Architecture Reference Audit

**Date:** September 2026  
**Status:** Audit Complete — Phase 1  

---

## 1. Executive Summary

This audit identifies all active references to screenplay-specific statistics (`word_count`, `page_count`, `scene_count`) and legacy scene pointers (`last_edited_scene`) across the Karu codebase and database.

### Target Architecture

```text
Project (Organizes screenplays & holds film metadata)
  ├── title, genre, format, logline, synopsis, status, cover_image
  └── created_at, updated_at

Screenplays (Owns screenplay draft & specific statistics)
  ├── title, description, is_default, sort_order
  ├── word_count, page_count, scene_count
  ├── created_at, updated_at
  │
  ├── screenplay_contents (Encrypted TipTap JSON AST ciphertext)
  ├── screenplay_keys (Wrapped SCK)
  └── screenplay_versions (Encrypted milestone snapshots)
```

---

## 2. Database Schema Audit

### Current `projects` Table
| Column | Type | Target Action |
|---|---|---|
| `id` | `uuid` | Retain (PK) |
| `user_id` | `uuid` | Retain (FK) |
| `title` | `varchar` | Retain |
| `logline` | `text` | Retain |
| `genre` | `varchar` | Retain |
| `format` | `varchar` | Retain |
| `status` | `varchar` | Retain |
| `synopsis` | `text` | Retain |
| `cover_image` | `text` | Retain |
| `page_count` | `int` | **DROP from projects** (Move to screenplays) |
| `word_count` | `int` | **DROP from projects** (Move to screenplays) |
| `scene_count` | `int` | **DROP from projects** (Move to screenplays) |
| `last_edited_scene` | `varchar` | **DROP completely** |
| `created_at` | `timestamptz` | Retain |
| `updated_at` | `timestamptz` | Retain |

### Current `screenplays` Table
| Column | Type | Target Action |
|---|---|---|
| `id` | `uuid` | Retain (PK) |
| `project_id` | `uuid` | Retain (FK) |
| `title` | `varchar` | Retain |
| `description` | `text` | Retain |
| `is_default` | `boolean` | Retain |
| `sort_order` | `int` | Retain |
| `word_count` | `int` | **ADD (NOT NULL DEFAULT 0)** |
| `page_count` | `int` | **ADD (NOT NULL DEFAULT 0)** |
| `scene_count` | `int` | **ADD (NOT NULL DEFAULT 0)** |
| `created_at` | `timestamptz` | Retain |
| `updated_at` | `timestamptz` | Retain |

---

## 3. Backend Code Audit

1. **SQL Queries (`backend/db/queries/`):**
   - `projects.sql`: Remove `page_count`, `word_count`, `scene_count`, `last_edited_scene` from `CreateProject`, `GetProjectByID`, `GetProjectByIDAndUserID`, `ListProjectsByUserID`, `UpdateProject`.
   - `screenplays.sql`: Add `word_count`, `page_count`, `scene_count` to `CreateScreenplay`, `GetScreenplayByID`, `GetScreenplayByIDAndUserID`, `GetDefaultScreenplayByProjectID`, `ListScreenplaysByProjectID`, `UpdateScreenplay`.
2. **Repository & Service Layers (`backend/internal/`):**
   - `model/project.go`: Remove `PageCount`, `WordCount`, `SceneCount`, `LastEditedScene` from `ProjectResponse` and `UpdateProjectRequest`.
   - `model/screenplay.go`: Add `WordCount`, `PageCount`, `SceneCount` to `ScreenplayResponse`, `ScreenplayDetailResponse`, `CreateScreenplayRequest`, `UpdateScreenplayRequest`, and `SaveContentRequest`.
   - `service/screenplay_service.go`: Update `SaveContent` to atomically persist `word_count`, `page_count`, and `scene_count` onto the `screenplays` record during autosave.
   - `repository/screenplay_repository.go`: Update sqlc mappings and query executions to pass statistics.
3. **Tests (`backend/internal/service/`):**
   - Update mocks and assertions to verify that `screenplays` stores and returns statistics, while `projects` returns clean film metadata only.

---

## 4. Frontend Code Audit

1. **TypeScript Types (`frontend/src/types/screenplay.ts`):**
   - Move `stats` (`wordCount`, `pageCount`, `sceneCount`) to `Screenplay` interface.
   - Remove `lastEditedScene` from `Project` and `ProjectDetail`.
2. **Editor Calculation & Autosave (`frontend/src/components/editor/screenplay-editor.tsx`):**
   - Word count: Derived from `currentEditor.getText()`.
   - Scene count: Derived from count of `sceneHeading` nodes in TipTap AST.
   - Page count: Derived from `computePaginationDecorations` extension via `onPageCountChange`.
   - Send statistics directly in `screenplaysApi.saveEncryptedContent` / `saveContent`.
   - Remove legacy `updateProjectMutation` for `lastEditedScene`.
3. **UI Components & Pages:**
   - `project-overview.tsx` & `export-modal.tsx`: Display statistics from the active/default screenplay.
   - `dashboard/page.tsx`, `projects/[id]/page.tsx`, `projects/[id]/editor/page.tsx`, `projects/[id]/preview/page.tsx`: Clean up `lastEditedScene`.

---

## 5. Security & Zero-Knowledge Verification

- Plaintext screenplay text is never sent to the backend.
- Statistics are computed locally on the client from the decrypted TipTap AST.
- Only aggregate integers (`word_count`, `page_count`, `scene_count`) are transmitted with the encrypted ciphertext and stored in `screenplays`.
