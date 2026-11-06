# Working with Claude Code on Aggarwal Kart

A guide for the person driving the sessions. Claude reads `AGENTS.md` and the skills on its own; this
page is for you.

## The loop: one roadmap step per session

1. Open a terminal in `webapp/` and start `claude`.
2. Type **`/next-step`**. Claude checks git, reads the roadmap, tells you which step is next and what it
   still needs from the client, makes a branch, and shows a plan.
3. Read the plan. Say what to change, or "approved". No code is written before you approve.
4. Let it build. It will stop to ask when a decision is yours (a fee, a set's contents, a GST question).
5. Type **`/wrap-up`**. Claude runs the checks once, reviews its own diff, writes progress and decisions
   into the store profile, commits, and tells you how to try it and what to ask the client.
6. Try it yourself (`pnpm dev`, then the URLs it gives you). If it's right, let it push and open a draft
   PR; merge when CI is green.
7. Type **`/clear`** before the next step, so the new session starts clean. Everything it needs is in
   the repo, not in the chat.

A big step can take more than one session. `/wrap-up` at the end of each; `/next-step` resumes the
unfinished branch.

## Useful things to type

| You want                     | Type                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Start or resume work         | `/next-step`                                                                       |
| Finish and save progress     | `/wrap-up`                                                                         |
| See where things stand       | "What's the status of the roadmap?"                                                |
| Record a client decision     | "Decision: shipping is ₹60, free above ₹999. Why: client, phone call 7 Nov."       |
| Questions to send the client | "Draft a WhatsApp message asking the client for what step 3 needs."                |
| A second opinion on a branch | `/code-review`                                                                     |
| Plan only, no edits          | press **Shift+Tab** until it shows plan mode                                       |
| Stop Claude right now        | **Esc**                                                                            |
| Run a command yourself       | `! git status`                                                                     |
| Switch model                 | `/model` (a stronger model for planning hard steps, a faster one for routine work) |

Say decisions with a reason. Claude writes them in the store profile with the date, so no future session
asks again, and the reason tells it how to handle the cases you didn't mention.

## Reviewing what Claude did

- Read its report: what was built, how to try it, what wasn't checked, placeholders it used.
- **Try it in the browser** at phone width (browser dev tools → device toolbar). Checks prove the code
  compiles; only you can say it is what the client wants.
- `git diff main --stat` shows which files changed. Many unrelated files changed is a warning sign: ask why.
- CI must be green on the PR before you merge.

## When something goes wrong

- **Press Esc** and say what's wrong. "Stop. Undo the last change." works.
- Work happens on a branch, so `main` is always safe. To throw a branch away:
  `git switch main` then `git branch -D step-<n>-<name>`.
- Ask before anything you don't understand: "What will this command do?"
- If Claude does any of these, stop it. They break the project's rules:
  - pushes, deploys or opens a PR without asking
  - runs a Convex command with `--prod`, or `npx convex deploy`, or a data import
  - writes the shop's phone, email, GSTIN or address, or a real customer's details, into the code
  - makes up a fee, a tax rate or a set's contents instead of asking
  - `git push --force`, or commits straight to `main`

## The git hooks

`pnpm install` turns on two checks that run on every commit (`.githooks/`):

- **commit-msg** refuses a Claude/Anthropic attribution line, so Claude never shows up as a contributor.
- **pre-commit** refuses a commit on `main`, a staged `.env` file, and lines that look like an Indian
  mobile number, a GSTIN, a Razorpay or Resend key, or a private key.

If it stops a commit, read the message: usually something must move to `/admin/settings` or an env var.
For a false positive (say a made-up test number), add the comment `allow-identifier` on that line. Skip
the checks entirely only when you're sure: `git commit --no-verify`. A fresh clone needs `pnpm install`
once for the hooks to be on (check with `git config core.hooksPath`, which should print `.githooks`).

## Secrets and client details

- The repo is **public**. Keys (Razorpay, Resend, Better Auth secret) go in Convex env vars. Type them
  **in your own terminal**, not in the Claude chat: `npx convex env set RAZORPAY_KEY_SECRET ...`.
  Anything pasted into a chat ends up in that session's logs.
- The shop's phone, GSTIN and address are typed into `/admin/settings` once that page exists (step 7).
- Use test data in dev. Never paste a real customer's details into a session.

## One-time setup checklist

- [x] GitHub: branch protection on `main` (PRs only).
- [ ] Convex: `npx convex dev` once to create your dev deployment, then the env vars in
      `docs/02-getting-started.md` (`BETTER_AUTH_SECRET`, `SITE_URL`, OTP console channel, `ADMIN_USER_IDS`).
- [ ] Vercel: a staging project linked to the repo (`docs/08-environments-and-deployment.md`).
- [ ] Razorpay: the **client's** account, test keys first (needed at step 6).
- [ ] Each step's client questions: Claude asks you when a step needs them (`/next-step` lists them);
      you get the answers from the client.
- [x] Accounts: you own them all for now. This repo is **staging**; the live store launches later from
      a separate repo, and who owns production is decided then (step 10 writes the launch checklist).

## Where things are written down

| What                                          | Where                                                  |
| --------------------------------------------- | ------------------------------------------------------ |
| Rules every session follows                   | `AGENTS.md`                                            |
| The store's facts, decisions, roadmap, status | `.agents/skills/store-app/references/store-profile.md` |
| How to build each part of the store           | `.agents/skills/store-app/`                            |
| Setup, auth, OTP, email, deploys, testing     | `docs/README.md`                                       |
