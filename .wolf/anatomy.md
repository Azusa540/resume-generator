# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-08-18T23:34:46.052Z
> Files: 68 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.dockerignore` — Docker ignore rules (~54 tok)
- `.gitignore` — Git ignore rules (~616 tok)
- `CLAUDE.md` — OpenWolf (~58 tok)
- `db-run.bat` (~7 tok)
- `docker-compose.yml` — Docker Compose services (~244 tok)
- `Dockerfile` — Docker container definition (~166 tok)
- `eslint.config.mjs` — ESLint flat configuration (~200 tok)
- `next-env.d.ts` — / <reference types="next" /> (~87 tok)
- `next.config.ts` — Next.js configuration (~66 tok)
- `package-lock.json` — npm lock file (~90697 tok)
- `package.json` — Node.js package manifest (~332 tok)
- `postcss.config.mjs` — Declares config (~27 tok)
- `README.md` — Project documentation (~372 tok)
- `tsconfig.json` — TypeScript configuration (~202 tok)
- `tsconfig.tsbuildinfo` (~86474 tok)

## .claude/

- `settings.json` (~116 tok)

## .claude/commands/

- `reframe.md` — Mode: migrate [framework] (~561 tok)
- `security-audit.md` — Layer 1 — Dependencies (~520 tok)

## .claude/rules/

- `openwolf.md` (~332 tok)

## .cursor/rules/

- `openwolf.mdc` (~89 tok)

## .github/workflows/

- `ci.yml` — CI: CI (~355 tok)

## scripts/

- `generate-sample-template.mjs` — Run: node scripts/generate-sample-template.mjs (~2515 tok)

## src/app/

- `globals.css` — Styles: 3 rules, 8 vars, 1 media queries (~147 tok)
- `layout.tsx` — geistSans (~207 tok)
- `page.tsx` — RootPage — uses useRouter, useEffect (~97 tok)

## src/app/admin/users/

- `page.tsx` — AdminUsersPage — renders form, table — uses useRouter, useState, useEffect (~5138 tok)

## src/app/api/admin/users/

- `route.ts` — Next.js API route: GET, POST, PATCH, DELETE (~932 tok)

## src/app/api/admin/users/api-key/

- `route.ts` — Next.js API route: POST (~319 tok)

## src/app/api/auth/api-key/

- `route.ts` — Next.js API route: GET, POST (~295 tok)

## src/app/api/auth/login/

- `route.ts` — Next.js API route: POST (~474 tok)

## src/app/api/auth/logout/

- `route.ts` — Next.js API route: POST (~67 tok)

## src/app/api/auth/me/

- `route.ts` — Next.js API route: GET (~97 tok)

## src/app/api/auth/seed/

- `route.ts` — One-time endpoint to seed the admin account. (~176 tok)

## src/app/api/bid-details/

- `route.ts` — Side-effect import: ensures the Profile model is registered for populate() below. (~370 tok)

## src/app/api/profiles/

- `route.ts` — Next.js API route: GET, POST (~322 tok)

## src/app/api/profiles/[id]/

- `route.ts` — Next.js API route: PUT, DELETE (~554 tok)

## src/app/api/profiles/[id]/template/

- `route.ts` — Next.js API route: POST, DELETE (~749 tok)

## src/app/api/resume/[id]/download/

- `route.ts` — Next.js API route: GET (~275 tok)

## src/app/api/resume/download/

- `route.ts` — Next.js API route: POST (~681 tok)

## src/app/api/resume/generate-from-link/

- `route.ts` — Next.js API route: POST (~1543 tok)

## src/app/api/resume/generate/

- `route.ts` — Next.js API route: POST (~1015 tok)

## src/app/api/resume/pdf/

- `route.ts` — Next.js API route: POST (~459 tok)

## src/app/bids/

- `page.tsx` — profileName — renders table — uses useState, useEffect (~1245 tok)

## src/app/dashboard/

- `page.tsx` — DashboardPage — uses useRouter, useState, useEffect (~1530 tok)

## src/app/login/

- `page.tsx` — LoginPage — renders form — uses useRouter, useEffect, useState (~1392 tok)

## src/app/new-profile/

- `page.tsx` — NewProfilePage (~154 tok)

## src/app/profiles/

- `page.tsx` — ProfilesPage — uses useRouter, useState, useEffect (~1296 tok)

## src/app/profiles/[id]/edit/

- `page.tsx` — EditProfilePage — uses useRouter, useState, useEffect (~473 tok)

## src/app/resume-generator/

- `page.tsx` — isCompleteGenerated — renders form — uses useState, useEffect (~2876 tok)

## src/app/resume-generator/review/

- `page.tsx` — T1 — left-aligned, contacts as horizontal dot-separated row (~6737 tok)

## src/components/

- `Nav.tsx` — Nav — uses useRouter, useState, useEffect (~643 tok)
- `ProfileForm.tsx` — emptyEducation — renders form — uses useRouter, useState, useEffect (~5636 tok)

## src/hooks/

- `useSession.ts` — Exports useSession (~198 tok)

## src/lib/

- `apiKey.ts` — API routes: GET (2 endpoints) (~268 tok)
- `auth.ts` — API routes: GET (1 endpoints) (~152 tok)
- `docxBuilder.ts` — Exports buildTemplateVariables, renderDocx (~1400 tok)
- `jobScraper.ts` — Exports ScrapedJob, JobScrapeError, scrapeJobLink (~372 tok)
- `mongodb.ts` — Exports connectDB (~304 tok)
- `pdfFromHtml.ts` — Render resume HTML fragment to PDF using the same pipeline as /api/resume/pdf. (~350 tok)
- `prompts.ts` — Exports buildSystemPrompt (~18425 tok)
- `resumeHtml.ts` — template1–3 are free; template4–10 require admin or premium. (~4634 tok)
- `session.ts` — Exports saveSession, getSession, clearSession (~284 tok)
- `storage.ts` — Exports resumeKey, uploadResume, getSignedDownloadUrl, downloadResume (~646 tok)

## src/models/

- `BidDetail.ts` — Exports IBidDetail (~328 tok)
- `Profile.ts` — Exports IEducation, IEmployment, IProfile (~738 tok)
- `Resume.ts` — Exports IResume (~245 tok)
- `User.ts` — Exports IUser (~452 tok)

## src/types/

- `resume.ts` — Exports GeneratedEducation, GeneratedExperienceBullet, SkillCategories, GeneratedResume + 2 more (~342 tok)
