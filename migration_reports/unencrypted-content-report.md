# Migration Report: Unencrypted Screenplay Content & Versions

**Report Date**: 2026-09-07  
**Migration**: `000013_e2ee_schema_revamp`  
**Purpose**: Audit and flag all database rows where `is_encrypted = false` before dropping `content` columns from `screenplay_contents` and `screenplay_versions`.

---

## Executive Summary

- **Total Screenplay Contents Audited**: 18
- **Encrypted Screenplay Contents**: 6
- **Unencrypted Screenplay Contents (`is_encrypted = false`)**: 12
  - **Empty Placeholders (`length = 0`)**: 9
  - **Authored Plaintext Drafts (`length > 0`)**: 3
- **Total Screenplay Versions Audited**: 2
- **Unencrypted Screenplay Versions (`is_encrypted = false`)**: 2

> [!IMPORTANT]
> To prevent data loss when `content` columns are dropped in migration `000013`, all unencrypted rows are automatically captured and preserved in:
> - `_backup_unencrypted_screenplay_contents`
> - `_backup_unencrypted_screenplay_versions`

---

## 1. Unencrypted Screenplay Contents (`screenplay_contents`)

| Screenplay ID | Project / Title | Revision | Content Length | Last Updated | Snippet / Preview |
|---|---|---|---|---|---|
| `e9591b7c-5db1-48b6-8594-241f4de6f033` | The Last Train | 1 | 0 | 2026-08-31 05:40:42 UTC | *(Empty initial content)* |
| `dc448b65-18e9-45e3-92d4-4100483590e5` | The Last Train | 1 | 0 | 2026-08-31 06:01:40 UTC | *(Empty initial content)* |
| `1d9dee9d-79c8-47af-8b3e-5a638b84a3f8` | The Last Train | 1 | 0 | 2026-08-31 06:02:40 UTC | *(Empty initial content)* |
| `a1d93861-45da-4c69-a8ac-25e85dbb4f59` | The Last Train | 1 | 0 | 2026-08-31 06:04:16 UTC | *(Empty initial content)* |
| `bc26543f-5ee2-4b81-a763-d7da844babc3` | Draft 1 | 1 | 0 | 2026-09-01 06:37:16 UTC | *(Empty initial content)* |
| `6632fc30-49f3-4700-9399-7d17f8e7ed2a` | Draft 1 | 1 | 0 | 2026-09-01 06:37:47 UTC | *(Empty initial content)* |
| `96c1c099-baa6-40fb-9102-cd589a578ec2` | Draft 1 | 1 | 0 | 2026-09-01 06:38:10 UTC | *(Empty initial content)* |
| `546b2dd0-126f-4b20-8017-411c6a913607` | Draft 1 | 1 | 0 | 2026-09-01 08:08:25 UTC | *(Empty initial content)* |
| `c504a5ec-fbed-4a53-bd08-e3fb116459ff` | Draft 1 | 1 | 0 | 2026-09-01 12:55:00 UTC | *(Empty initial content)* |
| `2e6a8971-ad5d-4759-ae63-11af068a680a` | **TEst 1** | 23 | **635** | 2026-09-02 07:37:38 UTC | `<h2 data-type="scene-heading">INT. KFNREFEKLFNLKD - DAY</h2><h2 data-type="scene...` |
| `38d14c2d-075f-474b-ae01-29581f0f5859` | **Draft 1** | 112 | **2,927** | 2026-09-02 07:41:55 UTC | `<h2 data-type="scene-heading">OFFICE - NIGHT</h2><p data-type="character">MARCUS...` |
| `10f7d0e0-2a92-4832-8ece-e82ebcff1e75` | **Test** | 21 | **319,187** | 2026-09-02 08:10:30 UTC | `<p data-type="character">THE BRUTALIST</p><p data-type="dialogue">Written by</p>...` |

---

## 2. Unencrypted Screenplay Versions (`screenplay_versions`)

| Screenplay ID | Version | Title | Content Length | Created At | Snippet / Preview |
|---|---|---|---|---|---|
| `38d14c2d-075f-474b-ae01-29581f0f5859` | 1 | Initial Draft 1.0 | **219** | 2026-09-01 16:03:33 UTC | `<p data-type="action">Write your screenplay here...</p><h2 data-type="scene-head...` |
| `38d14c2d-075f-474b-ae01-29581f0f5859` | 2 | Audit Checkpoint 2.0 | **1,085** | 2026-09-01 17:10:08 UTC | `<h2 data-type="scene-heading">OFFICE - NIGHT</h2><p data-type="character">MARCUS...` |

---

## 3. Data Protection Action Taken

1. Migration `000013_e2ee_schema_revamp.up.sql` creates persistent snapshot tables:
   - `_backup_unencrypted_screenplay_contents`
   - `_backup_unencrypted_screenplay_versions`
2. All non-empty drafts (including the 319KB *"THE BRUTALIST"* draft and *"Draft 1"*) are preserved with their exact primary keys, screenplay IDs, revisions, and timestamps.
3. Once users configure encryption on these screenplays, their client will encrypt the working copy with a fresh Screenplay Content Key (SCK) and persist the ciphertext into `screenplay_contents.ciphertext`.
