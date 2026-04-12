# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run tauri dev          # Run full app (Vite + Tauri)
npm run dev                # Frontend only (Vite, port 1420)
```

### Build
```bash
npm run build              # TypeScript check + Vite build
npm run tauri build        # Full Tauri production build
```

### Lint & Format
```bash
npm run lint               # ESLint on src/
npm run format             # Prettier on src/**/*.ts and src/**/*.tsx
cd src-tauri && cargo clippy  # Rust linting (strict — see Cargo.toml [lints.clippy])
```

### Tests
```bash
npm run test:frontend      # Vitest (jsdom, React Testing Library)
npm run test:backend       # Cargo tests (must run with --test-threads=1, uses testcontainers)

# Run a single frontend test file
npx vitest src/components/Home.spec.tsx

# Run a single Rust test
cd src-tauri && cargo test test_health_check -- --test-threads=1
```

> Backend tests spin up real Docker containers via `testcontainers`. Parallelism is disabled (`--test-threads=1`) because each test starts a ChromaDB container on a random port.

## Architecture

### Two-process Tauri model
- **`src/`** — React/TypeScript frontend (Vite + Chakra UI v3)
- **`src-tauri/src/`** — Rust backend (Tauri v2 commands)

Frontend calls Rust via `invokeWrapper` (`src/utils/invokeTauri.ts`), which wraps `@tauri-apps/api/core invoke` into a typed `{ type: 'success', result } | { type: 'error', error }` union. All Tauri command names are in the `TauriCommand` enum (`src/types.ts`).

### Application flow
1. **`/` (App.tsx)** — Connection screen. User enters ChromaDB URL, tenant, database, and optional auth. On success, calls `create_window` to open the main window then closes itself.
2. **`/home` (MainPage.tsx)** — Main window. Renders `Layout` + one of `Home | Collections | Settings` based on Redux `currentMenu` state.

### Frontend state (Redux Toolkit)
- `currentMenu` — which sidebar panel is active (`'Home' | 'Collections' | 'Settings'`)
- `currentCollection` — name of the currently selected collection

Connection details (URL, tenant, database) are persisted to `localStorage` with the key prefix `chromamind`.

### Rust backend (`src-tauri/src/lib.rs`)
- `AppState` holds a `parking_lot::Mutex<Option<ChromaHttpClient>>` (from the `chroma` crate).
- `get_client()` returns a mapped guard or `Err("ChromaDB client not initialized")` — this is the standard guard pattern used across all commands.
- Tauri commands: `create_client`, `health_check`, `fetch_collections`, `fetch_row_count`, `fetch_embeddings`, `fetch_collection_data`, `create_collection`, `delete_collection`, `reset_chroma`, `get_chroma_version`, `create_window`, `check_tenant_and_database`.

### Active migration: `chromadb` → `chroma` crate
The branch `CHROM-1-replace-chroma-crate-to-new-open` is migrating the ChromaDB client from a custom fork (`chromadb` crate, `probaku1234/chromadb-rs`) to the public `chroma = "0.12.0"` crate. Several commands have their implementations commented out and return stubs: `fetch_embeddings`, `delete_collection`, `reset_chroma`. Tests still import the old `chromadb` crate for test helpers (`ChromaClient`, `CollectionEntries`, auth types) — this is intentional until the migration completes.

### Clippy configuration
`src-tauri/Cargo.toml` denies several clippy lints including `index_slicing`, `wildcard_enum_match_arm`, and `must_use_candidate`. Run `cargo clippy` before committing Rust changes.
