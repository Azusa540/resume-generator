# Memory

> Chronological action log. Hooks and AI append to this file automatically.
> Old sessions are consolidated by the daemon weekly.
| 00:08 | Codebase inventory for resume-builder | STATUS.md, cerebrum.md | Mapped stack, models, API routes, main UX flow | ~8k |
| 00:19 | Locked B2 storage decisions | cerebrum.md, STATUS.md | disk templates; PDF-only B2; presigned URLs; backup-only Resume rows | ~2k |
| 00:28 | generate-from-link ? B2 + JSON response | storage.ts, generate-from-link/route.ts, download route, env | company/jobTitle/resumeDownloadLink contract live | ~6k |
| 00:31 | Confirmed B2 creds via .env.local | .env.local | Names match storage.ts; file gitignored | ~1k |
| 00:39 | Diagnosed B2 403 InvalidAccessKeyId | .env.local, storage.ts | Wrong region us-west-004 vs us-east-005; upload OK after fix | ~4k |
| 00:42 | Renamed app metadata to Resume Builder | layout.tsx | title/description no longer Create Next App | ~0.5k |
| 08:08 | API key auth for generate-from-link | User.ts, apiKey.ts, routes, admin/dashboard UI | userId removed from body; X-API-Key header | ~8k |
| 11:38 | Add fileName to generate-from-link response | generate-from-link/route.ts | company, jobTitle, fileName, resumeDownloadLink | ~0.5k |
| 13:35 | Full PDF parity for generate-from-link | resumeHtml.ts, pdfFromHtml.ts, generate-from-link, pdf route | Shared templates + UI filename + fonts pipeline | ~12k |
| 22:48 | Phase 1 GitHub CI | ci.yml, package.json, eslint, User.ts | lint+typecheck+build workflow; local verify OK | ~6k |
| 00:19 | Atlas-only Docker compose + .env | docker-compose.yml, .env.example, mongodb.ts | Removed local mongo service; require MONGODB_URI | ~3k |
