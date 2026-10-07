# STATUS — resume-builder

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Update this file at the end of every work phase so the next `/clear` resumes in 1 read.
> Last updated: 2026-08-18

---

## ✅ Done

- Full Next.js App Router app scaffolded with auth, profiles, resume generation, review, and downloads
- MongoDB models: User, Profile, Resume
- AI generation via OpenAI/Anthropic with large prompt system (`src/lib/prompts.ts`)
- Job-link scrape → tailored resume (`/api/resume/generate-from-link`)
- DOCX templates (docxtemplater) + PDF via Puppeteer / client html2canvas+jspdf
- Admin user management (`/admin/users`)
- Docker Compose (app + MongoDB)
- **B2 storage for generate-from-link:** upload PDF → `Resume` backup row → JSON `{ company, jobTitle, resumeDownloadLink }` (presigned, 15m)
- `storage.ts`: env-validated S3 client, `uploadResume`, `getSignedDownloadUrl`
- `/api/resume/[id]/download` returns `{ url }` presigned link
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`; `B2_*` in `.env.example` + docker-compose
- API key auth for generate-from-link (`X-API-Key`); userId removed from body
- **Full PDF parity:** shared `resumeHtml.ts` (3 templates) + `pdfFromHtml.ts`; from-link uses UI filename + profile.pdfTemplate
- **Phase 1 CI:** `.github/workflows/ci.yml` runs lint + typecheck + build on push/PR to `master`
- **Migrated everything new from `../sample`:** 10 PDF templates (was 3) in `resumeHtml.ts` + `review/page.tsx`, gated so only admins or `User.is_premium` users get templates 4–10 (server-enforced in profiles POST/PUT, UI-hidden in `ProfileForm.tsx`); ported the Bids feature (`BidDetail` model, `POST/GET /api/bid-details`, `/bids` page, download auto-saves a bid — job title/company/link/date only, no job description by request); ported prompts.ts verb-cap + banned-buzzword rules. `is_premium` added to `User` model, JWT, and `session.ts`; set `true` on the `admin` user directly in Atlas. typecheck/lint/build all green.
- **Phase 2 CD:** `.github/workflows/deploy.yml` — triggers on `CI` workflow completion for `master` (or manual `workflow_dispatch` with a `ref` input for rollback/redeploy). SSHes into the VPS (`104.207.74.198`, root, key-based via `DEPLOY_SSH_KEY`/`DEPLOY_HOST`/`DEPLOY_USER` GitHub secrets) and does `git reset --hard <ref>` → `npm ci` → `npm run build` → `pm2 restart resume-generator --update-env` → health-check `127.0.0.1:3000`, auto-rolling back to the previous commit + rebuilding if the health check fails. Bootstrapped a dedicated ed25519 deploy key onto the VPS's `root/.ssh/authorized_keys` (previously password-only auth) — local copy of the private key was deleted after pushing it to GitHub Secrets, only GitHub holds it now. Landed on `development`; needs merge to `master` to go live.

---

## 🚀 Next phase

**Goal:** none queued. Phase 2 CD (below) just landed on `development` — next step is for the user to merge `development` → `master`, which will fire CI then the first automated deploy.

### Closed decisions
- Templates on disk; PDF-only in B2; backup-only Resume rows; presigned downloads (15 min TTL)
- generate-from-link: API key auth; body `{ profileId, jobLink }` → `{ company, jobTitle, fileName, resumeDownloadLink }`
- Full PDF parity via shared renderer + pdfFromHtml
- CI: lint + typecheck + build; Puppeteer Chromium skipped in CI
- **Deploy path resolved as SSH + PM2** (not docker compose/GHCR) — production actually runs via PM2 (`pm2 restart resume-generator`) + nginx reverse proxy, discovered by inspecting the live VPS. The repo's Dockerfile/docker-compose.yml are unused in production; left alone, not wired into CD.

---

## 📁 Active architecture

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Mongoose/MongoDB, JWT+cookie auth, bcrypt, OpenAI + Anthropic SDKs, docxtemplater/PizZip, Puppeteer, html2canvas/jspdf, Backblaze B2 via AWS S3 SDK
- **Key modules:**
  - `src/models/` — User, Profile, Resume
  - `src/lib/` — auth, session, mongodb, prompts, jobScraper, docxBuilder, storage (B2)
  - `src/app/api/` — auth, profiles, resume generate/download/pdf, admin
  - Pages: login, dashboard, profiles CRUD, resume-generator + review, admin/users
- **Patterns:** JWT sessions in cookies; profiles owned by `userId`; generated resume staged in localStorage for review; optional per-profile DOCX template upload; `profileType` software vs other drives prompts; PDF backups in B2 under `resumes/{userId}/{profileId}/`

---

## ⚠️ External blockers (don't block coding)

- Needs env: `MONGODB_URI`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `DEVORA21_*`, `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION`, `B2_KEY_ID`, `B2_APP_KEY`, optional `CHROMIUM_PATH`

---

## 🔧 Useful commands

```bash
npm run dev          # Next.js (webpack)
npm run build
docker compose up -d # Mongo + app
```

---

## 📚 References (read IF needed)

- `.wolf/cerebrum.md` — User Preferences + Do-Not-Repeat + Decision Log
- `.wolf/anatomy.md` — token-efficient file index
- `.wolf/buglog.json` — known bugs + fixes
