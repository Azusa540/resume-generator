# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-08-12T03:01:51.317Z
> Files: 59 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.dockerignore` — Docker ignore rules (~48 tok)
- `.gitignore` — Git ignore rules (~616 tok)
- `CLAUDE.md` — OpenWolf (~57 tok)
- `db-run.bat` (~7 tok)
- `docker-compose.yml` — Docker Compose services (~319 tok)
- `Dockerfile` — Docker container definition (~157 tok)
- `eslint.config.mjs` — ESLint flat configuration (~124 tok)
- `next-env.d.ts` — / <reference types="next" /> (~74 tok)
- `next.config.ts` — Next.js configuration (~66 tok)
- `package-lock.json` — npm lock file (~87998 tok)
- `package.json` — Node.js package manifest (~296 tok)
- `postcss.config.mjs` — Declares config (~26 tok)
- `README.md` — Project documentation (~363 tok)
- `tsconfig.json` — TypeScript configuration (~192 tok)
- `tsconfig.tsbuildinfo` (~84497 tok)

## .claude/

- `settings.json` (~627 tok)

## .claude/commands/

- `reframe.md` — Mode: migrate [framework] (~551 tok)
- `security-audit.md` — Layer 1 — Dependencies (~510 tok)

## .claude/rules/

- `openwolf.md` (~328 tok)

## .cursor/rules/

- `openwolf.mdc` (~87 tok)

## scripts/

- `generate-sample-template.mjs` — Run: node scripts/generate-sample-template.mjs (~2453 tok)
  - fn `rPr` L19-30 (~110 tok)
  - fn `run` L31-36 (~62 tok)
  - fn `tabRun` L37-43 (~63 tok)
  - fn `para` L44-61 (~191 tok)
  - fn `sectionHeading` L62-69 (~70 tok)
  - fn `loopMarker` L70-233 (~1972 tok)

## src/app/

- `globals.css` — Styles: 3 rules, 8 vars, 1 media queries (~140 tok)
- `layout.tsx` — geistSans (~197 tok)
- `page.tsx` — RootPage — uses useRouter, useEffect (~92 tok)

## src/app/admin/users/

- `page.tsx` — AdminUsersPage — renders form, table — uses useRouter, useState, useEffect (~3532 tok)
  - section `UserRow` L8-14 (~29 tok)
  - fn `AdminUsersPage` L15-241 (~3451 tok)

## src/app/api/admin/users/

- `route.ts` — Next.js API route: GET, POST, PATCH, DELETE (~789 tok)
  - fn `adminOnly` L7-14 (~82 tok)
  - fn `GET` L15-23 (~82 tok)
  - fn `POST` L24-38 (~227 tok)
  - fn `PATCH` L39-54 (~203 tok)
  - fn `DELETE` L55-66 (~138 tok)

## src/app/api/auth/login/

- `route.ts` — Next.js API route: POST (~436 tok)

## src/app/api/auth/logout/

- `route.ts` — Next.js API route: POST (~65 tok)

## src/app/api/auth/me/

- `route.ts` — Next.js API route: GET (~94 tok)

## src/app/api/auth/seed/

- `route.ts` — One-time endpoint to seed the admin account. (~171 tok)

## src/app/api/profiles/

- `route.ts` — Next.js API route: GET, POST (~238 tok)

## src/app/api/profiles/[id]/

- `route.ts` — Next.js API route: PUT, DELETE (~348 tok)

## src/app/api/profiles/[id]/template/

- `route.ts` — Next.js API route: POST, DELETE (~726 tok)
  - fn `POST` L12-53 (~396 tok)
  - fn `DELETE` L54-79 (~215 tok)

## src/app/api/resume/[id]/download/

- `route.ts` — Next.js API route: GET (~322 tok)

## src/app/api/resume/download/

- `route.ts` — Next.js API route: POST (~661 tok)
  - fn `POST` L9-71 (~565 tok)

## src/app/api/resume/generate-from-link/

- `route.ts` — Next.js API route: POST (~3123 tok)
  - fn `POST` L20-158 (~1327 tok)
  - section `ProfileContact` L159-166 (~36 tok)
  - fn `escapeHtml` L167-174 (~49 tok)
  - fn `renderBoldHtml` L175-178 (~36 tok)
  - fn `wrapPage` L179-192 (~90 tok)
  - fn `buildResumeHtml` L193-283 (~1368 tok)

## src/app/api/resume/generate/

- `route.ts` — Next.js API route: POST (~990 tok)
  - fn `POST` L11-91 (~861 tok)

## src/app/api/resume/pdf/

- `route.ts` — Max simultaneous Puppeteer browser instances (~856 tok)
  - fn `POST` L14-85 (~738 tok)

## src/app/dashboard/

- `page.tsx` — DashboardPage — uses useRouter (~500 tok)
  - fn `DashboardPage` L7-35 (~241 tok)
  - fn `DashCard` L36-65 (~217 tok)

## src/app/login/

- `page.tsx` — LoginPage — renders form — uses useRouter, useEffect, useState (~1352 tok)
  - fn `LoginPage` L7-117 (~1306 tok)

## src/app/new-profile/

- `page.tsx` — NewProfilePage (~149 tok)

## src/app/profiles/

- `page.tsx` — ProfilesPage — uses useRouter, useState, useEffect (~1259 tok)
  - section `Profile` L8-17 (~73 tok)
  - fn `ProfilesPage` L18-82 (~614 tok)
  - fn `ProfileCard` L83-130 (~518 tok)

## src/app/profiles/[id]/edit/

- `page.tsx` — EditProfilePage — uses useRouter, useState, useEffect (~458 tok)

## src/app/resume-generator/

- `page.tsx` — isCompleteGenerated — renders form — uses useState, useEffect (~2778 tok)
  - fn `isCompleteGenerated` L8-19 (~147 tok)
  - section `Profile` L20-26 (~32 tok)
  - section `FormData` L27-34 (~36 tok)
  - fn `ResumeGeneratorPage` L35-269 (~2501 tok)

## src/app/resume-generator/review/

- `page.tsx` — T1 — left-aligned, contacts as horizontal dot-separated row (~3678 tok)
  - fn `readReviewData` L8-19 (~81 tok)
  - fn `ResumeReviewPage` L20-124 (~1086 tok)
  - fn `ResumeDoc` L125-170 (~544 tok)
  - fn `Header` L171-177 (~119 tok)
  - fn `Header1` L178-195 (~243 tok)
  - fn `Header2` L196-213 (~246 tok)
  - fn `Header3` L214-241 (~316 tok)
  - fn `Section` L242-260 (~274 tok)
  - fn `ExpBlock` L261-283 (~296 tok)
  - fn `EduBlock` L284-297 (~155 tok)
  - fn `renderBold` L298-302 (~54 tok)
  - fn `contactList` L303-315 (~196 tok)

## src/components/

- `Nav.tsx` — Nav — uses useRouter, useState, useEffect (~596 tok)
  - fn `Nav` L8-66 (~537 tok)
- `ProfileForm.tsx` — emptyEducation — renders form — uses useRouter, useState (~5159 tok)
  - section `EducationEntry` L6-12 (~31 tok)
  - section `EmploymentEntry` L13-20 (~36 tok)
  - section `ProfileFormData` L21-42 (~153 tok)
  - section `Props` L43-47 (~23 tok)
  - fn `ProfileForm` L48-369 (~4208 tok)
  - fn `Field` L370-403 (~438 tok)
  - fn `PencilIcon` L404-412 (~112 tok)
  - fn `TrashIcon` L413-424 (~130 tok)

## src/hooks/

- `useSession.ts` — Exports useSession (~191 tok)

## src/lib/

- `auth.ts` — API routes: GET (1 endpoints) (~139 tok)
- `docxBuilder.ts` — Exports buildTemplateVariables, renderDocx (~1358 tok)
  - section `ProfileInfo` L5-16 (~128 tok)
  - fn `fixSplitTags` L17-53 (~298 tok)
  - fn `repairTemplate` L54-69 (~130 tok)
  - fn `buildTemplateVariables` L70-104 (~306 tok)
  - fn `renderDocx` L105-150 (~461 tok)
- `jobScraper.ts` — Exports ScrapedJob, JobScrapeError, scrapeJobLink (~360 tok)
- `mongodb.ts` — Exports connectDB (~251 tok)
- `prompts.ts` — Exports buildSystemPrompt (~17344 tok)
  - fn `buildSystemPrompt` L3-448 (~13146 tok)
  - fn `buildSystemPromptNonSoftware` L449-583 (~2998 tok)
  - fn `buildUserPrompt` L584-643 (~980 tok)
  - fn `calculateExperienceYears` L644-657 (~156 tok)
  - fn `extractYear` L658-663 (~50 tok)
- `session.ts` — Exports saveSession, getSession, clearSession (~242 tok)
- `storage.ts` — Exports resumeKey, uploadResume, downloadResume (~323 tok)

## src/models/

- `Profile.ts` — Exports IEducation, IEmployment, IProfile (~660 tok)
  - section `IEducation` L3-9 (~30 tok)
  - section `IEmployment` L10-17 (~36 tok)
  - section `IProfile` L18-83 (~575 tok)
- `Resume.ts` — Exports IResume (~237 tok)
- `User.ts` — Exports IUser (~382 tok)

## src/types/

- `resume.ts` — Exports GeneratedEducation, GeneratedExperienceBullet, SkillCategories, GeneratedResume, ResumeReviewData (~267 tok)
