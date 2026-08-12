# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-08-12

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** resume-builder — AI-assisted resume generator (not a blank create-next-app shell).
- **Stack:** Next.js 16 App Router + React 19 + TS + Tailwind 4 + MongoDB/Mongoose.
- **Auth:** JWT in cookies (`src/lib/session.ts` / `auth.ts`); User has `username`, bcrypt password, `is_admin`.
- **Core flow:** Profile CRUD → Resume Generator (paste job link or description) → AI generates structured resume → Review page (3 PDF header templates) → download DOCX/PDF.
- **Profiles:** education[], employment[], optional DOCX template upload, `pdfTemplate` (template1–3), `profileType` software|other, `customPrompt`.
- **Generation:** Large prompts in `src/lib/prompts.ts`; job scrape via `jobScraper.ts` / Devora21 API; endpoints under `/api/resume/*`.
- **Exports:** docxtemplater for DOCX; Puppeteer HTML→PDF + client html2canvas/jspdf; resumes stored with `s3Key` via `storage.ts`.
- **Admin:** `/admin/users` + `/api/admin/users` for user CRUD.
- **Infra:** `docker-compose.yml` runs mongo:7 + app; uploads volume mounted.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
