# Desktop app: accounts and Awma

The Amarula desktop app signs in with this website's Clerk application, and an
active DAW subscription unlocks it. Awma, its assistant, sends its requests to
Claude through this website, which checks the subscription and its limits and
holds the Anthropic API key.

## Endpoints

| Route | What |
| --- | --- |
| `GET /api/desktop/entitlement` | Who the OAuth token belongs to, whether their subscription (`CLERK_DAW_PLAN_ID`) is active, and this month's Awma usage. The app checks it on sign-in and every 30 minutes. |
| `POST /api/awma/v1/messages` | Claude's Messages API for Awma, metered (`lib/awma/proxy.ts`). Awma's Claude Agent SDK uses `<origin>/api/awma` as its `ANTHROPIC_BASE_URL`. |
| `POST /api/awma/v1/messages/count_tokens` | Token counting for Awma (free, subscribers only). |

Both take the Clerk **OAuth access token** the app gets from the device flow, as `Authorization: Bearer`.

## Safeguards

Every Awma request is checked before it reaches Anthropic:

- **Signed in** with a valid Clerk OAuth token, and an **active subscription** to the DAW plan (canceled ones run to the end of their period). Entitlements are cached for five minutes.
- **Monthly allowance:** $15 of Anthropic usage per subscriber per month, counted from the subscription's period start (annual plans get a fresh allowance each month). Each response's cost is worked out from the usage Anthropic reports (`lib/awma/pricing.ts`, including cache reads and writes) and added up in Convex (`convex/awma.ts`), streamed replies included, and even when the app stops reading part way. At the limit, requests fail with a message saying when it resets; the app shows usage in Settings → Account.
- **Rate limits:** 30 requests a minute and 1,500 a day per user (token buckets), and at most 2 running at once.
- **Request limits:** only Awma's models (`claude-sonnet-5-5`, and `claude-haiku-5-5` for Claude Code's small background calls), responses capped at 32K tokens, bodies at 4 MB.
- The server's Anthropic key is never sent to the app, and Anthropic's authentication errors are reported as a generic service error.

A request that starts under the allowance can overshoot it by its own cost (at most two at once), so the effective cap is slightly above $15 in the worst case.

## Setup

1. **Convex:** run `bunx convex dev` to link a project (it writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`). Generate a secret (`openssl rand -hex 32`) and set it as `CONVEX_SERVER_SECRET` both in Convex (`bunx convex env set CONVEX_SERVER_SECRET …`, once per deployment) and in the website's environment; the Convex functions are public, and refuse calls without it. For production, set the Vercel build command to `bunx convex deploy --cmd 'bun run build'` with a `CONVEX_DEPLOY_KEY` from the Convex dashboard.
2. **Anthropic:** set `ANTHROPIC_API_KEY` (a key for a workspace dedicated to Awma, with a spend limit in the Anthropic Console as a last line of defence).
3. **Clerk OAuth application for the desktop app:** a public client with the device authorization grant and the scopes `openid profile email offline_access`. In the Clerk Dashboard → OAuth applications, or with the Clerk CLI (secret key in the environment):

   ```sh
   npx clerk@latest api oauth_applications -d '{
     "name": "Amarula for Mac",
     "scopes": "openid profile email offline_access",
     "public": true,
     "device_authorization_grant_enabled": true
   }'
   ```

   Note its client ID, and the instance's Frontend API URL (Clerk Dashboard → API keys, e.g. `https://clerk.amarula.app`).
4. **The desktop build:** in the desktop repository's GitHub settings → Actions variables, set `AMARULA_ACCOUNT_URL` (this website's origin), `AMARULA_CLERK_URL` (the Frontend API URL) and `AMARULA_CLERK_CLIENT_ID`. Release and nightly builds compile them in.

Use the development Clerk instance and a local website (`AMARULA_ACCOUNT_URL=http://localhost:3000`, set in the environment when launching the app) to try it before production.
