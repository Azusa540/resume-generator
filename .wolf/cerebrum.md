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
- **Core flow:** Profile CRUD → Resume Generator (paste job link or description) → AI generates structured resume → Review page (10 PDF header templates) → download DOCX/PDF → download also fire-and-forgets a `POST /api/bid-details` save (Bids page at `/bids` lists job title/company/profile/link/date — **not** job description, dropped by request).
- **Profiles:** education[], employment[], optional DOCX template upload, `pdfTemplate` (template1–10; 4–10 are premium/admin-gated), `profileType` software|other, `customPrompt`.
- **Premium templates:** `User.is_premium` (alongside existing `is_admin`) gates templates 4–10. Embedded in the login JWT (`AuthPayload.isPremium`) and mirrored client-side in `session.ts`'s `Session.isPremium` — same 7-day-JWT staleness tradeoff that `is_admin` already had (admin toggling a user's flag needs a re-login to take effect). `resumeHtml.ts` exports `isPremiumTemplate()` / `FREE_TEMPLATES` as the single source of truth for what's gated; `POST/PUT /api/profiles` enforce it server-side, `ProfileForm.tsx` hides the extra `<option>`s client-side. The PUT route only blocks when the template is actually *changing* to a gated one the user can't use — not on unrelated-field saves of a profile that already has one persisted (e.g. from before a premium downgrade).
- **Generation:** Large prompts in `src/lib/prompts.ts`; job scrape via `jobScraper.ts` / Devora21 API; endpoints under `/api/resume/*`.
- **Exports:** docxtemplater for DOCX; Puppeteer HTML→PDF + client html2canvas/jspdf; resumes stored with `s3Key` via `storage.ts`.
- **Admin:** `/admin/users` + `/api/admin/users` for user CRUD.
- **Infra:** Docker Compose runs **app only**; DB is **MongoDB Atlas** via `MONGODB_URI` in `.env` (gitignored). DOCX templates on `./uploads`; PDFs in Backblaze B2.
- **API `POST /api/resume/generate-from-link`:** header `X-API-Key` + body `{ profileId, jobLink }` → `{ company, jobTitle, fileName, resumeDownloadLink }`. PDF uses shared `resumeHtml` (profile `pdfTemplate`) + `pdfFromHtml` (same Tailwind/fonts pipeline as UI). Filename matches UI: `Name_Title_Company`.
- **Shared PDF:** `src/lib/resumeHtml.ts` (10 templates) + `src/lib/pdfFromHtml.ts` used by generate-from-link and `/api/resume/pdf`. Client `review/page.tsx` has its own parallel React implementation of the same 10 header/section variants (Tailwind classes must stay byte-identical between the two — that's the "PDF parity" contract) since the client renders in-browser for on-screen review before the raw `outerHTML` is POSTed for Puppeteer rendering.
- **Sample codebase (`../sample`):** a sibling project that diverged from resume-builder. It's ahead on: 10 PDF templates (source of the ones ported in), a Bids-tracking feature (`BidDetail` model + `/api/bid-details` + `/bids` page), and two prompts.ts quality rules (global verb-repetition cap, banned buzzword list) — all now ported here. It's *behind* here on: B2/Puppeteer PDF storage, API-key auth for `generate-from-link`, admin API-key management UI, and several resilience fixes in `resume-generator/page.tsx` and `/api/resume/pdf` (abort-timeout, `stop_reason` check, disk-backup try/catch) — do not port those backward.
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
- **[2026-08-18] Migrated 10 PDF templates + Bids feature from `../sample`; added premium template gating**
  - User request: bring every *new* thing in sample into resume-builder (not just templates), then gate templates 4–10 behind admin-or-premium.
  - Compared every file between the two trees first (`comm`/`diff`) rather than copying wholesale — sample and resume-builder had diverged in both directions, and several of sample's file versions were regressions (e.g. its `mongodb.ts` silently falls back to `localhost` instead of requiring `MONGODB_URI`; its `resume-generator/page.tsx` and `/api/resume/pdf` lack the timeout/stop_reason/concurrency-guard resilience already present here). Only cherry-picked the genuinely new pieces.
  - Added `User.is_premium` (didn't exist in either codebase) since gating needed a real flag; wired it through JWT → session → ProfileForm dropdown → server-side enforcement in the profiles POST/PUT routes, following the exact pattern `is_admin` already used end-to-end.

