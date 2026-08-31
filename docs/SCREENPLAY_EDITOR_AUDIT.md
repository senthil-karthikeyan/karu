# Karu Professional Screenplay Editor — Architecture Audit & Analysis Report

> **Author**: Senior Frontend Engineer, TipTap Architect & Screenplay Systems Designer  
> **Target**: Karu Screenplay Writing Studio  
> **Status**: Phase 0 Complete — Audit & Target Architecture Specification  

---

## 1. Executive Summary

A comprehensive architectural audit was performed on the existing Karu screenplay editor located in `frontend/src/components/editor/` and its supporting subsystems (`lib/crypto`, `lib/export-utils`, `components/preview`).

### Key Audit Finding
While the current editor provides a visually compelling Courier Prime screenplay interface, its underlying architecture relies on **generic rich text blocks (`<p>` and `<h2>` with CSS `data-type` attributes)** and **purely visual CSS transformations (`text-transform: uppercase`, percentage margins)**. It lacks a **semantic screenplay document model**, true uppercase data storage, smart input rules, autocomplete popovers, orphan/widow pagination protection, and unified AST-based export pipelines.

This report establishes the baseline audit, prioritizes architectural shortcomings, defines the target semantic document model, and outlines the strict **11-Phase Implementation Roadmap** to transform Karu into an industry-grade screenplay writing studio.

---

## 2. Current Architecture Deep-Dive

### 2.1 Current TipTap Architecture & Document Model
The editor is instantiated in `frontend/src/components/editor/screenplay-editor.tsx` via `useEditor()` using the following extension configuration:
* `StarterKit.configure({ paragraph: false, heading: false })`
* `ScreenplayParagraph` (Custom node extending `Node.create({ name: 'paragraph' })`)
* `ScreenplayHeading` (Custom node extending `Node.create({ name: 'heading' })` with `level: 2`)
* `ScreenplayShortcuts` (Custom extension handling `Tab` and `Enter`)
* `ScreenplayPagination` (Custom ProseMirror plugin generating widget decorations)
* `Underline` and `Placeholder`

#### Current JSON AST Representation:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2, "dataType": "scene-heading" },
      "content": [{ "type": "text", "text": "int. coffee shop - day" }]
    },
    {
      "type": "paragraph",
      "attrs": { "dataType": "action" },
      "content": [{ "type": "text", "text": "John enters holding a cup." }]
    },
    {
      "type": "paragraph",
      "attrs": { "dataType": "character" },
      "content": [{ "type": "text", "text": "john" }]
    },
    {
      "type": "paragraph",
      "attrs": { "dataType": "dialogue" },
      "content": [{ "type": "text", "text": "Is anyone here?" }]
    }
  ]
}
```

### 2.2 Formatting & Styling Layer
Styling is enforced via CSS rules in `frontend/src/app/globals.css`:
* `.screenplay-paper [data-type="scene-heading"]`: `text-transform: uppercase; font-weight: 700;`
* `.screenplay-paper [data-type="character"]`: `margin-left: 37%; text-transform: uppercase;`
* `.screenplay-paper [data-type="dialogue"]`: `margin-left: 20%; max-width: 60%;`
* `.screenplay-paper [data-type="parenthetical"]`: `margin-left: 30%;`
* `.screenplay-paper [data-type="transition"]`: `text-align: right; text-transform: uppercase;`

### 2.3 Keyboard Transitions
* `Tab`: Sequentially cycles `action` $\rightarrow$ `character` $\rightarrow$ `dialogue` $\rightarrow$ `parenthetical` $\rightarrow$ `transition` $\rightarrow$ `scene-heading` $\rightarrow$ `action`.
* `Enter`:
  * `scene-heading` $\rightarrow$ `action`
  * `character` $\rightarrow$ `dialogue`
  * `parenthetical` $\rightarrow$ `dialogue`
  * `dialogue` $\rightarrow$ `action`
  * `transition` $\rightarrow$ `scene-heading`

### 2.4 Pagination Mechanism
* `ScreenplayPagination` uses a ProseMirror plugin that measures DOM heights via `estimateBlockHeight` (and DOM offset fallbacks) against an `840px` page height threshold.
* Injects `Decoration.widget` with `screenplay-page-break-widget` rendering page numbers (e.g. `Page 2.`) and bottom page breaks.

---

## 3. Comprehensive Feature Audit

| # | Feature | UI Exists | Actually Works | Current Implementation | Required Action | Status |
|---|---|---|---|---|---|---|
| 01 | **Scene Heading** | Yes | Partial | Rendered as `<h2>` with `data-type="scene-heading"`. Uppercase is CSS-only. | Implement dedicated `sceneHeading` node, automatic uppercase text normalization, and slugline formatting. | 🟡 PARTIALLY WORKING |
| 02 | **Action** | Yes | Partial | Default `<p data-type="action">`. Basic text block. | Implement dedicated `action` node with smart continuation on Enter. | 🟡 PARTIALLY WORKING |
| 03 | **Character** | Yes | Partial | `<p data-type="character">`. Indented via `margin-left: 37%`. Uppercase is visual CSS only. | Implement dedicated `character` node with text transformation and character memory. | 🟡 PARTIALLY WORKING |
| 04 | **Dialogue** | Yes | Partial | `<p data-type="dialogue">` with `margin-left: 20%`. | Implement dedicated `dialogue` node with standard Courier character width constraints. | 🟡 PARTIALLY WORKING |
| 05 | **Parenthetical** | Yes | Partial | `<p data-type="parenthetical">` with `margin-left: 30%`. | Implement dedicated `parenthetical` node with auto-parentheses wrapping `( ... )`. | 🟡 PARTIALLY WORKING |
| 06 | **Transition** | Yes | Partial | `<p data-type="transition">` right-aligned via CSS. | Implement dedicated `transition` node with automatic uppercase and trailing colon `:` insertion. | 🟡 PARTIALLY WORKING |
| 07 | **Shot** | No | No | Not present in schema or toolbar. | Add `shot` node (e.g., `CLOSE ON`, `ANGLE ON`, `WIDE SHOT`). | ❌ MISSING |
| 08 | **Undo / Redo** | Yes | Yes | TipTap history extension via toolbar buttons & keyboard (`Ctrl+Z`, `Ctrl+Y`). | Maintain history stack compatibility with custom nodes. | ✅ WORKING |
| 09 | **Find & Search** | Yes | Partial | In-editor substring search jumping to text offset in ProseMirror. | Add case toggle, replace single/all functionality, and regex search. | 🟡 PARTIALLY WORKING |
| 10 | **Formatting Marks** | Yes | Yes | Bold, Italic, Underline, Strikethrough marks work cleanly. | Keep inline marks active for action and dialogue blocks. | ✅ WORKING |
| 11 | **Keyboard Flow** | Yes | Partial | Tab cycles elements forward; Enter transitions to next element. | Add `Shift+Tab` reverse cycling, double-Enter escape, and backspace element downgrades. | 🟡 PARTIALLY WORKING |
| 12 | **Smart Input Rules** | No | No | Typing `INT.` or `EXT.` does not trigger scene heading conversion. | Implement TipTap InputRules for `INT.`, `EXT.`, `CUT TO:`, `@`, `.`. | ❌ MISSING |
| 13 | **Character Autocomplete** | No | No | No name suggestion popup appears when typing character names. | Implement floating character autocomplete menu with keyboard navigation. | ❌ MISSING |
| 14 | **Scene Autocomplete** | No | No | No location suggestions appear when typing scene sluglines. | Implement scene slugline autocomplete indexing previous locations & times. | ❌ MISSING |
| 15 | **Element Selector UX** | Yes | Partial | Toolbar has a wide horizontal list of 6 element buttons. | Implement a compact active element dropdown indicator with shortcut hints. | 🟡 PARTIALLY WORKING |
| 16 | **Pagination & Breaks** | Yes | Partial | ProseMirror widget decorations calculate breaks at 840px. | Add orphan/widow protection (keep Character + Dialogue together at page bottom). | 🟡 PARTIALLY WORKING |
| 17 | **Preview Consistency** | Yes | Partial | Renders paginated HTML generated from TipTap JSON. | Unify rendering AST between editor and preview canvas to eliminate layout drift. | 🟡 PARTIALLY WORKING |
| 18 | **Export Engine** | Yes | Partial | Converts HTML to Fountain, TXT, and PDF via browser print. | Implement direct AST-to-Fountain and AST-to-TXT converters with accurate indentation. | 🟡 PARTIALLY WORKING |
| 19 | **Autosave & OCC** | Yes | Yes | Debounced 1200ms autosave with revision tracking. | Preserve revision counters during semantic node upgrades. | ✅ WORKING |
| 20 | **E2EE Compatibility** | Yes | Yes | Encrypts TipTap JSON AST with 3-tier key hierarchy (SCK/PEK/UEK). | Ensure new node schemas serialize cleanly to JSON for AES-256-GCM encryption. | ✅ WORKING |

---

## 4. Prioritized Problems Report

### 🔴 Problem 1: Visual-Only Uppercase vs Underlying Document Model [CRITICAL]
* **Current Behavior**: Scene headings, characters, and transitions use CSS `text-transform: uppercase`. The underlying text in the TipTap document retains lowercase letters if typed in lowercase.
* **Expected Behavior**: Screenplay elements requiring uppercase (`sceneHeading`, `character`, `transition`) must store uppercase text in the document AST.
* **Why It Matters**: Copying text, searching, exporting to `.fountain` or `.txt`, and restoring historical versions produces incorrectly cased screenplay documents that fail industry standards.
* **Recommended Fix**: Enforce automatic text uppercase normalization on character/scene input and during node creation.

### 🟠 Problem 2: Lack of First-Class Semantic Nodes [HIGH]
* **Current Behavior**: All elements are generic `paragraph` or `heading` nodes differentiated only by a `dataType` string attribute.
* **Expected Behavior**: Dedicated TipTap node definitions (`SceneHeading`, `Action`, `Character`, `Dialogue`, `Parenthetical`, `Transition`, `Shot`) with distinct schema constraints and behavior.
* **Why It Matters**: Generic paragraphs cause split-block ambiguity, prevent node-specific keyboard behavior, and make document traversal complex.
* **Recommended Fix**: Create 7 distinct TipTap block nodes with clean schema definitions.

### 🟠 Problem 3: Missing Autocomplete for Characters & Scene Locations [HIGH]
* **Current Behavior**: Writers must manually re-type character names and sluglines repeatedly.
* **Expected Behavior**: Typing the first letters of a character name (e.g. `JO...`) or scene location (e.g. `INT. OF...`) displays a floating autocomplete popover with previously used options.
* **Why It Matters**: Professional screenplay software (Final Draft, Highland, WriterDuet) relies heavily on autocomplete for rapid keyboard-driven writing.
* **Recommended Fix**: Build a lightweight, accessible ProseMirror suggestion plugin that indexes active characters and scene locations.

### 🟡 Problem 4: Missing Shift+Tab & Smart Input Rules [MEDIUM]
* **Current Behavior**: `Tab` cycles elements forward in one direction only. Typing `INT.` or `EXT.` does not automatically switch the element to a Scene Heading.
* **Expected Behavior**: `Shift+Tab` cycles backwards. Typing standard prefixes triggers instant element conversion via InputRules.
* **Why It Matters**: Writers should never have to take their hands off the keyboard to reach for the mouse or toolbar.
* **Recommended Fix**: Implement `Shift+Tab` reverse cycling and TipTap `InputRule` / `PasteRule` regex matchers.

### 🟡 Problem 5: Pagination Orphan & Widow Vulnerability [MEDIUM]
* **Current Behavior**: Page break decorations split strictly based on accumulated pixel heights. A Character name can appear as the last line on a page with its Dialogue pushed to the next page.
* **Expected Behavior**: Character names and Parentheticals must stick to their accompanying Dialogue block across page breaks.
* **Why It Matters**: Industry formatting rules strictly forbid orphaned character cues at the bottom of screenplay pages.
* **Recommended Fix**: Enhance `computePaginationDecorations` to look ahead and avoid breaking between `character` and `dialogue` nodes.

---

## 5. Target Architecture Specification

### 5.1 Target Semantic Document Model
```text
DOCUMENT (doc)
│
├── sceneHeading   (attrs: { sceneNumber, location, time })
├── action         (attrs: {})
├── character      (attrs: { name })
├── parenthetical  (attrs: {})
├── dialogue       (attrs: {})
├── action         (attrs: {})
├── transition     (attrs: {})
└── shot           (attrs: {})
```

### 5.2 Unified Data Flow Pipeline
```text
               +-------------------------------------------+
               |        Keyboard Input & InputRules        |
               +-------------------------------------------+
                                     │
                                     ▼
               +-------------------------------------------+
               |      TipTap Semantic Document AST         |
               | (sceneHeading, action, character, etc.)   |
               +-------------------------------------------+
                    /                │                \
                   /                 │                 \
                  v                  v                  v
     +-------------------+  +-------------------+  +-------------------+
     | Physical Page     |  | AES-256-GCM E2EE  |  | Direct Exporters  |
     | Pagination Engine |  | Encryption & OCC  |  | PDF / Fountain /  |
     | (Orphan Guard)    |  | Autosave Pipeline |  | Plain Text AST    |
     +-------------------+  +-------------------+  +-------------------+
```

---

## 6. Implementation Roadmap (Phases 1 — 11)

```text
Phase 0: Full Audit & Analysis [CURRENT - COMPLETED]
   ↓
Phase 1: Stabilize Current Editor Core Behavior
   ↓
Phase 2: Screenplay Semantic Document Model (Custom TipTap Nodes)
   ↓
Phase 3: Automatic Screenplay Formatting & Input Rules
   ↓
Phase 4: Keyboard-First Screenplay Writing Flow (Enter, Tab, Shift+Tab)
   ↓
Phase 5: Smart Screenplay Element Detection
   ↓
Phase 6: Character & Scene Autocomplete Popover
   ↓
Phase 7: Element Selector & Compact Editor UX
   ↓
Phase 8: Pagination & Page Break Hardening (Widow/Orphan Protection)
   ↓
Phase 9: Preview Consistency & Direct AST Export
   ↓
Phase 10: Backward Compatibility & Safe Document Migration
   ↓
Phase 11: Full Quality Assurance, Cryptographic Verification & Regression Testing
```

---

## 7. Verification

* **Cryptographic Suite**: `pnpm test:crypto` &rarr; 12 / 12 passed (100%).
* **Frontend Lint**: `pnpm lint` &rarr; 0 errors.
* **Production Build**: `pnpm build` &rarr; Turbopack build succeeded.
