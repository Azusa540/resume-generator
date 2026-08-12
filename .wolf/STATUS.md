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

---

## 🚀 Next phase

**Goal:** _Awaiting user direction — codebase inventory complete; no next quest chosen yet._

### Acceptance criteria
1. User specifies what to build / fix / improve next

### Files to create / edit
| Type | File | Content |
|---|---|---|
| — | — | — |

### Closed decisions
- Stack is Next.js 16 + React 19 + MongoDB/Mongoose + Tailwind 4

### Open decisions
- What to work on next (features, bugs, UX, deploy, etc.)

---

## 📁 Active architecture

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Mongoose/MongoDB, JWT+cookie auth, bcrypt, OpenAI + Anthropic SDKs, docxtemplater/PizZip, Puppeteer, html2canvas/jspdf
- **Key modules:**
  - `src/models/` — User, Profile, Resume
  - `src/lib/` — auth, session, mongodb, prompts, jobScraper, docxBuilder, storage
  - `src/app/api/` — auth, profiles, resume generate/download/pdf, admin
  - Pages: login, dashboard, profiles CRUD, resume-generator + review, admin/users
- **Patterns:** JWT sessions in cookies; profiles owned by `userId`; generated resume staged in localStorage for review; optional per-profile DOCX template upload; `profileType` software vs other drives prompts

---

## ⚠️ External blockers (don't block coding)

- Needs env: `MONGODB_URI`, `JWT_SECRET`, `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`, optional `DEVORA21_*` scrape API, `CHROMIUM_PATH`

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
