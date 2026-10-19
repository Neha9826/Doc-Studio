# Architecture and Engineering Decisions

## Product scope

Ajaia Docs Studio is a focused document workspace for authoring, importing, sharing, recovering and exporting documents, with a document-aware AI copilot. The implementation prioritizes a complete end-to-end workflow over full Google Docs parity.

## Request and data flow

1. The browser sends requests to the Express API and renders the editor, account screens, sharing controls, version history and AI panel.
2. The API resolves the session cookie and checks document visibility/permissions before reading or mutating a document.
3. Rich-text content is sanitized on the server before persistence.
4. Changes and bounded prior-version snapshots are written to a JSON data file through serialized, atomic writes.
5. For AI actions, the authenticated API sends only the accessible open document and optional selected text to Groq. The provider key remains server-side.

## Main components

- **Browser client:** static HTML/CSS/JavaScript; editor, auth UI, autosave, imports, exports, sharing, version history and AI interactions.
- **Express API:** request validation, session resolution, document authorization, sanitization, import/export and AI-provider integration.
- **Identity/session layer:** passwords hashed using Node's built-in `scrypt`; random opaque session token in an HttpOnly, SameSite=Lax cookie; only the SHA-256 token hash is persisted. Sessions expire after seven days.
- **JSON persistence:** stores users, sessions, documents, shares and version snapshots. Writes are serialized and written to a temporary file before rename.
- **AI copilot:** document-scoped questions, summary, action extraction, outline generation and selected-text rewriting. AI suggestions require user review before applying.

## Core data entities

- `users`: id, name, email, password salt/hash, createdAt.
- `sessions`: id, userId, tokenHash, expiresAt.
- `documents`: id, title, sanitized HTML content, ownerId, createdAt, updatedAt.
- `shares`: documentId, userId, permission (`edit` or `view`), createdAt.
- `versions`: documentId, prior title/content, createdAt, createdBy; bounded to 20 prior versions per document.

## Authorization model

- All document APIs require a valid server-side session.
- A document is visible to its owner or a user with an explicit share.
- Only the owner can delete a document or manage its shares.
- Owners and `edit` recipients can update or restore versions; `view` recipients are read-only.
- Non-visible document reads return 404 to avoid disclosing whether another user's document exists.
- The AI route uses the same document visibility check before sending content to the provider.

## Important trade-offs

- **JSON file instead of a database:** fast to set up and easy to inspect, but single-instance only. It requires a persistent filesystem and is not suitable for horizontal scaling or heavy concurrent writes.
- **Built-in password hashing:** avoids extra dependencies, but production should use a managed identity solution and add rate limiting, account recovery and stronger operational controls.
- **`contenteditable` editor:** keeps the MVP dependency-light, but formatting and document structure are less reliable than a schema-based editor. A production iteration should migrate to TipTap/ProseMirror and add editor-specific tests.
- **Bounded snapshots:** supports recovery while limiting storage growth; only up to 20 prior versions are retained.
- **Document-scoped AI context:** keeps the implementation simple and avoids adding a vector store under a tight deadline. It does not search across all documents or workspaces.
- **No real-time collaboration:** avoids presenting an incomplete synchronization model as collaborative editing. True co-editing needs presence, conflict handling and a collaboration backend.

## Security and reliability considerations

The application hashes passwords, stores only session-token hashes, sanitizes supported HTML, checks permissions on the server and keeps the Groq key out of the browser. These controls do not make the timed MVP production-ready. Before production use, add CSRF/origin protections, login throttling, security headers, backups, monitoring, account recovery, concurrency control and a security review. Do not put real user data in seeded demo accounts.

## Verification

Run `npm test` in the project directory and record the actual result. Tests cover authentication, persistence/sanitization, share authorization, read-only enforcement, import, version restore, export and deletion; AI route behavior is also covered where configured. Separately smoke-test keyboard editing, formatting after refresh, session expiry/logout, AI provider failures and persistent storage on the deployed URL. Do not report checks as passed unless they were run.

## Next steps for a production system

1. Move users, documents, shares, versions and sessions to PostgreSQL.
2. Adopt managed authentication and add CSRF/origin controls, rate limits and account recovery.
3. Migrate to a structured editor with robust table/media handling and accessibility coverage.
4. Add backups, observability, concurrency/version tokens and deployment smoke tests.
5. Add real-time collaboration only with a clear conflict-resolution design.
