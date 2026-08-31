# 🎬 Karu — Unified Screenplay Architecture & Simplified E2EE Migration Plan

---

## 1. Executive Summary & Objective

Karu currently suffers from an **architectural duality** in screenplay storage and an **unnecessarily complex 3-tier key hierarchy**:
1. **Screenplay Storage Duality**:
   - *Legacy Active Layer*: The frontend editor (`ScreenplayEditor`) persists directly to `projects.screenplay_content` via `PATCH /api/v1/projects/:id`.
   - *Relational Multi-Document Layer*: The database schema and backend contain a professional document structure (`screenplays` $\to$ `screenplay_contents` + `screenplay_versions` + `screenplay_keys`), but the primary web UI is not yet routing through it.
2. **E2EE Key Hierarchy Complexity**:
   - The current E2EE system employs a 3-tier chain (`Passphrase` $\to$ `UEK` $\to$ `PEK` $\to$ `SCK` $\to$ `Document`), storing project-level keys in `project_keys`.
   - In a screenwriter workspace, a direct 2-tier model (`Passphrase` $\to$ `UEK` $\to$ `SCK` $\to$ `Document`) is significantly cleaner, faster, less error-prone, and eliminates the redundant `project_keys` layer while preserving zero-knowledge guarantees.

This plan details the zero-downtime, zero-data-loss migration strategy to unify all screenplay content into the canonical relational structure and simplify the E2EE key hierarchy.

---

## 2. Current vs. Target Architecture

### 2.1 Current Architecture (Dual Storage & 3-Tier E2EE)

```text
Database Tables & Usages:
  users (ACTIVE)
    ├── user_encryption_metadata (ACTIVE - 13 rows)
    ├── user_encryption_identities (ACTIVE - 1 row)
    └── projects (ACTIVE - 11 rows)
          ├── project_keys (ACTIVE - 1 row) [PEK Layer]
          ├── scenes (ACTIVE - 0 rows)
          ├── activities (ACTIVE - 20 rows)
          └── [projects.screenplay_content] (ACTIVE - Stores mixed Plaintext & JSON Ciphertext)

Unused / Shadowed Tables (Backend ready, 0 rows):
  screenplays (0 rows)
    ├── screenplay_contents (0 rows)
    ├── screenplay_versions (0 rows)
    └── screenplay_keys (3 rows - currently stores project-id mapped keys)
```

### 2.2 Target Architecture (Canonical Multi-Screenplay & Direct 2-Tier E2EE)

```text
                    USER
                      │
                      ▼
             Encryption Secret
                      │
              PBKDF2 (600,000 iters)
                      │
                      ▼
            User Encryption Key (UEK)
            [In-Memory WebCrypto Key]
                      │
          ┌───────────┼────────────┐
          │ (AES-GCM) │ (AES-GCM)  │ (AES-GCM)
          ▼           ▼            ▼
        SCK-1       SCK-2        SCK-3
          │           │            │
          │ (AES-GCM) │ (AES-GCM)  │ (AES-GCM)
          ▼           ▼            ▼
     Screenplay 1 Screenplay 2 Screenplay 3
          │           │            │
          ▼           ▼            ▼
      Ciphertext  Ciphertext  Ciphertext

Relational Database Mapping:
users (1)
  └── projects (N)
        └── screenplays (N)
              ├── screenplay_contents (1:1 - current draft + revision CAS)
              ├── screenplay_versions (1:N - immutable historical snapshots)
              └── screenplay_keys (1:1 per user - UEK-wrapped SCK)
```

---

## 3. Audit Findings (Current Production & Local State)

| Entity / Component | Current State | Target State | Migration Action |
| :--- | :--- | :--- | :--- |
| **`projects.screenplay_content`** | 11 rows (Mixed ciphertext & legacy HTML) | Deprecated $\to$ Removed | Migrate all rows to `screenplays` + `screenplay_contents` with default title `"Main Screenplay"`. |
| **`project_keys`** | 1 row (`wrapped_key`, `key_iv`) | Removed | Migrate existing SCKs to wrap directly with UEK; eliminate `project_keys`. |
| **`screenplays`** | 0 rows | Canonical screenplay entity | Populated during migration; primary parent for all screenplay drafts. |
| **`screenplay_contents`** | 0 rows | Single source of truth for content | Populated with existing project contents; updated via `PATCH /screenplays/:id/content`. |
| **`screenplay_versions`** | 0 rows | Version history snapshots | Connected to editor version creation and atomic restore endpoints. |
| **`screenplay_keys`** | 3 rows | Stores UEK-wrapped SCKs | Foreign key constrained to `screenplays(id)`; stores direct UEK wraps. |
| **Editor Route** | `/projects/:id/editor` | `/projects/:id/editor` (resolves default or active `screenplayId`) | Update frontend hooks to load, edit, and autosave via `screenplayId`. |

---

## 4. Migration Strategy: Zero Data Loss & High Reliability

### 4.1 Safe Database Migration Sequence
1. **Additive Schema Preparation**:
   - Ensure `screenplays`, `screenplay_contents`, `screenplay_versions`, and `screenplay_keys` tables have proper indexes and constraints.
   - Do NOT drop `projects.screenplay_content` or `project_keys` until all phases and live verifications pass.
2. **Data Migration (Backend/DB SQL Script)**:
   - For every existing row in `projects`:
     - Create a default `screenplay` record (`title = 'Main Screenplay'`).
     - If `projects.screenplay_content` starts with `{"version":1,"algorithm":"AES-GCM"`:
       - Parse ciphertext and IV.
       - Insert into `screenplay_contents` with `is_encrypted = TRUE`, `ciphertext = ...`, `iv = ...`, `content = ''`, `revision = 1`.
     - Else (legacy plaintext):
       - Insert into `screenplay_contents` with `is_encrypted = FALSE`, `content = projects.screenplay_content`, `revision = 1`.
3. **Key Migration (3-Tier to 2-Tier)**:
   - For existing encrypted projects:
     - The client runtime checks if an SCK is wrapped with PEK or UEK.
     - When unlocked, the client seamlessly unwraps the SCK (using PEK if needed), re-wraps the SCK directly with `activeUEK`, and updates `screenplay_keys`.
     - Future screenplay creations will always generate a random SCK and wrap it directly with the UEK.

---

## 5. Security & Threat Model Compliance

| Security Invariant | Guarantee & Implementation Mechanism |
| :--- | :--- |
| **Zero Server Knowledge** | Neither master passphrase nor plaintext UEK/SCK is ever transmitted to the Go backend. |
| **Direct SCK Isolation** | Each screenplay has its own independent 256-bit AES-GCM SCK. Compromise of one document does not expose others. |
| **Fresh IV Generation** | Web Crypto `crypto.getRandomValues(12)` generates a unique 96-bit IV for every encryption transaction. |
| **Optimistic Concurrency** | `screenplay_contents.revision` enforces Compare-And-Swap (CAS) updates to prevent stale tab overwrites. |
| **Memory Zeroization** | Zustand encryption store purges all active `CryptoKey` objects upon user logout or manual lock. |

---

## 6. Incremental 11-Phase Implementation Roadmap

- [x] **Phase 1: Full Architecture Audit & Migration Plan** (`docs/UNIFIED_SCREENPLAY_MIGRATION_PLAN.md`)
- [ ] **Phase 2: Prepare Screenplay Database Architecture** (Verify schema, create non-destructive migrations)
- [ ] **Phase 3: Simplify Encryption Key Architecture** (Refactor key-manager & store to direct UEK $\to$ SCK wrapping)
- [ ] **Phase 4: Migrate Existing Screenplay Data** (Migrate `projects.screenplay_content` into `screenplays` & `screenplay_contents`)
- [ ] **Phase 5: Backend API Unification** (Ensure `GET/PATCH /api/v1/screenplays/:id/content` with optimistic revision locking)
- [ ] **Phase 6: Frontend Screenplay Migration** (Update `ScreenplayEditor`, hooks, and preview to operate on `screenplayId`)
- [ ] **Phase 7: Screenplay Key Lifecycle** (Implement random SCK generation & direct UEK wrapping on screenplay creation)
- [ ] **Phase 8: Version History Integration** (Connect encrypted checkpoints and atomic restore)
- [ ] **Phase 9: Legacy Compatibility & Migration UX** (In-browser seamless key and document upgrade)
- [ ] **Phase 10: Cleanup & Legacy Deprecation** (Remove redundant columns and deprecated endpoints after verification)
- [ ] **Phase 11: Full QA, E2E Verification & Security Testing** (Execute frontend test suite, backend Go tests, and browser tests)

---

## 7. Rollback & Contingency Plan

1. **Non-Destructive Phase Execution**: `projects.screenplay_content` remains readable during Phases 1-9.
2. **Dual-Read Fallback**: If a project has not yet migrated, the backend and frontend fall back to `projects.screenplay_content` gracefully.
3. **Key Fallback**: The client key unwrap routine attempts direct UEK unwrapping; if GCM authentication fails, it attempts legacy PEK unwrapping before surfacing an error.
