---
name: next-step
description: Start a work session on Aggarwal Kart. Finds the next roadmap step that isn't built, says what it builds and what it still needs from the client, creates or resumes its branch, and proposes a plan to approve before any code is written. Use when the user says "next step", "continue", "what's next", "let's start", "start a session", "pick up where we left off", or opens a session to build the store without saying what to do.
---

# Next step

Every session starts the same way, so nothing is skipped and nothing is built twice.

## Steps

1. **Check the ground.** `git status`, `git branch --show-current`, `git log --oneline -5`.
   - Uncommitted changes you didn't make this session: stop and ask what they are. Never discard them.
   - If a `step-*` branch exists that isn't merged (`git branch --no-merged main`), that step is in
     progress: resume it instead of starting a new one.
   - Otherwise start from an up-to-date `main` (`git switch main && git pull` if a remote is set).
2. **Read**, in this order: `.agents/skills/store-app/SKILL.md`, then
   `.agents/skills/store-app/references/store-profile.md` (**Roadmap**, **Status**, **To dictate**,
   **Decisions**), then the references the step names. AGENTS.md is already loaded.
3. **Tell the user**, in five lines or fewer:
   - which step and what it builds
   - what it retires from `legacy/` (or from `src/` before step 1)
   - which `TODO (dictate)` values or client inputs it needs, and whether they are in yet
   - anything from earlier steps left unfinished in **Status**
4. **Missing client inputs.** List them as plain questions the user can forward to the client. Offer to
   build with named placeholder constants meanwhile. Ask which they prefer; don't decide for them.
5. **Branch.** `git switch -c step-<n>-<short-name>` (or switch to the existing one).
6. **Plan before code.** Write a short plan: tables and functions, routes and components, which guard
   each function uses, what gets deleted, the tests (only ones that can fail), and how the user will try
   it. Ask the user to approve it. Write no code until they do.
7. **Build in small commits** on the branch, each one passing `pnpm check`. Commit messages are plain,
   with no attribution trailer.
8. When the step is done, or the session must end, run the `wrap-up` skill.

## Don'ts

- Don't work on two roadmap steps in one branch.
- Don't invent business values (fees, GST, set contents): placeholder constant + say so.
- Don't touch production: no `--prod` Convex commands, no deploys, no pushes to `main`.
