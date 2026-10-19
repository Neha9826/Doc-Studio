# Ajaia Docs Studio

A lightweight, AI-assisted document workspace built for the Ajaia Full Stack Product Engineer assessment. It focuses on a complete document lifecycle: create and edit content, share it with clear permissions, recover earlier versions, and use AI to work with the open document.

## Reviewer quick start

1. Install Node.js 20 or newer.
2. In this directory, run `npm install`, then `npm test`, then `npm start`.
3. Open `http://localhost:3000`.
4. Sign in with one of the demo accounts below, or create an account.
5. Try the suggested review path: create a document → format it → refresh → inspect version history → share it with another demo user → verify view-only access → try an AI action → export it.

> **Demo data notice:** The seeded accounts and password are intentionally public for assessment review. Do not store confidential or personal information in this demo.

## Highlights

- **Accounts and sessions:** signup, login and logout; passwords hashed with Node.js `scrypt`; opaque session tokens stored as hashes and sent using HttpOnly cookies.
- **Document lifecycle:** create, rename, edit, autosave, reopen and delete documents.
- **Rich editing:** typography, text/highlight colors, headings, lists, tables, links, image URLs, video links, symbols, undo/redo and a slash-triggered insert menu.
- **Import and export:** import `.txt` and `.md` files up to 1 MB; export Markdown, plain text, Word-compatible `.doc`, or use browser print-to-PDF.
- **Sharing:** owners can grant `view` or `edit` access; permissions are checked by the server.
- **Version recovery:** preview and restore saved prior versions, up to 20 per document.
- **Document-aware AI:** ask questions about the open document, summarize it, extract action items, generate an outline or rewrite selected text. Users review suggestions before applying them.
- **Safety-minded defaults:** HTML sanitization, input validation, generic login errors, bounded version history and serialized atomic JSON writes.

## Demo accounts

| User | Email | Password |
|---|---|---|
| Neha | `neha@example.com` | `Demo123!Pass` |
| Alex | `alex@example.com` | `Demo123!Pass` |
| Sam | `sam@example.com` | `Demo123!Pass` |

Use separate browser profiles or an incognito window to test users independently. These are public demo credentials, not private accounts.

## Local setup

```bash
npm install
npm test
npm start
```

Then open `http://localhost:3000`. The server uses `PORT` when set and creates `data/store.json` by default. Set `DATA_FILE` to choose a different data file.

### Configure the AI copilot

Set the key in the server's environment; never place it in browser code or commit it.

**Git Bash / macOS / Linux:**

```bash
export GROQ_API_KEY="your_key_here"
export GROQ_MODEL="openai/gpt-oss-120b"
npm start
```

**Windows PowerShell:**

```powershell
$env:GROQ_API_KEY="your_key_here"
$env:GROQ_MODEL="openai/gpt-oss-120b"
npm start
```

Use a currently supported model available to your Groq account. If the key is absent or the provider fails, inspect the server log and verify the configuration; do not assume the AI request succeeded.

## Suggested 3-minute reviewer path

1. **Author:** create a document, use headings and a numbered list, insert a table or link, then refresh to confirm persistence.
2. **Recover:** open version history, preview an earlier version, and restore it only after reviewing the content.
3. **Collaborate:** share with Alex as `view`; sign in as Alex in a separate browser session and confirm editing is denied. Then test `edit` access.
4. **Use AI:** summarize the open document or extract action items, review the result, and explicitly apply or copy it.
5. **Export:** try Markdown and text exports, Word-compatible `.doc`, and browser print-to-PDF.

## API overview

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/users`
- `GET /api/documents`, `POST /api/documents`, `GET /api/documents/:id`, `PATCH /api/documents/:id`, `DELETE /api/documents/:id`
- `GET /api/documents/:id/versions`, `POST /api/documents/:id/versions/:versionId/restore`
- `GET /api/documents/:id/export?format=md|txt|doc` (PDF uses browser print)
- `POST /api/documents/:id/ai`
- `POST /api/documents/:id/share`, `DELETE /api/documents/:id/share/:userId`
- `POST /api/import`
- `GET /api/health`

## Architecture and known limitations

The application uses an Express API and static HTML/CSS/JavaScript frontend. The editor uses `contenteditable` and browser editing commands rather than a structured editor framework. The JSON store is intended for a single Node process on a persistent filesystem; it is not suitable for horizontal scaling or high-concurrency production workloads. AI context is limited to the open document; this is not workspace-wide vector RAG. There is no real-time co-editing, comments/suggestions, DOCX import, offline sync, email verification or password reset.

For production, I would move persistence to PostgreSQL, use managed authentication, add CSRF/origin controls and login rate limits, implement backups/monitoring and optimistic concurrency, and migrate to a maintained structured editor such as TipTap/ProseMirror. AI output can be incorrect and should be reviewed before use.

See [ARCHITECTURE.md](ARCHITECTURE.md) and [AI_WORKFLOW.md](AI_WORKFLOW.md) for implementation decisions and AI-use disclosure.

## Deployment checklist

Use a Node.js host with persistent disk support. Configure `npm install` as the build command and `npm start` as the start command. Set `NODE_ENV=production`, `GROQ_API_KEY`, `GROQ_MODEL`, and `DATA_FILE` as environment variables. If using a mounted disk at `/var/data`, set `DATA_FILE=/var/data/store.json`.

Before submission, verify `/api/health`, login/logout, document creation and refresh persistence, AI actions, sharing permissions, version restoration and exports on the public URL. A successful build alone does not confirm a working deployment.
