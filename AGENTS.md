<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Project-specific Convex conventions

After reading `src/convex/_generated/ai/guidelines.md`, also read
**`src/convex/CONVENTIONS.md`** — it documents where this repo deviates from
the generic guidelines. The highest-impact differences:

- **Auth is `@convex-dev/better-auth`**, not raw JWT. Get the user with
  `authComponent.safeGetAuthUser(ctx)` from `./auth.js` — `ctx.auth.getUserIdentity()`
  is not used here.
- **There is no `users` table.** Store owners as `userId: v.string()` holding
  `user._id`; never use `v.id('users')` / `Id<'users'>`.
- **Roles** live in the `userRoles` table (by email); guard admin/dashboard
  functions with `requireElevated` / `requireAdmin` from `src/convex/dashboard.ts`.
- Functions live in **`src/convex/`** and relative imports use **`.js`**
  extensions (`./_generated/server.js`).
- **Money is integer paise; GST rates are basis points.** Use `loadSettings` /
  `calculateOrder` (`src/convex/lib/`), not ad-hoc math.
