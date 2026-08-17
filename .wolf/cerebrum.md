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
- **Infra:** Docker Compose runs **app only**; DB is **MongoDB Atlas** via `MONGODB_URI` in `.env` (gitignored). DOCX templates on `./uploads`; PDFs in Backblaze B2.
- **API `POST /api/resume/generate-from-link`:** header `X-API-Key` + body `{ profileId, jobLink }` → `{ company, jobTitle, fileName, resumeDownloadLink }`. PDF uses shared `resumeHtml` (profile `pdfTemplate`) + `pdfFromHtml` (same Tailwind/fonts pipeline as UI). Filename matches UI: `Name_Title_Company`.
- **Shared PDF:** `src/lib/resumeHtml.ts` (3 templates) + `src/lib/pdfFromHtml.ts` used by generate-from-link and `/api/resume/pdf`.
- **API keys:** per-user, stored as SHA-256 hash on User; regenerate via `POST /api/auth/api-key` (self) or `POST /api/admin/users/api-key` (admin).
- **CI:** GitHub Actions `.github/workflows/ci.yml` — Node 20, `npm ci`, lint, typecheck, build. `PUPPETEER_SKIP_DOWNLOAD=true`. Placeholder env for build.

## Do-Not-Repeat

- **[2026-08-12]** Never hardcode `us-west-004` for B2. Always copy the bucket’s real S3 endpoint/region from the B2 console (or `s3ApiUrl` from `b2_authorize_account`). Wrong region surfaces as `InvalidAccessKeyId` even when the key works on the native B2 API.
- **[2026-08-12]** For `@aws-sdk/client-s3` + B2, set `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED` or PutObject can fail on unsupported CRC32 headers.

## Decision Log

- **[2026-08-12] Resume PDF storage → Backblaze B2 (S3 API)**
  - DOCX templates stay on local disk (`uploads/templates`); only generated PDFs go to B2.
  - Downloads via **presigned B2 URLs** (private bucket), not server-proxy streaming.
  - Persist `Resume` docs (`s3Key`) for **backup/audit only** — no past-resumes history UI.
  - Store **PDF only** in B2; generated DOCX stays on-the-fly from template.
- **[2026-08-12] Full PDF parity for generate-from-link**
  - Shared `resumeHtml` + `pdfFromHtml` so from-link matches UI review templates and `/api/resume/pdf` (Tailwind CDN, fonts, fonts.ready).
  - Filename uses UI formula, not AI `resume_file_name`. Honors `profile.pdfTemplate`.

