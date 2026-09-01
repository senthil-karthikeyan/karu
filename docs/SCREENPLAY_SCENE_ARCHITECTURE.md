# Karu — Screenplay Scene Architecture Decision Record (ADR)

**Status:** Accepted & Enacted  
**Date:** September 2026  
**Supersedes:** Legacy Dual-Storage & Plaintext `scenes` Table Schema  

---

## 1. Context and Problem Statement

Early versions of Karu maintained a standalone relational PostgreSQL table named `scenes`:
```sql
CREATE TABLE scenes (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    scene_number INT,
    slugline VARCHAR(255),
    location VARCHAR(255),
    time_of_day VARCHAR(50),
    summary TEXT,
    page_number INT
);
```

At the same time, the screenplay text was being written and edited inside a rich-text TipTap document editor. When client-side End-to-End Encryption (E2EE) was introduced, this created fundamental security, synchronization, and architectural contradictions:

1. **E2EE Confidentiality Leakage:** While screenplay content was encrypted with 256-bit AES-GCM, the `scenes` table stored plaintext sluglines, locations, and summaries on the database server.
2. **Dual-State Desynchronization:** Writers add, delete, split, merge, and reorder scenes continuously in TipTap. Syncing editor changes back to separate relational `scenes` rows caused race conditions, ordering inconsistencies, and data loss.
3. **Redundant Storage:** Every scene heading (`INT. COFFEE SHOP - DAY`) was stored twice: once within the screenplay document AST, and again as a database row.

---

## 2. Decision: Unified Client-Derived Scene Architecture

Karu has formally transitioned to a **unified, document-native scene architecture**:

```text
User Passphrase
     │
     ▼ PBKDF2 (SHA-256, 600,000 iterations)
User Encryption Key (UEK)
     │
     ▼ Wraps directly (2-Tier AES-GCM)
Screenplay Content Key (SCK)
     │
     ▼ Encrypts / Decrypts TipTap JSON
┌─────────────────────────────────────────────────────────────┐
│             Canonical TipTap Screenplay Document             │
│                                                             │
│  [sceneHeading] 1. INT. COFFEE SHOP - DAY                   │
│  [action]       Mark types furiously on his laptop.         │
│  [character]    MARK                                        │
│  [dialogue]     We don't need a scenes table anymore.       │
│                                                             │
│  [sceneHeading] 2. EXT. CITY STREET - CONTINUOUS            │
│  [action]       He steps outside into the rain.             │
└─────────────────────────────────────────────────────────────┘
     │
     ▼ Dynamic Client-Side Parsing (Decrypted AST)
Scene Outline / Navigation Panel / Script Breakdown
```

### Key Principles

### 1. Single Source of Truth
The TipTap JSON document stored in `screenplay_contents` (and immutable snapshots in `screenplay_versions`) is the **sole canonical source of truth** for all screenplay content, scene headings, sluglines, dialogue, action, characters, parentheticals, transitions, and shots.

### 2. Zero-Knowledge E2EE Integrity
Because screenplay content is client-side encrypted before transmission to the server, the backend has zero visibility into plaintext content. The database stores only AES-GCM ciphertext, an IV, and an encrypted revision count. It cannot parse or query scene boundaries, preserving strict zero-knowledge confidentiality.

### 3. Dynamic Client-Side Scene Extraction
Scene navigation, scene numbering, slugline indexing, and outline navigation are computed dynamically on the client from the decrypted TipTap AST:
```typescript
// Fast, reactive scene extraction from decrypted editor document
const scenes = [];
editor.state.doc.descendants((node, pos) => {
  if (node.type.name === 'sceneHeading') {
    scenes.push({
      pos,
      sceneNumber: scenes.length + 1,
      slugline: node.textContent,
    });
  }
});
```

### 4. Database Cleanliness
The redundant `scenes` table, project-level scene queries, and database triggers have been dropped in Migration `000010_cleanup_legacy_screenplay_schema`.

---

## 3. Consequences and Benefits

| Dimension | Legacy Architecture (`scenes` table) | Unified Architecture (TipTap AST) |
|---|---|---|
| **Confidentiality** | Plaintext sluglines and summaries leaked to server database | 100% encrypted end-to-end; server never sees scene headings |
| **Consistency** | Editor document and database rows frequently desynchronized | Zero drift; document AST is the singular source of truth |
| **Performance** | Network round-trips for scene CRUD on every edit | Real-time in-memory parsing (instantaneous renumbering and jumping) |
| **Collaboration** | Complex OT / CRDT required for both document and database table | Standard TipTap document collaboration / versioning |
| **Code Surface** | Duplicate repository, service, handler, and API layers | Clean, unified screenplay storage pipeline |

---

## 4. Transition & Backwards Compatibility

- **API Compatibility:** Existing read responses maintain an empty `scenes: []` array where required for legacy clients.
- **Frontend Editor:** The screenplay editor dynamically populates the scene outline panel by observing document transactions directly.
- **Export & Preview:** PDFs, Fountain files, and HTML previews parse the scene hierarchy directly from the TipTap document nodes.
