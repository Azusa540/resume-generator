# STATUS — resume-builder

> Single source of truth for resuming work. Read this FIRST when starting a session.
> Update this file at the end of every work phase so the next `/clear` resumes in 1 read.
> Last updated: 2026-08-12

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

---

## 🚀 Next phase

**Goal:** Optional — migrate `/api/resume/pdf` local disk writes to B2 the same way (UI PDF path still uses `uploads/resumes`).

### Acceptance criteria
1. `/api/resume/pdf` uploads to B2 + creates Resume row (parity with generate-from-link)

### Files to create / edit
| Type | File | Content |
|---|---|---|
| edit | `src/app/api/resume/pdf/route.ts` | uploadResume + Resume.create; drop local fs write |

### Closed decisions
- Templates on disk; PDF-only in B2; backup-only Resume rows; presigned downloads (15 min TTL)
- generate-from-link: API key auth; body `{ profileId, jobLink }` → `{ company, jobTitle, fileName, resumeDownloadLink }`
- Full PDF parity via shared renderer + pdfFromHtml

### Open decisions
- None

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
