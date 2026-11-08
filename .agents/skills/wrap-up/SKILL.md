---
name: wrap-up
description: Finish a work session on Aggarwal Kart. Runs the checks once, reviews the branch's diff against the store rules, records progress and decisions in the store profile, commits, and offers to push and open a draft PR, clears out stale branches, then tells the user how to try the work and what to ask the client. Use when the user says "wrap up", "we're done", "finish", "end the session", "open the PR", "save progress", or a roadmap step is complete.
---

# Wrap up

The next session only knows what this one wrote down. Leave the branch and the store profile so that
someone with no memory of today can carry on.

## Steps

1. **Checks, once each** (fix what fails, then rerun only the failing one):
   `pnpm check`, `npx tsc -p src/convex --noEmit`, `pnpm test`, `pnpm lint`. Run `pnpm build` too if
   routes, config or dependencies changed. Tests and build need `PUBLIC_CONVEX_URL` and
   `PUBLIC_CONVEX_SITE_URL` (any value works).
2. **Review the diff** (`git diff main...HEAD`) against the store rules:
   - every new Convex function calls exactly one guard and takes no `userId`
   - money is integer paise; prices come from the server
   - queries are bounded and use indexes
   - stock only changes through `adjustStock`
   - no phone numbers, emails, GSTIN, keys, real customer data or `.env` files
   - UI text is in `src/lib/store/strings.ts`
   - nothing under `legacy/` is deleted: `git diff --cached --diff-filter=D --name-only -- legacy` is empty
     Fix what you find, or list it for the user.
3. **Write it down** in `.agents/skills/store-app/references/store-profile.md`:
   - **Roadmap**: mark the step **built** (with today's date) or say what is left
   - **Status**: a few lines on what exists now, and the next step
   - **Decisions**: anything the user decided this session, with the date and the reason
   - **To dictate**: values that were filled in, and placeholders you used
     If commands, env vars or setup changed, update `AGENTS.md`, `.env.example` and `docs/` too.
4. **Commit** on the step branch (never on `main`). Check `git log -i --grep="co-authored-by"` finds
   nothing from this branch.
5. **Ask before pushing.** If the user agrees: `git push -u origin <branch>`, then
   `gh pr create --draft` with `.github/pull_request_template.md` filled in.
6. **Clear stale branches.** A branch is stale when its work is already on `main`.
   - `git fetch --prune`, then list candidates: `git branch --merged main`, branches whose upstream is
     `gone` (`git branch -vv`), and the head branches of merged PRs
     (`gh pr list --state merged --json headRefName`). PRs merged by squash or rebase don't show as
     merged to git, so the PR list is the check for those.
   - Never touch `main`, the branch you are on, the `old-store` tag, or any branch with unmerged work or
     an open PR. Show the user the list, say why each is stale, and wait for a yes.
   - Delete local ones with `git branch -d` (it refuses unmerged work; if a squash-merged branch is
     refused, confirm its PR is merged, then use `-D`). Delete the remote copy with
     `git push origin --delete <branch>` only if the user says so: that is outward-facing.
   - Nothing under `legacy/` is a branch, so this never removes old code.
7. **Report** to the user:
   - what was built, in plain words
   - how to try it: the exact commands and URLs (e.g. `pnpm dev`, then http://localhost:5173/schools)
   - which checks passed, and anything not checked
   - placeholders used and questions to send the client
   - what the next session will start with
   - which stale branches were removed, or are waiting for a yes
