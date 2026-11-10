# Developer docs

This app is built on a SvelteKit + Convex + Better Auth starter. The auth, user and organization
code came from the `@auth/svelte` jsrepo registry (see `jsrepo.config.ts`).

## Start here

| Doc | What it covers |
| --- | --- |
| [Working with Claude Code](./working-with-claude.md) | The session loop, what to type, reviewing, safety |
| [Store profile](../.agents/skills/store-app/references/store-profile.md) | The store itself: roadmap, what is built, decisions, what the client still has to dictate |

## Guides

Numbered in reading order.

| Doc | What it covers |
| --- | --- |
| [01 – Overview](./01-overview.md) | What the template contains and where it lives |
| [02 – Getting started](./02-getting-started.md) | Local setup, env vars, running the app, first admin |
| [03 – How auth works](./03-auth.md) | Request flow, route protection, reading the user in Convex and Svelte |
| [04 – Building features](./04-building-features.md) | Adding tables, functions and pages: a worked example |
| [05 – Configuration](./05-configuration.md) | Feature flags, sign-in providers, email, branding, deployment |
| [06 – Phone sign-in](./06-phone-otp.md) | Phone OTP architecture and the textbee → WhatsApp/Truecaller → Fast2SMS rollout |
| [07 – Email verification](./07-email-verification.md) | Resend setup, the verification flow, rate limits, troubleshooting |
| [08 – Environments and deployment](./08-environments-and-deployment.md) | Local / staging / production, the Vercel + Convex pipeline, CI, moving to production |
| [09 – Testing](./09-testing.md) | What Vitest and Playwright each test, running the e2e suite against dev |
| [10 – UI](./10-ui.md) | The look (chapters, neumorphism, editorial type), nested CSS, and the photo slots |

## Launch

| Doc | What it covers |
| --- | --- |
| [Launch checklist](./launch.md) | Taking the store from staging to aggarwalkart.in: decisions, accounts, env vars, DNS cutover, rollback |

## Old store (kept for reference)

Its code is in `legacy/`; nothing here describes the rebuilt store.

| Doc | What it covers |
| --- | --- |
| [Overview](./old-store/overview.md) | The old store's architecture and directory map |
| [Deployment checklist](./old-store/deployment.md) | The old store's pre-launch gaps, since replaced by the roadmap |
| [Security review](./old-store/security-review.md) | The 2026-06 review of the old store's Convex functions |

## Stack

- **SvelteKit 3** with Svelte 5 (runes) and TypeScript
- **Convex**: database, server functions, file storage, realtime (`convex-svelte`)
- **Better Auth**, running inside Convex via `@convex-dev/better-auth`
- **Tailwind CSS 4** + **Bits UI** primitives with our own palette (`src/themes/palette.css`), plus svelte-toolbelt
- **Resend** (Convex component) for transactional email
- **Phone OTP** via Better Auth's `phoneNumber` plugin, delivered by textbee / WhatsApp / Fast2SMS (`src/convex/otp/`)
- **pnpm** as the package manager
