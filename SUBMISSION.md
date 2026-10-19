# Submission Checklist

Complete this checklist immediately before submission. Check an item only after verifying it.

## Deliverables

- [x] Source code included.
- [x] `README.md` includes setup, demo accounts, reviewer path and API overview.
- [x] `ARCHITECTURE.md` explains components, authorization and trade-offs.
- [x] `AI_WORKFLOW.md` discloses AI use and explains scope decisions.
- [x] `SUBMISSION.md` included.
- [ ] `VIDEO_URL.txt` contains a working public walkthrough link.
- [ ] Verified live application URL recorded below.
- [ ] Project folder uploaded to Google Drive and share access verified.

## Verification

- [ ] `npm install` completes from a clean checkout.
- [ ] `npm test` passes; record the result rather than assuming it.
- [ ] Signup/login/logout work on the deployed app.
- [ ] Create/edit/refresh and restart persistence verified.
- [ ] Owner/editor/viewer sharing and access revocation verified with separate sessions.
- [ ] Version preview/restore and export formats verified.
- [ ] AI question and rewrite work with server-side Groq configuration; failure behavior checked.
- [ ] Final public deployment smoke test completed.
- [ ] Walkthrough video is 3–5 minutes, public, and opens in an incognito window.

## Reviewer access

- **Live application:** TODO — add the verified deployed URL.
- **Walkthrough video:** TODO — add the verified public video URL to `VIDEO_URL.txt`.
- **Google Drive folder:** TODO — add the verified share link.
- **Demo credentials:** listed in `README.md`; these are public demo accounts only.

## Included functionality

Authentication, document creation/editing/autosave, rich-text formatting, `.txt`/`.md` import, owner/editor/viewer sharing, owner-only deletion, bounded version history and restore, Markdown/text/Word-compatible export, browser print-to-PDF, document-scoped AI assistance, and automated API tests.

## Known limitations

JSON persistence is single-instance and requires a persistent filesystem. Demo credentials are public. The editor is a lightweight `contenteditable` MVP, not a structured word processor. There is no real-time co-editing, comments/suggestions, DOCX import, email verification, password reset or workspace-wide vector retrieval. The AI provider requires server-side configuration.
