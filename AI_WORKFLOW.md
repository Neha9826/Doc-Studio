# AI Workflow and Engineering Judgment

## How AI was used

AI assistance was used to accelerate planning, implementation drafting, documentation and review. The workflow was iterative: inspect the existing MVP, map requirements, prioritize high-value behaviors, make focused changes, then use syntax checks, automated tests and manual browser checks.

AI assistance supported:

- Breaking the assessment into document lifecycle, identity, sharing, history, export, rich editing and AI-copilot tasks.
- Drafting Express routes and browser UI changes within the existing static frontend architecture.
- Drafting automated tests for authentication, persistence, sanitization, authorization, import, version restoration, export and deletion.
- Integrating a server-side Groq request for document questions, summaries, action extraction, outlines and selected-text rewriting.
- Improving editor controls and insertion flows for typography, colors, tables, links, image URLs, video links, symbols and slash commands.
- Reviewing documentation and identifying limitations and deployment checks.

## Engineering judgment and scope

The implementation intentionally avoids claiming full Google Docs parity. Real-time collaboration, comments/suggestions, DOCX import and workspace-wide vector retrieval were deferred because they require more synchronization, parsing or infrastructure than the assessment window supports. The copilot uses the currently open document as bounded context; it is not a vector-search/RAG pipeline across all workspaces.

The JSON store is an assessment trade-off for fast setup and review. It is limited to a single Node process and persistent filesystem, and is not presented as production-grade persistence. The rich editor uses `contenteditable` and browser editing commands rather than a structured editor schema.

## AI behavior and human review

The API keeps the Groq key on the server and checks that the signed-in user can access the document before sending its content to the provider. Document content is treated as untrusted input in the AI prompt. Generated answers can be wrong or incomplete, so the user should review a suggestion before inserting or replacing document content. Provider failures should be surfaced clearly and must not be represented as successful AI output.

## Verification discipline

Run `npm test` and record the actual result before submission. Manual checks should include signup/login/logout, document creation and refresh persistence, formatting, import, owner/editor/viewer access, deletion, version preview/restore, all export paths, AI questions and rewriting, unauthenticated access denial, and persistence across a server restart. Repeat critical smoke tests on the public deployment.

Do not claim a test, security property, or deployment check succeeded unless it was actually performed. Record remaining failures and known limitations in the submission materials.
