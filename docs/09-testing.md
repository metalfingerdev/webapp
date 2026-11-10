# 09 – Testing

Two layers, each for what it does best. Every test must be able to fail when the behaviour it
guards breaks. Don't add tests that restate a table, a string or static data, and don't test the
same thing at both layers.

| Layer | Command | Runs in CI | What belongs here |
| --- | --- | --- | --- |
| Vitest (`*.test.ts` next to the code) | `pnpm test` | yes | Convex functions through `convex-test` (refusals: signed out, another user's data, admin-only; money; idempotency; what public queries may expose) and pure logic with real edge cases (phone numbers, the OTP dispatcher). |
| Playwright (`tests/e2e/*.spec.ts`) | `pnpm test:e2e` | no | Real pages on a phone-sized Chromium against the **dev** deployment: which pages open for whom, and the main user paths. |

## Vitest

- Files that must not be deployed or run as tests carry two dots (`vitest.setup.ts`,
  `harness.testutils.ts`): Convex ignores such names, and Vitest only runs `*.test.ts`.
- `convex-test` doesn't mount the Better Auth component that the real access guards read. When you
  add guarded functions, replace the guards for every test in a `src/convex/vitest.setup.ts`
  (listed under `setupFiles` in `vitest.config.ts`) with stand-ins that read
  `ctx.auth.getUserIdentity()`: refuse a signed-out caller and take the user id from the identity.
  Cover the real guards in Playwright.
- Examples to copy: `src/convex/otp/phone.test.ts` (pure logic) and `src/convex/otp/send.test.ts`
  (a dispatcher with its channels mocked).

## Playwright

The suite creates accounts and changes data, so it only runs against a dev deployment.
`playwright.config.ts` refuses to start unless `CONVEX_DEPLOYMENT` is a `dev:` deployment and
`PUBLIC_CONVEX_URL` points at the same one.

### One-time setup

1. The dev deployment needs the console OTP channel (never on staging or production):
   `npx convex env set OTP_CHANNELS console` and `npx convex env set OTP_ALLOW_CONSOLE true`.
2. Add the test customer to `.env.local` (gitignored). Use a number that is not a real person's,
   in case dev is ever switched to real SMS:

   ```sh
   E2E_USER_PHONE=+91XXXXXXXXXX
   ```
3. `pnpm exec playwright install chromium` fetches the matching Chromium if it isn't cached.

### Running

```sh
pnpm test:e2e                          # starts pnpm dev on :5173 unless it is already running
pnpm test:e2e tests/e2e/access.spec.ts # one file
```

The `setup` project (`tests/e2e/auth.setup.ts`) signs the customer in once with phone OTP. The code
is read from `npx convex logs`, since the console channel prints it there; a new account is given the
name "Test Customer". The session is kept in `tests/e2e/.auth/customer.json` and reused while it is
valid. Without `E2E_USER_PHONE` the customer specs are skipped and say why.

`tests/e2e/checkout.spec.ts`, on a Pixel-sized Chromium:

- signed out, `/checkout` goes to sign-in;
- a customer sees "Access denied" on `/admin`, and an admin query called with the customer's own
  token is refused by `requireAppAdmin` (the real guard, which Vitest replaces with a stand-in);
- a cash on delivery order: an in-stock product into the cart, an address in Faridabad (121001) if
  none is saved, the order page shows the same total as checkout, then the order is cancelled so its
  stock goes back.

Paying online is not covered: Razorpay's test checkout is their own window. The money rules behind
it are in `src/convex/store/payments.test.ts`.
