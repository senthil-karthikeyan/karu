# Legacy Screenplay Architecture Cleanup Audit

## Executive Summary

This document presents a comprehensive, evidence-based audit of all legacy screenplay storage, encryption (PEK), and scene metadata references across the Karu codebase.

Following the successful implementation of the **Unified Screenplay Architecture** and **Simplified 2-Tier E2EE**, the legacy dual-storage architecture (`projects.screenplay_content`, `project_keys`, `scenes` table, and project-level screenplay APIs) is ready for safe, systematic removal.

---

## 1. Summary of Legacy Components Audited

| Legacy Component | References Found | Currently Active / Used? | Replacement Canonical Architecture |
| :--- | :---: | :---: | :--- |
| **`projects.screenplay_content`** | 23 files | **Deprecated / Fallback Only** | Dedicated `screenplay_contents` table (with `revision`, `ciphertext`, `iv`) accessed via `GET/PUT /api/v1/screenplays/:id/content` |
| **`project_keys` (PEK)** | 19 files | **Deprecated / Redundant** | Direct 2-Tier E2EE (`User Secret` $\to$ `UEK` in-memory $\to$ `SCK` wrapped by UEK in `screenplay_keys`) |
| **`scenes` Table & Endpoints** | 16 files | **Unused by Editor & UI** | Client-side ProseMirror AST parsing (`sceneHeading` nodes) for `SceneNavigator` with Zero-Knowledge E2EE |
| **Project screenplay PATCH** | 6 files | **Fallback Only** | Dedicated Screenplay Content API (`PUT /api/v1/screenplays/:id/content`) with optimistic concurrency control |
| **PEK Crypto Utilities** | 8 files | **Deprecated** | Direct UEK $\to$ SCK wrapping (`wrapScreenplayContentKeyWithUEK`, `unwrapScreenplayContentKeyWithUEK`) |

---

## 2. Detailed Reference Breakdown

### A. `projects.screenplay_content`

| File | Function / Location | Purpose | Type | Can be Safely Removed? | Replacement |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `backend/db/queries/projects.sql` | `CreateProject`, `UpdateProjectContent` | Storing screenplay content directly in `projects` row | Read/Write | Yes | `screenplay_contents` table via `screenplay_contents.sql` |
| `backend/internal/model/project.go` | `ProjectDetailResponse`, `UpdateProjectRequest` | Exposing `ScreenplayContent` field in project DTOs | DTO | Yes | `ScreenplayDetailResponse` in `model/screenplay.go` |
| `backend/internal/repository/project_repository.go` | `UpdateContent` | Updating project content & word counts | Write | Yes | `SaveContentWithRevision` in `screenplay_repository.go` |
| `backend/internal/service/project_service.go` | `GetProject`, `UpdateProject` | Legacy fallback reading & syncing canonical content | Read/Write | Yes | Dedicated `ScreenplayService` endpoints |
| `frontend/src/types/screenplay.ts` | `Project.screenplayContent` | TypeScript interface field | Type | Yes | `ScreenplayDetailResponse.content` in `api/screenplays.ts` |
| `frontend/src/lib/api/projects.ts` | `ProjectDetailResponse`, `UpdateProjectRequest` | Project API DTOs | Type | Yes | `screenplaysApi` |
| `frontend/src/components/preview/screenplay-preview-view.tsx` | `effectiveHtml`, `parsedPayload` | Reading project screenplay content for preview | Read | Yes | Load via `screenplaysApi.getDefaultScreenplay(project.id)` |
| `frontend/src/lib/export-utils.ts` | `exportScreenplay`, `htmlToFountain`, `htmlToPlainText` | Reading project screenplay content for export | Read | Yes | Pass explicit screenplay content string / AST |
| `frontend/src/components/crypto/legacy-migration-card.tsx` | `handleMigrateAll` | UI migration card for old projects | Write | Yes | Remove or simplify as all DB rows are migrated |

---

### B. `project_keys` (Project Encryption Keys - PEK)

| File | Function / Location | Purpose | Type | Can be Safely Removed? | Replacement |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `backend/db/queries/project_keys.sql` | `GetProjectKey`, `UpsertProjectKey`, `DeleteProjectKey` | SQL queries for `project_keys` table | Read/Write | Yes | `screenplay_keys.sql` |
| `backend/internal/repository/project_repository.go` | `GetProjectKey`, `UpsertProjectKey`, `DeleteProjectKey` | Repo methods for PEK | Read/Write | Yes | `screenplay_repository.go` (`GetScreenplayKey`, `UpsertScreenplayKey`) |
| `backend/internal/service/project_service.go` | `GetProjectKey`, `SetProjectKey` | Service methods for PEK | Read/Write | Yes | `screenplay_service.go` |
| `backend/internal/handler/project_handler.go` | `GetProjectKey`, `SetProjectKey` | HTTP endpoints for `GET/POST /projects/:id/key` | Handler | Yes | `GET/POST /screenplays/:id/key` |
| `backend/internal/router/router.go` | `projects.GET("/:id/key")`, `projects.POST("/:id/key")` | Router definitions | Route | Yes | Removed; use `/screenplays/:id/key` |
| `frontend/src/lib/api/projects.ts` | `getProjectKey`, `setProjectKey` | API client methods | API | Yes | `screenplaysApi.getScreenplayKey`, `setScreenplayKey` |
| `frontend/src/stores/encryption-store.ts` | `projectKeys`, `createAndWrapProjectKey`, `loadAndUnlockProjectKey` | Zustand in-memory PEK state | State | Yes | `screenplayKeys`, `createAndWrapScreenplayKey`, `loadAndUnlockScreenplayKey` |
| `frontend/src/lib/crypto/key-manager.ts` | `generateProjectEncryptionKey`, `wrapProjectKeyWithUEK`, `unwrapProjectKeyWithUEK`, `wrapScreenplayKeyWithPEK`, `unwrapScreenplayKeyWithPEK` | Cryptographic key wrapping helpers | Helper | Yes | `wrapScreenplayContentKeyWithUEK`, `unwrapScreenplayContentKeyWithUEK` |
| `frontend/src/components/modals/create-project-modal.tsx` | `handleSubmit` (calling `createAndWrapProjectKey`) | Wrapping PEK upon project creation | Write | Yes | Screenplay keys generated on-demand when screenplay created |

---

### C. `scenes` Table & Production Metadata Audit

| File | Function / Location | Purpose | Currently Active? | Decision & Rationale |
| :--- | :--- | :--- | :---: | :--- |
| `backend/db/queries/scenes.sql` | SQL queries for `scenes` table | Relational CRUD for scenes | **No** | Screenplay content is client-side encrypted (AES-256-GCM); server cannot inspect or parse scenes |
| `backend/internal/repository/scene_repository.go` | `SceneRepository` | DB operations for `scenes` table | **No** | Unused by frontend editor and workspace |
| `backend/internal/service/project_service.go` | `CreateScene`, `ListScenes`, `UpdateScene`, `DeleteScene` | Project scene management | **No** | Unused; project stats are computed from screenplay document |
| `backend/internal/handler/project_handler.go` | `ListScenes`, `CreateScene`, `UpdateScene`, `DeleteScene` | Handlers for `/projects/:id/scenes` | **No** | Unused by UI |
| `backend/internal/router/router.go` | `projects.GET/POST/PATCH/DELETE("/:id/scenes")` | Router endpoints | **No** | Can be safely removed |
| `frontend/src/lib/api/scenes.ts` | `scenesApi` | API client for scenes | **No** | Unused by components |
| `frontend/src/hooks/use-projects.ts` | `useScenesQuery`, `useCreateSceneMutation`, etc. | React Query hooks | **No** | 0 UI component usages |
| `frontend/src/components/editor/screenplay-editor.tsx` | `extractScenesFromHtml`, `dynamicScenes` | Editor scene list & navigation | **Yes (Client-Side)** | Parses `sceneHeading` nodes directly from ProseMirror AST in browser; does not use DB table |

#### Scenes Architecture Decision
1. **Screenplay Editing & Navigation**: Purely client-side ProseMirror AST parser (`sceneHeading` nodes) preserves Zero-Knowledge E2EE without sending unencrypted scene text to the server.
2. **Server `scenes` Table**: Completely disconnected from active editor and E2EE flow. It can be safely removed along with its endpoints to eliminate architectural clutter.
3. **Future Production Breakdown**: If structured scene breakdown (call sheets, shoot scheduling, budgeting) is added in the future, it should be designed as a distinct production module that takes parsed client-side export with explicit writer permission.

---

## 3. Safe Step-by-Step Cleanup Implementation Plan

1. **Verify Canonical Flow**: Transactional project creation (`projects` + default `screenplays` + `screenplay_contents`), editor load via `screenplaysApi.getDefaultScreenplay`, autosave via `screenplaysApi.saveEncryptedContent`.
2. **Frontend Legacy Removal**:
   - Clean `Project` DTOs in `types/screenplay.ts` and `api/projects.ts` (remove `screenplayContent`, `scenes`).
   - Refactor `ScreenplayPreviewView` and `ExportModal` to load canonical screenplay content directly.
   - Clean `create-project-modal.tsx` (remove PEK call).
   - Remove unused `scenesApi` and scene hooks in `use-projects.ts`.
3. **Backend Legacy Removal**:
   - Clean `Project` model in `backend/internal/model/project.go`.
   - Remove `UpdateProjectContent` and `screenplay_content` column references in `backend/db/queries/projects.sql`.
   - Remove `SceneRepository`, `scene_repository.go`, `scenes.sql`, scene handlers, and scene routes.
   - Keep project metadata operations (`PATCH /api/v1/projects/:id`) strictly for metadata (`title`, `logline`, `genre`, `format`, `status`, `synopsis`, `coverImage`).
4. **Remove PEK Layer**:
   - Remove `project_keys.sql`, `project_keys.sql.go`, PEK router endpoints, PEK repo/service methods.
   - Remove PEK state and key wrapping methods from `frontend/src/stores/encryption-store.ts` and `key-manager.ts`.
5. **Database Migration Cleanup**:
   - Create migration `000010_remove_legacy_project_screenplay_architecture.up.sql` / `.down.sql`:
     - Drop `screenplay_content` column from `projects`.
     - Drop `project_keys` table.
     - Drop `scenes` table.
     - Enforce `screenplay_keys.screenplay_id REFERENCES screenplays(id) ON DELETE CASCADE`.
6. **Tests & Verification**:
   - Update all test mocks and assertions.
   - Run `go test ./...`, `pnpm build`, and `pnpm test:crypto`.
   - Run browser end-to-end tests.
