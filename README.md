This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment (CI/CD)

Production runs at [resume.syntra.best](https://resume.syntra.best) on a VPS: PM2 manages the `resume-generator` Node process on port 3000, and nginx (with a Certbot-issued cert) reverse-proxies 443 → 3000. The app lives at `/var/www/resume-generator` on the server as a plain git checkout — deploys are `git reset --hard` + rebuild, not a container.

**Pipeline:** push/merge to `master` → `.github/workflows/ci.yml` (lint, typecheck, build) → on success, `.github/workflows/deploy.yml` SSHes into the VPS and:

1. `git fetch origin master && git reset --hard origin/master`
2. `npm ci && npm run build`
3. `pm2 restart resume-generator --update-env && pm2 save`
4. Health-checks `http://127.0.0.1:3000/`; if it doesn't come back healthy within ~24s, the workflow **automatically rolls back** to the previous commit, rebuilds, and restarts.

Deploy secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`) live in the repo's GitHub Actions secrets — never in this repo.

**Manual rollback:** run the `Deploy` workflow via *Actions → Deploy → Run workflow* with the `ref` input set to the last known-good commit SHA (or a tag). This redeploys that exact commit through the same build/health-check/rollback path. You can also SSH in directly and run the same steps by hand if GitHub Actions is unreachable.

**Manual redeploy:** the same `Run workflow` button with `ref` left blank deploys the current tip of `master` — useful if you need to re-run a deploy without a new commit.
