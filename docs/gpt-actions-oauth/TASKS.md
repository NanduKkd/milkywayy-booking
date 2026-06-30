# GPT Actions OAuth task tracker

- Last updated: 2026-06-30
- Overall implementation status: `DONE`
- Current milestone: `Completed - First release development`

This is the authoritative progress tracker. Status values and update rules are defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Scope and decisions | `DONE` | 4 | 4 | 4-6 h |
| M1 - Authentication and configuration baseline | `DONE` | 5 | 5 | 8-12 h |
| M2 - OAuth persistence | `DONE` | 5 | 5 | 10-14 h |
| M3 - Authorization and token service | `DONE` | 8 | 8 | 22-30 h |
| M4 - GPT resource API and OpenAPI schema | `DONE` | 8 | 8 | 19-29 h |
| M5 - Verification and security release gates | `DONE` | 7 | 7 | 16-24 h |
| M6 - Deployment and ChatGPT UAT | `DONE` | 6 | 6 | 8-13 h |
| **Total** | `DONE` | **43** | **43** | **87-128 h** |

The task-level upper bound includes review and remediation contingency. The delivery target is 11-16 engineer-days when tasks proceed without major scope changes.

## M0 - Scope and decisions

### OAUTH-001 - Stabilize overlapping authentication work

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: None
- Evidence:
  - `git status --short` on branch `hotfix/28-06` recorded the unrelated in-progress dashboard/proxy/auth changes being intentionally retained while OAuth work proceeds separately.
  - `.gitignore` now excludes `Heap.*.heapprofile` and `report.*.json` artifacts from OAuth progress noise.
  - Baseline checks recorded before OAuth changes:
    - `npm test -- --runInBand` fails in `src/components/__tests__/DateSlotPicker.test.jsx` and `src/lib/actions/__tests__/coupons.test.js`.
    - `npm run lint` reports existing repository-wide Biome issues unrelated to OAuth implementation.

Acceptance criteria:

- Existing dashboard, proxy, package, and authentication-related worktree changes are committed, intentionally retained, or separated from OAuth work.
- The OAuth branch starts from a known revision and unrelated heap/profile artifacts are excluded.
- Existing baseline test and lint failures are recorded without being attributed to OAuth changes.

### OAUTH-002 - Confirm first-release use cases and scopes

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 1-2 h
- Depends on: OAUTH-001
- Evidence:
  - `DEC-009` records the approved first-release action surface: `/me`, bookings list/detail, invoices, and delivery-file metadata.
  - `DEC-010` records the accepted `customer:read` scope and consent text.
  - `DEC-005`, `DEC-009`, and `README.md` record the first-release exclusions for staff/admin access, binary delivery, direct storage links, and mutations.

Acceptance criteria:

- Product owner confirms `/me`, booking list/detail, invoice list, and delivery-file metadata as the complete first-release action surface.
- The `customer:read` scope and its consent text are accepted.
- Staff/admin access, binary file delivery, direct storage links, and all mutations are confirmed out of scope.
- `DECISIONS.md` contains the accepted outcome.

### OAUTH-003 - Create the Custom GPT integration record

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 1 h
- Depends on: OAUTH-002
- Evidence:
  - Added [INTEGRATION-RECORD.md](./INTEGRATION-RECORD.md) and later updated it on 2026-06-30 so it now records the active GPT ID `g-ee5af7c314d509d62dd77a325d900dc61acc399a`, the temporarily retained legacy GPT callback pair `g-6a42b42ce4788191b214fe0cee1aed9a`, the public-distribution target, the project-owner workspace assignment, the agreed `https://milkywayy.com` OAuth/action endpoints, the `customer:read` scope, and the no-client-secret storage rule.
  - Added `DEC-020` to `DECISIONS.md`, recording the GPT-specific callback values and the release consequence if the GPT ID or callback form changes.
  - Updated `OPERATIONS.md` so production provisioning now uses the exact GPT callback URLs instead of placeholders.

Acceptance criteria:

- The target GPT ID and owner/workspace are recorded securely.
- Public GPT distribution is recorded for the target GPT.
- All callback URLs displayed or documented for active GPTs are captured exactly.
- Production authorization URL, token URL, API domain, and requested scopes are agreed.
- Current privacy-policy, domain-verification, support-contact, and publication-review requirements shown by the GPT editor are assigned to the project owner.
- No client secret is committed to the repository or written into task documentation.

### OAUTH-004 - Complete OAuth threat model

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 1-2 h
- Depends on: OAUTH-002, OAUTH-003
- Evidence:
  - `DEC-018` records the accepted first-release threat model, residual risks, and explicit task/test mappings for redirect manipulation, CSRF/state loss, code replay, client impersonation, token theft, refresh replay, cross-user access, logging leakage, OTP abuse, and denial of service.

Acceptance criteria:

- Threats cover redirect manipulation, CSRF/state loss, code interception/replay, client impersonation, token theft, refresh replay, cross-user data access, logging leakage, OTP abuse, and denial of service.
- Each material threat maps to a task or test in this tracker.
- Residual risks and explicitly accepted limitations are documented in `DECISIONS.md`.

## M1 - Authentication and configuration baseline

### AUTH-001 - Add fail-closed OAuth configuration

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2 h
- Depends on: OAUTH-004
- Evidence:
  - Dedicated OAuth server config added in `src/lib/config/oauth.js`.
  - Production validation now fails closed for missing OAuth base URL, callback URIs, TTLs, and hashing peppers; development/test use explicit non-production defaults instead of production fallbacks.
  - Public secret env vars for token/client-secret peppers are rejected.
  - Focused verification passed:
    - `npx jest src/lib/config/__tests__/oauth.test.js src/lib/config/__tests__/session.test.js --runInBand`
    - `npx biome check src/lib/config/oauth.js src/lib/config/__tests__/oauth.test.js`

Acceptance criteria:

- OAuth configuration is parsed and validated once on server startup or first server-only import.
- Production refuses to serve OAuth endpoints when required secrets, base URLs, TTLs, or callback URIs are missing or invalid.
- Client secrets and token-related secrets are never exposed through `NEXT_PUBLIC_*` variables.
- Development and test configuration use explicit non-production values rather than production fallbacks.

### AUTH-002 - Extract reusable customer authentication service

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: AUTH-001
- Evidence:
  - Reusable OTP/customer verification logic extracted to `src/lib/services/customerAuth.js`.
  - `src/lib/actions/auth.js` now keeps cookie writes at the action layer while delegating OTP send/verify rules to the reusable service.
  - Targeted verification passed: `npx jest src/lib/services/__tests__/customerAuth.test.js src/lib/config/__tests__/session.test.js src/__tests__/proxy.test.js --runInBand`.

Acceptance criteria:

- OTP send/verify and customer lookup rules are reusable by normal login and OAuth interaction code.
- Framework-neutral verification logic does not read or write Next.js cookies.
- Existing website login behavior remains covered by tests and unchanged for users.
- OAuth protocol code does not call UI server actions directly.

### AUTH-003 - Remove unsafe session-secret fallback

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: AUTH-001
- Evidence:
  - Shared validated session config added in `src/lib/config/session.js`.
  - Session signing and verification now use the same configuration source in `src/lib/helpers/auth.js` and `src/proxy.js`.
  - Targeted verification passed: `npx jest src/lib/config/__tests__/session.test.js src/__tests__/proxy.test.js --runInBand`.

Acceptance criteria:

- Production has no default JWT/session secret.
- Session signing and verification use the same validated configuration source.
- Missing or invalid configuration fails safely and is covered by tests.
- Existing customer and admin routing tests pass.

### AUTH-004 - Add OTP abuse controls required by OAuth exposure

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: AUTH-002
- Evidence:
  - Stored OTP expiry, resend throttle, and bounded attempt metadata added on `users` via `src/lib/db/migrations/20260629000000-add-customer-auth-otp-controls.js` and `src/lib/db/models/user.js`.
  - PostgreSQL-backed hashed rate-limit buckets added via the same migration and reusable limiter service in `src/lib/services/oauthRateLimits.js`.
  - `src/lib/services/customerAuth.js` now enforces OTP expiry, resend throttling, per-phone/per-source rate limits, bounded verification attempts, and opaque verification IDs so send responses no longer reveal account existence.
  - UI callers updated to use the opaque `verificationId` contract in `src/components/DashboardLoginModal.js` and `src/components/LoginModal.js`.
  - Focused verification passed:
    - `npx jest src/lib/services/__tests__/customerAuth.test.js src/lib/services/__tests__/oauthRateLimits.test.js src/lib/config/__tests__/session.test.js src/__tests__/proxy.test.js --runInBand`
    - `npx biome check src/components/PhoneInput.js src/components/LoginModal.js src/components/DashboardLoginModal.js src/lib/services/customerAuth.js src/lib/services/oauthRateLimits.js src/lib/services/__tests__/customerAuth.test.js src/lib/services/__tests__/oauthRateLimits.test.js src/lib/actions/auth.js src/lib/db/models/user.js src/lib/db/models/oauthratelimit.js src/lib/db/models/index.js src/lib/db/migrations/20260629000000-add-customer-auth-otp-controls.js`

Acceptance criteria:

- OTPs have server-enforced expiry, bounded verification attempts, resend throttling, and per-phone/per-source rate limits.
- Successful verification or expiry clears locally stored OTP state.
- Responses do not allow practical customer-account enumeration.
- Rate-limit events are observable without logging the OTP or full phone number.

### AUTH-005 - Implement safe authorization resume behavior

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: AUTH-002, OAUTH-004
- Evidence:
  - Signed authorization-resume helpers added in `src/lib/oauth/authorizationResume.js` to preserve validated OAuth interaction details with the configured interaction TTL and safe local resume/error redirect paths.
  - `src/lib/contexts/auth.js` and `src/components/DashboardLoginModal.js` now let the shared OTP login flow resume only validated local OAuth interaction routes and return login cancellations to a safe local OAuth error route.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/authorizationResume.test.js src/lib/contexts/__tests__/auth.test.jsx --runInBand`
    - `npx biome check src/lib/oauth/authorizationResume.js src/lib/oauth/__tests__/authorizationResume.test.js src/lib/contexts/auth.js src/lib/contexts/__tests__/auth.test.jsx src/components/DashboardLoginModal.js`

Acceptance criteria:

- An anonymous authorization request can complete OTP login and resume the same validated OAuth interaction.
- The resume mechanism cannot redirect to an arbitrary external URL.
- Authorization requests expire and cannot be replayed indefinitely.
- Login cancellation returns a clear local error without leaking OAuth values.

## M2 - OAuth persistence

### DB-001 - Create OAuth database migrations

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: OAUTH-004
- Evidence:
  - Remaining OAuth persistence tables and indexes added in `src/lib/db/migrations/20260629010000-create-oauth-persistence.js`.
  - Existing PostgreSQL-backed OAuth rate-limit storage from `src/lib/db/migrations/20260629000000-add-customer-auth-otp-controls.js` remains the canonical limiter table required by `ARCHITECTURE.md`.
  - PostgreSQL-backed migration verification added in `src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js`.
  - Focused verification passed:
    - `npx jest src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js --runInBand`
    - `npx biome check src/lib/db/migrations/20260629010000-create-oauth-persistence.js src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js`

Acceptance criteria:

- Migrations create client, authorization-code, access-token, refresh-token, consent, audit-event, and PostgreSQL rate-limit storage described in `ARCHITECTURE.md`.
- Unique constraints, foreign keys, expiry/revocation indexes, and required timestamps are present.
- Raw secrets and raw tokens have no persistence columns.
- Migrations have a safe rollback path and are tested against PostgreSQL.

### DB-002 - Add Sequelize OAuth models and relations

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: DB-001
- Evidence:
  - Sequelize OAuth persistence models added in `src/lib/db/models/oauthclient.js`, `src/lib/db/models/oauthauthorizationcode.js`, `src/lib/db/models/oauthaccesstoken.js`, `src/lib/db/models/oauthrefreshtoken.js`, `src/lib/db/models/oauthconsent.js`, and `src/lib/db/models/oauthauditevent.js`.
  - Explicit OAuth associations to `User` and `OAuthClient` records, including refresh-token self-relations, added in `src/lib/db/relations.js`.
  - Sensitive hash fields are excluded from default model serialization through `src/lib/db/models/oauthmodelutils.js`.
  - Focused verification passed:
    - `npx jest src/lib/db/models/__tests__/oauthmodels.test.js --runInBand`
    - `npx biome check src/lib/db/models/oauthmodelutils.js src/lib/db/models/oauthclient.js src/lib/db/models/oauthauthorizationcode.js src/lib/db/models/oauthaccesstoken.js src/lib/db/models/oauthrefreshtoken.js src/lib/db/models/oauthconsent.js src/lib/db/models/oauthauditevent.js src/lib/db/models/__tests__/oauthmodels.test.js src/lib/db/models/index.js src/lib/db/relations.js`

Acceptance criteria:

- Models match migrations and follow project naming/import conventions.
- Relations to `User` and OAuth client records are explicit.
- Sensitive fields are excluded from default serialization where feasible.
- Model-level tests cover required constraints and expiry/revocation queries.

### DB-003 - Implement secure client provisioning

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: DB-002, OAUTH-003
- Evidence:
  - Reusable OAuth client provisioning and verification helpers added in `src/lib/oauth/clientProvisioning.js`, including approved callback allowlist enforcement, scope/auth-method validation, random client credential generation, and bcrypt client-secret hashing with the configured pepper.
  - Controlled operator script added in `scripts/provision-oauth-client.mjs` and exposed as `npm run oauth:provision-client`; it creates the client from runtime-supplied GPT callback values, prints the plaintext secret once, and persists only the hash.
  - Focused verification added in `src/lib/oauth/__tests__/clientProvisioning.test.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/clientProvisioning.test.js --runInBand`
    - `npx biome check src/lib/oauth/clientProvisioning.js src/lib/oauth/secrets.js src/lib/oauth/__tests__/clientProvisioning.test.js scripts/provision-oauth-client.mjs package.json`

Acceptance criteria:

- A controlled script or administrative procedure creates the ChatGPT client.
- The client ID is random and public; the client secret has sufficient entropy and is stored only as a password hash.
- The plaintext secret is shown once and transferred through an approved secure channel.
- Exact callback URLs, the allowed `customer:read` scope, and both permitted token endpoint authentication methods are stored.

### DB-004 - Implement token hashing and random-secret utilities

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: DB-002
- Evidence:
  - OAuth random-secret and lookup-hash helpers added in `src/lib/oauth/secrets.js`, including 256-bit opaque secret generation, SHA-256 lookup hashing with the configured pepper, and constant-time hash comparison helpers for token/code verification paths.
  - Focused verification added in `src/lib/oauth/__tests__/secrets.test.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/secrets.test.js --runInBand`
    - `npx biome check src/lib/oauth/secrets.js src/lib/oauth/__tests__/secrets.test.js`

Acceptance criteria:

- Authorization codes and tokens use a cryptographically secure random generator with at least 256 bits of entropy.
- Only deterministic hashes required for lookup are persisted.
- Secret comparison avoids timing-sensitive direct string comparison where relevant.
- Unit tests verify format, uniqueness assumptions, hash lookup, and absence of raw values.

### DB-005 - Add expired/revoked artifact cleanup

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2 h
- Depends on: DB-002
- Evidence:
  - Bounded OAuth artifact cleanup service added in `src/lib/oauth/cleanup.js`, covering expired authorization codes, expired/revoked access tokens, expired/revoked refresh tokens, expired rate-limit buckets, and expired audit-retention rows.
  - Protected internal cleanup endpoint added in `src/app/api/internal/oauth/cleanup/route.js` and scheduled PM2 worker added in `scripts/oauth-cleanup-worker.mjs` with `npm run worker:oauth-cleanup`.
  - Operational ownership and schedule documented in `ARCHITECTURE.md`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/cleanup.test.js src/app/api/internal/oauth/cleanup/__tests__/route.test.js --runInBand`
    - `npx biome check src/lib/oauth/cleanup.js src/lib/oauth/__tests__/cleanup.test.js src/app/api/internal/oauth/cleanup/route.js src/app/api/internal/oauth/cleanup/__tests__/route.test.js scripts/oauth-cleanup-worker.mjs docs/gpt-actions-oauth/ARCHITECTURE.md docs/gpt-actions-oauth/SECURITY-TEST-PLAN.md docs/gpt-actions-oauth/TASKS.md package.json`

Acceptance criteria:

- A bounded cleanup operation removes expired codes, retired tokens, expired rate-limit buckets, and audit events older than 30 days according to retention policy.
- Cleanup cannot delete active grants or block token issuance for an unbounded period.
- Scheduling and operational ownership are documented.

## M3 - Authorization and token service

### FLOW-001 - Implement authorization-request validator

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: AUTH-005, DB-002
- Evidence:
  - Reusable authorization-request validation added in `src/lib/oauth/authorizationRequest.js`, including exact redirect-URI matching, duplicate critical-parameter rejection, client enablement checks, and server/client scope allowlists.
  - Focused invalid-request coverage added in `src/lib/oauth/__tests__/authorizationRequest.test.js` for valid requests plus missing state, duplicated parameters, unknown/disabled clients, exact callback mismatches, embedded-host attacks, unsupported response types, and invalid scopes.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/authorizationRequest.test.js --runInBand`
    - `npx biome check src/lib/oauth/authorizationRequest.js src/lib/oauth/__tests__/authorizationRequest.test.js`

Acceptance criteria:

- Validator enforces `response_type=code`, known client, exact redirect URI, non-empty `state`, and allowed scopes.
- No error is redirected to an unvalidated URI.
- Unsupported or duplicated critical parameters fail predictably.
- Unit tests cover valid requests and the complete invalid-request matrix.

### FLOW-002 - Implement authorization interaction page

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-5 h
- Depends on: FLOW-001, AUTH-005
- Evidence:
  - OAuth authorization UI added in `src/app/oauth/authorize/page.js` with a dedicated login gate in `src/app/oauth/authorize/AuthorizeLoginGate.jsx`, local error handling in `src/app/oauth/authorize/error/page.jsx`, and safe resume routing in `src/app/oauth/authorize/resume/route.js`.
  - CSRF-protected approval and denial POST handling added in `src/app/oauth/authorize/decision/route.js` using signed decision state from `src/lib/oauth/authorizationDecision.js`, a one-time CSRF proof bound into the signed decision token via `src/lib/oauth/authorizationCsrf.js`, and shared interaction normalization in `src/lib/oauth/interaction.js`.
  - Human-readable scope rendering added in `src/lib/oauth/scopes.js`, and the existing resume helper now reuses the shared interaction normalization in `src/lib/oauth/authorizationResume.js`.
  - Focused verification passed:
    - `npx jest src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/resume/__tests__/route.test.js src/app/oauth/authorize/decision/__tests__/route.test.js src/lib/oauth/__tests__/authorizationResume.test.js --runInBand`
    - `npx biome check src/app/oauth/authorize/page.js src/app/oauth/authorize/AuthorizeLoginGate.jsx src/app/oauth/authorize/error/page.jsx src/app/oauth/authorize/resume/route.js src/app/oauth/authorize/decision/route.js src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/resume/__tests__/route.test.js src/app/oauth/authorize/decision/__tests__/route.test.js src/lib/oauth/interaction.js src/lib/oauth/authorizationResume.js src/lib/oauth/authorizationCsrf.js src/lib/oauth/authorizationDecision.js src/lib/oauth/scopes.js src/lib/oauth/__tests__/authorizationResume.test.js`

Acceptance criteria:

- Logged-out customers are sent through the shared login flow and returned safely.
- Logged-in customers see the requesting client and human-readable scopes.
- Approval and denial use CSRF-protected POST operations.
- The page does not expose the client secret, raw session token, or unsafe redirect links.

### FLOW-003 - Issue and atomically consume authorization codes

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: FLOW-001, FLOW-002, DB-004
- Evidence:
  - Reusable authorization-code issue/consume service added in `src/lib/oauth/authorizationCodes.js`, including transaction-backed issuance, row-locked atomic consumption, client/redirect/expiry/replay validation, and safe audit persistence without raw code logging.
  - The authorization approval route now delegates code issuance to the shared service in `src/app/oauth/authorize/decision/route.js`.
  - Focused verification added in `src/lib/oauth/__tests__/authorizationCodes.test.js` and route coverage updated in `src/app/oauth/authorize/decision/__tests__/route.test.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/authorizationCodes.test.js src/app/oauth/authorize/decision/__tests__/route.test.js --runInBand`
    - `npx biome check src/lib/oauth/authorizationCodes.js src/lib/oauth/__tests__/authorizationCodes.test.js src/app/oauth/authorize/decision/route.js src/app/oauth/authorize/decision/__tests__/route.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Codes are short-lived, one-time, hashed at rest, and bound to client, user, redirect URI, and scopes.
- Code consumption is atomic under concurrent requests.
- A replay returns `invalid_grant` and never issues an additional token.
- Successful and failed events are audited without logging the code.

### FLOW-004 - Implement OAuth client authentication

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: DB-003
- Evidence:
  - Reusable OAuth client-authentication service added in `src/lib/oauth/clientAuthentication.js`, including strict `client_secret_post` and `client_secret_basic` parsing, duplicate/conflict rejection, per-client PostgreSQL-backed rate limiting, registered-method enforcement, and generic `invalid_client` failures that do not reveal whether the client is unknown, disabled, or has a bad secret.
  - Focused verification added in `src/lib/oauth/__tests__/clientAuthentication.test.js` for valid `client_secret_post` and `client_secret_basic` authentication plus missing, duplicated, conflicting, malformed, rate-limited, disabled, and invalid-secret scenarios.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/clientAuthentication.test.js --runInBand`
    - `npx biome check src/lib/oauth/clientAuthentication.js src/lib/oauth/__tests__/clientAuthentication.test.js`

Acceptance criteria:

- Both `client_secret_post` and `client_secret_basic` are explicitly supported and tested for the registered ChatGPT client.
- Missing, duplicated, conflicting, and malformed credentials are rejected.
- Unknown, disabled, or invalid clients receive standards-compatible failures without useful secret-oracle behavior.
- Client authentication is rate limited.
- Client secrets never appear in errors or logs.

### FLOW-005 - Implement authorization-code token exchange

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: FLOW-003, FLOW-004
- Evidence:
  - OAuth authorization-code exchange service added in `src/lib/oauth/tokenExchange.js`, including strict form parameter validation, atomic code consumption plus token issuance in one transaction, hashed access/refresh-token persistence, and optional PKCE binding validation for future client types.
  - OAuth token endpoint added in `src/app/oauth/token/route.js` with form-encoded request handling, `client_secret_post` / `client_secret_basic` authentication reuse, safe OAuth error mapping, and `no-store` token responses.
  - Focused verification added in `src/lib/oauth/__tests__/tokenExchange.test.js` and `src/app/oauth/token/__tests__/route.test.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/tokenExchange.test.js src/app/oauth/token/__tests__/route.test.js src/lib/oauth/__tests__/authorizationCodes.test.js src/lib/oauth/__tests__/clientAuthentication.test.js --runInBand`
    - `npx biome check src/lib/oauth/tokenExchange.js src/lib/oauth/authorizationCodes.js src/lib/oauth/__tests__/tokenExchange.test.js src/app/oauth/token/route.js src/app/oauth/token/__tests__/route.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- `POST /oauth/token` accepts form-encoded authorization-code requests.
- Client, code, redirect URI, expiry, consumption, and optional PKCE binding are validated.
- The response contains `access_token`, `token_type=bearer`, `expires_in`, `refresh_token`, and granted `scope`.
- OAuth errors use safe HTTP status codes and response bodies.

### FLOW-006 - Implement rotating refresh tokens

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: FLOW-004, DB-004
- Evidence:
  - Refresh-token rotation and replay handling added in `src/lib/oauth/tokenExchange.js`, including `grant_type=refresh_token` parsing, row-locked refresh-token consumption, subset scope validation, parent-token chaining, and family-wide revocation plus a high-severity audit event on replay.
  - The token endpoint now delegates both authorization-code and refresh grants through the shared exchange entrypoint in `src/app/oauth/token/route.js`.
  - Focused refresh coverage added in `src/lib/oauth/__tests__/tokenExchange.test.js` and `src/app/oauth/token/__tests__/route.test.js` for successful rotation, scope-expansion rejection, family revocation on replay, and route-level refresh exchanges.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/tokenExchange.test.js src/app/oauth/token/__tests__/route.test.js src/lib/oauth/__tests__/authorizationCodes.test.js src/lib/oauth/__tests__/clientAuthentication.test.js --runInBand`
    - `npx biome check src/lib/oauth/tokenExchange.js src/lib/oauth/__tests__/tokenExchange.test.js src/app/oauth/token/route.js src/app/oauth/token/__tests__/route.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Refresh requests authenticate the client and validate token ownership, scope, expiry, and revocation.
- Each successful exchange consumes the prior refresh token and returns a replacement.
- Reuse of a consumed refresh token revokes its family and emits a high-severity event.
- Concurrent refresh attempts have deterministic, tested behavior.

### FLOW-007 - Implement consent persistence and revocation

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: FLOW-002, DB-002
- Evidence:
  - Shared OAuth consent and revocation service added in `src/lib/oauth/consent.js`, covering active-consent lookup, reconnect scope checks, persisted consent upgrades, active-connection listing, and client/user-scoped revocation of both access and refresh tokens.
  - Authorization screens now use persisted consent state in `src/app/oauth/authorize/page.js`, and approval now records consent before code issuance in `src/app/oauth/authorize/decision/route.js`.
  - Customer-managed dashboard revocation added through `src/app/dashboard/connections/page.js`, `src/app/dashboard/layout.js`, and `src/app/oauth/revoke/route.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/consent.test.js src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/decision/__tests__/route.test.js src/app/dashboard/connections/__tests__/page.test.jsx src/app/oauth/revoke/__tests__/route.test.js --runInBand`
    - `npx biome check src/lib/oauth/consent.js src/lib/oauth/__tests__/consent.test.js src/app/oauth/authorize/page.js src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/decision/route.js src/app/oauth/authorize/decision/__tests__/route.test.js src/app/dashboard/connections/page.js src/app/dashboard/connections/__tests__/page.test.jsx src/app/oauth/revoke/route.js src/app/oauth/revoke/__tests__/route.test.js src/app/dashboard/layout.js`

Acceptance criteria:

- Granted scopes are persisted per customer and client.
- A scope increase requires new consent.
- Customers can revoke the connection, which revokes active tokens and refresh families.
- Revocation takes effect before subsequent resource API authorization.

### FLOW-008 - Add OAuth protocol audit events and metrics

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3 h
- Depends on: FLOW-003, FLOW-005, FLOW-006
- Evidence:
  - Shared OAuth audit emitter added in `src/lib/oauth/audit.js`, with 30-day persistence, structured `[OAUTH_AUDIT]` / `[OAUTH_METRIC]` logs, correlation IDs, bounded metadata sanitization, and explicit fail-open/fail-closed behavior.
  - Existing authorization-code and token-exchange services now emit through the shared audit path in `src/lib/oauth/authorizationCodes.js` and `src/lib/oauth/tokenExchange.js`, preserving code replay, token issue, refresh, and refresh reuse telemetry while adding metric classification for suspicious failures.
  - Missing protocol telemetry added for invalid clients, invalid redirect attempts, authorization approval/denial, and customer revocation in `src/lib/oauth/clientAuthentication.js`, `src/app/oauth/authorize/page.js`, `src/app/oauth/authorize/decision/route.js`, and `src/app/oauth/revoke/route.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/audit.test.js src/lib/oauth/__tests__/clientAuthentication.test.js src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/decision/__tests__/route.test.js src/app/oauth/revoke/__tests__/route.test.js src/lib/oauth/__tests__/authorizationCodes.test.js src/lib/oauth/__tests__/tokenExchange.test.js --runInBand`
    - `npx biome check src/lib/oauth/audit.js src/lib/oauth/authorizationCodes.js src/lib/oauth/tokenExchange.js src/lib/oauth/clientAuthentication.js src/app/oauth/authorize/page.js src/app/oauth/authorize/decision/route.js src/app/oauth/revoke/route.js src/lib/oauth/__tests__/audit.test.js src/lib/oauth/__tests__/clientAuthentication.test.js src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/decision/__tests__/route.test.js src/app/oauth/revoke/__tests__/route.test.js`

Acceptance criteria:

- Events cover authorization success/denial, invalid client, invalid redirect, code replay, token issue, refresh, refresh reuse, and revocation.
- Metrics distinguish normal user denial from suspicious failures.
- Events are persisted in the database for 30 days and also emitted as structured logs.
- Audit records and logs contain correlation IDs and safe identifiers but no raw authorization artifacts.

## M4 - GPT resource API and OpenAPI schema

### API-001 - Implement Bearer-token authorization middleware

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: FLOW-005
- Evidence:
  - Framework-light access-token validation added in `src/lib/oauth/accessTokens.js`, including hashed token lookup, active-token resolution, revoked/expired/unknown token rejection, and customer-only principal validation.
  - GPT resource API Bearer auth helper added in `src/app/api/gpt/v1/_lib/auth.js`, including Authorization header parsing, scope enforcement, standardized `WWW-Authenticate` headers, and JSON error responses that do not disclose protected data.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/accessTokens.test.js src/app/api/gpt/v1/_lib/__tests__/auth.test.js --runInBand`
    - `npx biome check src/lib/oauth/accessTokens.js src/lib/oauth/__tests__/accessTokens.test.js src/app/api/gpt/v1/_lib/auth.js src/app/api/gpt/v1/_lib/__tests__/auth.test.js`

Acceptance criteria:

- Middleware accepts a standard Bearer token and rejects missing, malformed, expired, revoked, or unknown tokens.
- The resolved principal contains customer ID, client ID, and granted scopes only.
- Required-scope checks return `403` without disclosing protected data.
- No OAuth token is accepted as a website session cookie or vice versa.

### API-002 - Define stable GPT API DTOs and pagination

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: OAUTH-002
- Evidence:
  - Shared GPT API DTO and pagination helpers added in `src/app/api/gpt/v1/_lib/dtos.js`, including runtime-validated connected-account, booking, invoice, and delivery-file response shapes, strict query parsing, allowlisted filters, bounded date windows, and opaque cursor handling for stable descending pagination.
  - Focused validation and serialization coverage added in `src/app/api/gpt/v1/_lib/__tests__/dtos.test.js`.
  - Focused verification passed:
    - `npx jest src/app/api/gpt/v1/_lib/__tests__/dtos.test.js --runInBand`
    - `npx biome check src/app/api/gpt/v1/_lib/dtos.js src/app/api/gpt/v1/_lib/__tests__/dtos.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Request schemas and response DTOs are runtime validated.
- Lists have enforced maximum page sizes and stable cursor pagination.
- Date, status, and identifier filters are allowlisted and bounded.
- Responses exclude internal database fields, PII not required by the action, and binary content.

### API-003 - Implement connected-account endpoint

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: API-001, API-002
- Evidence:
  - `GET /api/gpt/v1/me` added in `src/app/api/gpt/v1/me/route.js`, requiring `customer:read`, loading only the minimal customer profile fields needed for the approved account DTO, and failing safely when the token principal no longer resolves to a customer.
  - Focused route coverage added in `src/app/api/gpt/v1/me/__tests__/route.test.js` for valid customer responses plus revoked-token, deleted-user, and non-customer principal cases.
  - Focused verification passed:
    - `npx jest src/app/api/gpt/v1/me/__tests__/route.test.js --runInBand`
    - `npx biome check src/app/api/gpt/v1/me/route.js src/app/api/gpt/v1/me/__tests__/route.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- `GET /api/gpt/v1/me` requires `customer:read`.
- It returns only the minimal data approved in the consent description.
- Customer, staff, deleted-user, and revoked-token behavior is tested.

### API-004 - Implement booking read endpoints

- Status: `DONE`
- Owner: `Codex`
- Estimate: 4-6 h
- Depends on: API-001, API-002
- Evidence:
  - `GET /api/gpt/v1/bookings` added in `src/app/api/gpt/v1/bookings/route.js`, requiring `customer:read`, applying authenticated-customer ownership filters before optional booking-code/date/status filters, and returning stable descending cursor pagination with bounded DTOs only.
  - `GET /api/gpt/v1/bookings/{bookingCode}` added in `src/app/api/gpt/v1/bookings/[bookingCode]/route.js`, resolving only customer-owned bookings by public booking code and returning safe `404` responses for malformed, missing, or other-customer records.
  - Legacy public booking-code fallback for older rows without a persisted `bookingCode` added in `src/lib/helpers/invoice-format.js`, so GPT detail/list lookups stay consistent with the public identifiers serialized elsewhere.
  - Focused verification passed:
    - `npx jest --runTestsByPath 'src/app/api/gpt/v1/bookings/__tests__/route.test.js' 'src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js'`
    - `npx biome check 'src/app/api/gpt/v1/bookings/route.js' 'src/app/api/gpt/v1/bookings/[bookingCode]/route.js' 'src/app/api/gpt/v1/bookings/__tests__/route.test.js' 'src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js' 'src/lib/helpers/invoice-format.js'`

Acceptance criteria:

- List and detail endpoints require `customer:read`.
- Every query filters by the authenticated customer before applying requested identifiers.
- Detail lookup uses a stable public booking identifier and returns `404` for unavailable or other-customer records.
- Responses are bounded, deterministic, and covered by cross-customer authorization tests.

### API-005 - Implement invoice metadata endpoint

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: API-001, API-002
- Evidence:
  - `GET /api/gpt/v1/invoices` added in `src/app/api/gpt/v1/invoices/route.js`, requiring `customer:read`, applying authenticated-customer ownership filters before optional invoice-number, paid-date, and status filters, and returning bounded invoice metadata DTOs with safe dashboard links only.
  - Legacy public invoice-number fallback matching added in the same route so stored rows without `invoiceNumber` can still be queried by their stable `INV-######` identifier.
  - Focused route coverage added in `src/app/api/gpt/v1/invoices/__tests__/route.test.js` for valid customer responses plus malformed-query and invalid-token failures.
  - Focused verification passed:
    - `npx jest src/app/api/gpt/v1/invoices/__tests__/route.test.js --runInBand`
    - `npx biome check src/app/api/gpt/v1/invoices/route.js src/app/api/gpt/v1/invoices/__tests__/route.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Invoice listing requires `customer:read` and filters by authenticated customer.
- The response contains metadata and safe website navigation links, not PDF bytes or unrestricted storage URLs.
- Payment-provider internals and other customers' invoice existence are not exposed.

### API-006 - Add resource rate limits and response bounds

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: API-001
- Evidence:
  - Shared GPT resource throttling added in `src/app/api/gpt/v1/_lib/auth.js`, applying PostgreSQL-backed per-client and per-customer buckets after Bearer-token resolution so limits remain effective across PM2 restarts and multiple web processes.
  - Shared GPT runtime safeguards added in `src/app/api/gpt/v1/_lib/runtime.js`, enforcing an 80,000-character response ceiling and a 15-second route deadline so resource responses stay materially below the platform's 100,000-character and 45-second limits.
  - Existing GPT resource endpoints in `src/app/api/gpt/v1/me/route.js`, `src/app/api/gpt/v1/bookings/route.js`, `src/app/api/gpt/v1/bookings/[bookingCode]/route.js`, and `src/app/api/gpt/v1/invoices/route.js` now map limiter failures to `429` with `Retry-After` guidance and map budget overruns to safe temporary-unavailable responses.
  - Focused coverage added in `src/app/api/gpt/v1/_lib/__tests__/auth.test.js`, `src/app/api/gpt/v1/_lib/__tests__/runtime.test.js`, and the GPT route tests for `/me`, bookings list/detail, and invoices.
  - Focused verification passed:
    - `npx jest --runInBand --runTestsByPath src/app/api/gpt/v1/_lib/__tests__/auth.test.js src/app/api/gpt/v1/_lib/__tests__/runtime.test.js src/app/api/gpt/v1/me/__tests__/route.test.js src/app/api/gpt/v1/bookings/__tests__/route.test.js src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js src/app/api/gpt/v1/invoices/__tests__/route.test.js`
    - `npx biome check src/app/api/gpt/v1/_lib/auth.js src/app/api/gpt/v1/_lib/runtime.js src/app/api/gpt/v1/_lib/__tests__/auth.test.js src/app/api/gpt/v1/_lib/__tests__/runtime.test.js src/app/api/gpt/v1/me/route.js src/app/api/gpt/v1/me/__tests__/route.test.js src/app/api/gpt/v1/bookings/route.js src/app/api/gpt/v1/bookings/[bookingCode]/route.js src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js src/app/api/gpt/v1/bookings/__tests__/route.test.js src/app/api/gpt/v1/invoices/route.js src/app/api/gpt/v1/invoices/__tests__/route.test.js`

Acceptance criteria:

- Limits are applied by client and user, with stricter controls for authentication endpoints.
- PostgreSQL counter updates are atomic and remain effective across PM2 restarts and multiple web processes.
- Exceeded limits return `429` with safe retry guidance.
- Endpoint time and payload budgets stay materially below 45 seconds and 100,000 characters.

### API-007 - Create and validate the GPT Action OpenAPI schema

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: API-003, API-004, API-005, API-008
- Evidence:
  - Importable GPT Action OpenAPI artifact added in `docs/gpt-actions-oauth/gpt-action-openapi.json`, exposing only the approved read-only `/me`, bookings list/detail, invoices, and files operations on the production `https://milkywayy.com` server with `customer:read` OAuth security.
  - Validator-backed regression coverage added in `docs/gpt-actions-oauth/__tests__/gpt-action-openapi.test.js`, asserting OpenAPI validity, approved operation IDs and paths only, production OAuth URLs, and structured DTO responses instead of conversational wrappers.
  - Focused verification passed:
    - `npx jest docs/gpt-actions-oauth/__tests__/gpt-action-openapi.test.js --runInBand`
    - `npx biome check docs/gpt-actions-oauth/gpt-action-openapi.json docs/gpt-actions-oauth/__tests__/gpt-action-openapi.test.js`

Acceptance criteria:

- The schema exposes only approved operations and the production HTTPS server URL.
- Operation IDs are unique and stable; descriptions stay within GPT Actions limits.
- OAuth security and scopes match server enforcement.
- Responses use raw structured data rather than prewritten conversational text.
- The schema passes an OpenAPI validator and imports successfully into the GPT editor.

### API-008 - Implement delivery-file metadata endpoint and dashboard deep links

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-5 h
- Depends on: API-001, API-002
- Evidence:
  - `GET /api/gpt/v1/files` added in `src/app/api/gpt/v1/files/route.js`, requiring `customer:read`, applying customer ownership through the booking join, enforcing customer-visible status filters, supporting bounded file/booking/status/type/uploaded-date filters, and returning only metadata DTOs with authenticated dashboard links.
  - Dashboard file deep-link preservation completed in `src/app/dashboard/files/page.js` and `src/app/dashboard/files/FileList.jsx`; unauthenticated visits now preserve `fileId` through the shared dashboard gate, valid links scroll the matching owned file card into view, and invalid or inaccessible `fileId` values render a generic unavailable notice without revealing file existence.
  - Focused verification passed:
    - `npx jest src/app/api/gpt/v1/files/__tests__/route.test.js src/app/dashboard/files/__tests__/page.test.jsx src/app/dashboard/files/__tests__/FileList.test.jsx --runInBand`
    - `npx biome check src/app/api/gpt/v1/files/route.js src/app/api/gpt/v1/files/__tests__/route.test.js src/app/dashboard/files/page.js src/app/dashboard/files/FileList.jsx src/app/dashboard/files/__tests__/page.test.jsx src/app/dashboard/files/__tests__/FileList.test.jsx docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- `GET /api/gpt/v1/files` requires `customer:read` and returns only delivery files visible to the authenticated customer.
- Responses contain bounded customer-visible metadata and `/dashboard/files?fileId={fileId}` website links, never binary content, S3 keys, direct storage URLs, or unrestricted signed URLs.
- Opening a valid link preserves `fileId` through dashboard authentication, scrolls the matching file card into view, and visually identifies it.
- Invalid, missing, and other-customer file identifiers render safely without revealing file existence.
- API and dashboard behavior have cross-customer, deep-link, and regression tests.

## M5 - Verification and security release gates

### TEST-001 - Add OAuth service unit tests

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: FLOW-006
- Evidence:
  - Focused OAuth helper unit coverage added for CSRF helpers, signed authorization-decision tokens, interaction normalization/building, and scope metadata in `src/lib/oauth/__tests__/authorizationCsrf.test.js`, `src/lib/oauth/__tests__/authorizationDecision.test.js`, `src/lib/oauth/__tests__/interaction.test.js`, and `src/lib/oauth/__tests__/scopes.test.js`.
  - Existing focused unit suites continue to cover authorization validators, token/code hashing, access-token validation, consent, audit logging, and refresh-token rotation in `src/lib/oauth/__tests__/authorizationRequest.test.js`, `src/lib/oauth/__tests__/secrets.test.js`, `src/lib/oauth/__tests__/accessTokens.test.js`, `src/lib/oauth/__tests__/consent.test.js`, `src/lib/oauth/__tests__/audit.test.js`, and `src/lib/oauth/__tests__/tokenExchange.test.js`.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/authorizationCsrf.test.js src/lib/oauth/__tests__/authorizationDecision.test.js src/lib/oauth/__tests__/interaction.test.js src/lib/oauth/__tests__/scopes.test.js src/lib/oauth/__tests__/authorizationRequest.test.js src/lib/oauth/__tests__/secrets.test.js src/lib/oauth/__tests__/accessTokens.test.js src/lib/oauth/__tests__/audit.test.js src/lib/oauth/__tests__/consent.test.js src/lib/oauth/__tests__/tokenExchange.test.js --runInBand`
    - `npx biome check src/lib/oauth/authorizationCsrf.js src/lib/oauth/authorizationDecision.js src/lib/oauth/interaction.js src/lib/oauth/scopes.js src/lib/oauth/__tests__/authorizationCsrf.test.js src/lib/oauth/__tests__/authorizationDecision.test.js src/lib/oauth/__tests__/interaction.test.js src/lib/oauth/__tests__/scopes.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Tests cover validators, expiry boundaries, scope handling, hashing, OAuth errors, and token rotation logic.
- Tests are deterministic and do not use production credentials or external services.

### TEST-002 - Add database-backed protocol integration tests

- Status: `DONE`
- Owner: `Codex`
- Estimate: 4-6 h
- Depends on: FLOW-007
- Evidence:
  - Isolated PostgreSQL-backed protocol integration coverage added in `src/lib/oauth/__tests__/protocol.integration.test.js`, including temporary-database setup/teardown, real migrations, concurrent authorization-code redemption, concurrent refresh replay handling, expiry failures, consent revocation, cleanup retention, and uniqueness-constraint assertions.
  - Refresh-family replay remediation added in `src/lib/oauth/tokenExchange.js` and `src/lib/oauth/accessTokens.js` so a consumed-token replay now revokes the persisted family with a fresh committed view and causes replacement access/refresh tokens from that family to fail authorization.
  - Focused unit coverage updated in `src/lib/oauth/__tests__/tokenExchange.test.js` and `src/lib/oauth/__tests__/accessTokens.test.js` for compromised refresh-family handling.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/protocol.integration.test.js src/lib/oauth/__tests__/tokenExchange.test.js src/lib/oauth/__tests__/accessTokens.test.js src/lib/db/migrations/__tests__/20260629010000-create-oauth-persistence.test.js --runInBand`
    - `npx biome check src/lib/oauth/tokenExchange.js src/lib/oauth/accessTokens.js src/lib/oauth/__tests__/protocol.integration.test.js src/lib/oauth/__tests__/tokenExchange.test.js src/lib/oauth/__tests__/accessTokens.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Tests use isolated PostgreSQL state and real transaction behavior.
- Code redemption and refresh rotation are verified under concurrent requests.
- Migrations, cleanup, expiry, revocation, and uniqueness constraints are exercised.

### TEST-003 - Add route and cross-user authorization tests

- Status: `DONE`
- Owner: `Codex`
- Estimate: 3-4 h
- Depends on: API-005
- Evidence:
  - GPT API route suites now cover revoked-token `401`, insufficient-scope `403`, validation `422`, pagination, detail-route `404`, and shared `429` rate-limit handling across `/me`, bookings list/detail, invoices, and files in `src/app/api/gpt/v1/**/__tests__/route.test.js`.
  - Existing list-route assertions continue to prove customer scoping at the query boundary for bookings, invoices, and files, and booking detail continues to return `404` for unavailable or other-customer resources.
  - Focused verification passed:
    - `npx jest --runTestsByPath src/app/api/gpt/v1/me/__tests__/route.test.js src/app/api/gpt/v1/bookings/__tests__/route.test.js src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js src/app/api/gpt/v1/invoices/__tests__/route.test.js src/app/api/gpt/v1/files/__tests__/route.test.js --runInBand`
    - `npx biome check src/app/api/gpt/v1/me/__tests__/route.test.js src/app/api/gpt/v1/bookings/__tests__/route.test.js src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js src/app/api/gpt/v1/invoices/__tests__/route.test.js src/app/api/gpt/v1/files/__tests__/route.test.js docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Tests cover all `401`, `403`, `404`, validation, pagination, and rate-limit paths.
- Customer A cannot infer or retrieve customer B's bookings or invoices.
- Revoked and insufficient-scope tokens fail on every resource endpoint.

### TEST-004 - Run security abuse-case verification

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: TEST-001, TEST-002, TEST-003
- Evidence:
  - Added repeatable automated security verification entrypoint: `npm run verify:oauth-security` via `scripts/verify-oauth-security.mjs`.
  - Extended the runner to regenerate `SECURITY-VERIFICATION-REPORT.md` with group-level suite/test counts and explicit automated case coverage for the current security-plan matrix.
  - Expanded automated abuse-case coverage for `REF-07` with a disabled-client integration test spanning authorization rejection, token-route `invalid_client` failures for authorization-code and refresh exchanges, and continued access-token authorization until expiry.
  - Expanded automated abuse-case coverage for `RES-07` with JSON-serialization and dashboard-rendering tests that keep markup-like and control-character input bounded, valid, and text-escaped.
  - Executed the runner successfully on 2026-06-29; it passed 42 grouped OAuth/GPT security suite executions covering 221 executed tests across configuration, authorization flow, token exchange/refresh, resource authorization, rate limits, audit logging, cleanup, and PostgreSQL-backed protocol behavior.
  - `SECURITY-TEST-PLAN.md` now marks the automated `CFG-*`, `AUT-*`, `COD-*`, `REF-*`, `API-*`, `RES-*`, `LOG-01`, `LOG-03`, `LOG-04`, and `LOG-05` cases as `DONE`, records `GATE-04` as complete from the automated cross-customer isolation coverage, and records `GATE-03` as `IN_PROGRESS` pending the remaining live checks.
  - Live production verification on 2026-06-30 confirmed the public authorize/token/API endpoints at `https://milkywayy.com`, exercised logged-out authorize, consent denial, consent approval, repeat-consent reconnect, authorization-code exchange, refresh rotation, customer revocation, cross-customer `404` isolation, and hashed-secret persistence using the production client and two production-like customer accounts.
  - Live rollout surfaced a Next.js 16 production bug in the authorize page: cookie mutation inside the server-rendered page caused `Cookies can only be modified in a Server Action or Route Handler.` on the consent screen. The fix moved the authorize-decision CSRF proof into the signed decision token, was re-tested locally and on the host, then redeployed successfully on 2026-06-30.
  - The project owner manually confirmed `MAN-03` on 2026-06-30: consent approval redirected successfully and no tokens, codes, or other OAuth secrets were visible in browser history, the address bar, the page UI, or inspectable client-side storage.
  - `MAN-05` was closed as first-release not applicable on 2026-06-30 because only `customer:read` is exposed in v1, so there is no broader-scope reconnect scenario to exercise until a future scope is introduced.
  - The project owner manually confirmed `MAN-07` on 2026-06-30 for signed-in and signed-out file deep links, and also confirmed invalid and other-customer `fileId` values render the intended safe error behavior.
  - The project owner completed the Custom GPT checks on 2026-06-30, including the GPT-editor import/connect flow, end-to-end OAuth/API use cases, and the final `GPT-07` reconnect-after-revocation confirmation from ChatGPT.
  - Automated revoke verification was tightened further on 2026-06-30 by extending `src/lib/oauth/__tests__/protocol.integration.test.js` so the persisted revoke flow now proves previously issued access tokens fail with `access_token_revoked` and previously issued refresh tokens fail with `invalid_grant` / `refresh_token_revoked`.

Acceptance criteria:

- All cases in `SECURITY-TEST-PLAN.md` are executed.
- No critical/high finding remains open.
- Medium findings have an owner and explicit release decision.

### TEST-005 - Verify existing application regression coverage

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: AUTH-005, API-005
- Evidence:
  - Existing regression suites covering customer auth, dashboard access, admin/customer separation, bookings, invoices, file delivery, proxy behavior, OAuth routes, cleanup, and GPT API routes passed:
    - `npx jest --runInBand src/lib/services/__tests__/customerAuth.test.js src/lib/helpers/__tests__/dashboardAuth.test.js src/lib/contexts/__tests__/auth.test.jsx src/app/auth/signin/__tests__/page.test.jsx src/__tests__/proxy.test.js src/lib/actions/__tests__/bookings.test.js src/app/dashboard/bookings/__tests__/BookingList.test.jsx src/app/dashboard/invoices/__tests__/InvoiceList.test.jsx src/app/dashboard/files/__tests__/page.test.jsx src/app/dashboard/files/__tests__/FileList.test.jsx src/app/dashboard/connections/__tests__/page.test.jsx src/lib/helpers/__tests__/invoice.test.js src/lib/services/__tests__/fileDelivery.test.js src/app/api/files/download/__tests__/route.test.js src/app/api/invoices/download/__tests__/route.test.js src/app/api/admin/bookings/__tests__/route.test.js 'src/app/api/admin/bookings/[id]/deliverables/__tests__/route.test.js' src/app/oauth/authorize/__tests__/page.test.jsx src/app/oauth/authorize/resume/__tests__/route.test.js src/app/oauth/authorize/decision/__tests__/route.test.js src/app/oauth/token/__tests__/route.test.js src/app/oauth/revoke/__tests__/route.test.js src/app/api/internal/oauth/cleanup/__tests__/route.test.js src/app/api/gpt/v1/_lib/__tests__/auth.test.js src/app/api/gpt/v1/_lib/__tests__/dtos.test.js src/app/api/gpt/v1/_lib/__tests__/runtime.test.js src/app/api/gpt/v1/me/__tests__/route.test.js src/app/api/gpt/v1/bookings/__tests__/route.test.js 'src/app/api/gpt/v1/bookings/[bookingCode]/__tests__/route.test.js' src/app/api/gpt/v1/invoices/__tests__/route.test.js src/app/api/gpt/v1/files/__tests__/route.test.js`
  - Regression coverage initially exposed a Jest compatibility break in the existing sign-in and dashboard suites after OAuth path normalization started importing `jose` through the shared auth context; the path helpers were split into `src/lib/oauth/authorizationResumePaths.js` so client-side auth code no longer depends on token-signing internals.
  - The repository-wide baseline failures recorded in `OAUTH-001` remain the separately documented unrelated failures for full-suite `npm test -- --runInBand` and `npm run lint`.

Acceptance criteria:

- Existing login, logout, dashboard access, admin separation, bookings, invoices, and file-delivery tests are run.
- New failures caused by OAuth changes are fixed.
- Pre-existing unrelated failures are documented separately and are not silently ignored.

### TEST-006 - Perform log and secret-leak review

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: FLOW-008, API-006
- Evidence:
  - Import-time database credential logging was removed from `src/lib/config/config.js`, eliminating the tracked `DB_PASSWORD` leak.
  - Shared log scrubbing helper added in `src/lib/logging/security.js` and wired into OAuth/GPT error paths in `src/app/oauth/token/route.js`, `src/app/api/internal/oauth/cleanup/route.js`, and `src/app/api/gpt/v1/**/route.js` so unexpected failures log only sanitized metadata and safe error fields.
  - Repeatable static review added as `npm run verify:oauth-log-safety` via `scripts/verify-oauth-log-safety.mjs`; it passed after checking reviewed OAuth/GPT files for raw console logging, checking selected worker/config files for environment-value logging, and scanning source/docs/scripts fixtures for live credentials.
  - Repository review found no application error-monitoring SDK packages in `package.json`, so there is no separate in-repo monitoring sink that bypasses the shared scrubbed logging path.
  - Focused verification passed:
    - `npm run verify:oauth-log-safety`
    - `npx jest src/lib/logging/__tests__/security.test.js src/lib/oauth/__tests__/audit.test.js src/app/oauth/token/__tests__/route.test.js src/app/api/internal/oauth/cleanup/__tests__/route.test.js --runInBand`
    - `npx biome check src/lib/logging/security.js src/lib/logging/__tests__/security.test.js src/app/oauth/token/route.js src/app/api/internal/oauth/cleanup/route.js src/app/api/gpt/v1/me/route.js src/app/api/gpt/v1/bookings/route.js src/app/api/gpt/v1/bookings/[bookingCode]/route.js src/app/api/gpt/v1/invoices/route.js src/app/api/gpt/v1/files/route.js src/lib/config/config.js scripts/verify-oauth-log-safety.mjs package.json docs/gpt-actions-oauth/TASKS.md`

Acceptance criteria:

- Automated or manual inspection confirms logs exclude secrets, tokens, codes, OTPs, cookie values, and full authorization headers.
- Error monitoring scrubs the same values.
- Test fixtures contain no usable credentials.

### TEST-007 - Complete code-quality review

- Status: `DONE`
- Owner: `Codex`
- Estimate: 2-3 h
- Depends on: TEST-001, TEST-002, TEST-003
- Evidence:
  - Added repeatable focused quality-review entrypoint `npm run verify:oauth-quality` via `scripts/verify-oauth-quality.mjs`; it runs the OAuth/GPT Biome scope, the release-blocking Jest suites, and fails if those suites contain skipped or todo tests.
  - `npm run verify:oauth-quality` passed on 2026-06-29.
  - `DEC-019` records the explicit single-reviewer staffing exception so the lack of a second reviewer is visible as a release decision instead of an implicit waiver.

Acceptance criteria:

- All changed OAuth and GPT API files pass Biome checks.
- Relevant Jest suites pass without skipped release-blocking tests.
- Security-critical code receives explicit review by someone other than the author where staffing permits.
- Any exception is recorded as a release decision rather than hidden through configuration.

## M6 - Deployment and ChatGPT UAT

### OPS-001 - Prepare production secrets and client configuration

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: DB-003, AUTH-001
- Evidence:
  - Production preparation runbook added in `OPERATIONS.md`, documenting the required OAuth/worker secrets, exact GPT callback capture, controlled client provisioning flow, secret rotation steps, and emergency client disablement notes.
  - Operator lifecycle script added in `scripts/manage-oauth-client.mjs` and exposed as `npm run oauth:manage-client`; it rotates an existing client secret once-per-run and enables or disables the registered OAuth client by `client_id`.
  - Client-management helpers added in `src/lib/oauth/clientProvisioning.js` with focused coverage in `src/lib/oauth/__tests__/clientProvisioning.test.js`.
  - [INTEGRATION-RECORD.md](./INTEGRATION-RECORD.md) now captures the exact production GPT callback values and the agreed `https://milkywayy.com` OAuth/action endpoints needed for secret-manager setup and client provisioning.
  - Focused verification passed:
    - `npx jest src/lib/oauth/__tests__/clientProvisioning.test.js --runInBand`
    - `npx biome check src/lib/oauth/clientProvisioning.js src/lib/oauth/__tests__/clientProvisioning.test.js scripts/manage-oauth-client.mjs docs/gpt-actions-oauth/OPERATIONS.md docs/gpt-actions-oauth/README.md docs/gpt-actions-oauth/TASKS.md package.json`
  - Production secret configuration was updated on 2026-06-30 with `OAUTH_BASE_URL`, `OAUTH_ALLOWED_SCOPES`, the exact active-plus-compatibility GPT callback URLs, accepted TTLs, and fresh server-only hash peppers. Exact host paths and backup filenames are maintained in `docs/private/PRODUCTION-DEPLOYMENT.md`.
  - Live client provisioning succeeded on 2026-06-30 via `npm run oauth:provision-client -- --name "Milkywayy GPT" --redirect-uri ...`; the resulting production client ID is `UP0_ZZWskQY2d6UfidkWXpK81IGqtJcMrBxRJbxs06o`, the client is enabled, and PostgreSQL stores only the hashed client secret.

Acceptance criteria:

- Production secrets are generated and stored in the deployment secret mechanism.
- Every exact ChatGPT callback URL currently in use is registered.
- OAuth and API endpoints share the approved production domain.
- Secret rotation and emergency client-disable procedures are documented.

### OPS-002 - Configure TLS, proxying, and rate-limit topology

- Status: `DONE`
- Owner: `Codex`
- Estimate: 1-2 h
- Depends on: API-006
- Evidence:
  - Repo-managed Nginx production template added in `deploy/nginx/milkywayy-booking.conf`, including HTTPS termination on port 443, HTTP-to-HTTPS redirect, controlled forwarded-host/proto headers, bounded body size, and bounded proxy timeouts for the PM2-local Next.js upstream.
  - PM2 topology updated in `ecosystem.config.cjs` so production now declares the web app, booking auto-complete worker, and OAuth cleanup worker together against the same local application URL and shared `CRON_SECRET` handling.
  - Repeatable topology verification added as `npm run verify:oauth-topology` via `scripts/verify-oauth-topology.mjs`, and the deployment/runbook steps are documented in `OPERATIONS.md`.
  - Focused verification passed:
    - `npm run verify:oauth-topology`
    - `npx biome check ecosystem.config.cjs scripts/verify-oauth-topology.mjs docs/gpt-actions-oauth/OPERATIONS.md docs/gpt-actions-oauth/TASKS.md`
  - The production origin proxy was updated on 2026-06-30 to preserve the controlled host headers, pin forwarded protocol handling, and enforce the required GPT-safe body and timeout limits; exact host-level details are maintained in `docs/private/PRODUCTION-DEPLOYMENT.md`.
  - Production PM2 was reloaded from `ecosystem.config.cjs` on 2026-06-30 and now runs `milkywayy-booking`, `milkywayy-booking-auto-complete`, and `milkywayy-booking-oauth-cleanup` together.
  - Public TLS validation on 2026-06-30 confirmed `curl -Ik https://milkywayy.com` succeeds at the public edge, while `DEC-021` records the tracked production topology constraints and `docs/private/PRODUCTION-DEPLOYMENT.md` holds the exact live layout.

Acceptance criteria:

- Public endpoints use TLS 1.2+ on port 443 with a valid certificate.
- Nginx terminates HTTPS and reverse-proxies to the PM2-managed Next.js process.
- Forwarded protocol/host handling cannot produce an attacker-controlled redirect URI.
- PostgreSQL-backed rate limiting is correct for the current PM2 topology and any later increase in web-process count.
- Request-body and timeout limits match action requirements.

### OPS-003 - Deploy migrations and application safely

- Status: `DONE`
- Owner: `TBD`
- Estimate: 1-2 h
- Depends on: TEST-007, OPS-001, OPS-002
- Evidence:
  - Database and application backups were created before deploy on 2026-06-30; exact backup paths and operator notes are maintained in `docs/private/PRODUCTION-DEPLOYMENT.md`.
  - Production checkout was fast-forwarded to the release revision on 2026-06-30 using the operator-controlled deployment flow documented in `docs/private/PRODUCTION-DEPLOYMENT.md`.
  - `npm ci`, `npx sequelize-cli db:migrate`, `npm run build`, and `pm2 reload ecosystem.config.cjs --update-env` all succeeded on 2026-06-30.
  - Live rollout uncovered a production-only authorize-page failure caused by cookie mutation from a server-rendered page under Next.js 16; the fix was patched, re-tested, rebuilt, and reloaded on 2026-06-30 before final verification continued.

Acceptance criteria:

- Database backup and migration order are confirmed.
- Migrations deploy before code that depends on them.
- Smoke tests verify existing website authentication before OAuth is enabled.
- Rollback procedure is exercised or rehearsed.

### OPS-004 - Configure Custom GPT OAuth and action schema

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 1 h
- Depends on: API-007, OPS-003
- Evidence:
  - The production OAuth values required by the GPT editor are now fixed and verified: authorization URL `https://milkywayy.com/oauth/authorize`, token URL `https://milkywayy.com/oauth/token`, scope `customer:read`, client ID `UP0_ZZWskQY2d6UfidkWXpK81IGqtJcMrBxRJbxs06o`, and the exact callback allowlist already recorded in [INTEGRATION-RECORD.md](./INTEGRATION-RECORD.md).
  - The validated action schema remains [gpt-action-openapi.json](./gpt-action-openapi.json).
  - The project owner completed the target GPT editor configuration on 2026-06-30 in a logged-in ChatGPT session, including the correct client ID, securely transferred secret, authorization URL, token URL, scope, and the validated action schema import.
  - The project owner also confirmed the public-distribution release prerequisites were satisfied in the GPT editor flow, including privacy policy, verified domain, support contact, and publication/review requirements.

Acceptance criteria:

- GPT editor contains the correct client ID, securely transferred secret, authorization URL, token URL, and scopes.
- The validated OpenAPI schema imports without warnings that weaken security.
- Public distribution requirements for privacy policy, verified domain, support contact, and publication review are complete.
- No production secret is placed in the OpenAPI document or GPT instructions.

### OPS-005 - Execute end-to-end ChatGPT UAT

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 2-3 h
- Depends on: OPS-004
- Evidence:
  - Public-domain end-to-end OAuth and GPT API verification ran successfully on 2026-06-30 against `https://milkywayy.com` using the production OAuth client and two production-like customer accounts. The live checks covered:
    - logged-out authorize rendering
    - consent denial with `access_denied` and preserved `state`
    - consent approval and authorization-code redirect
    - authorization-code exchange using `client_secret_post`
    - `/api/gpt/v1/me`, `/bookings`, `/bookings/{bookingCode}`, `/invoices`, and `/files`
    - strict cross-customer `404` behavior for foreign booking identifiers
    - repeat-consent reconnect rendering
    - refresh rotation using `client_secret_basic`
    - dashboard revocation stopping both access-token authorization and subsequent refresh
  - The project owner confirmed the remaining ChatGPT-side checks on 2026-06-30: schema import, disconnected sign-in prompt, OTP login and consent, customer-scoped reads, foreign-booking isolation, refresh after expiry, `GPT-07` reconnection after dashboard revocation, bounded `429` behavior, largest expected response completion, and file-link handoff behavior.

Acceptance criteria:

- A new customer connection completes login, consent, code exchange, and the first API call.
- Existing consent reconnect, access-token expiry, refresh, denial, logout, and dashboard revocation are exercised.
- Two test customers demonstrate strict data isolation.
- ChatGPT receives bounded raw JSON and responds correctly for each approved use case.

### OPS-006 - Enable monitoring and complete release handoff

- Status: `DONE`
- Owner: `Project owner`
- Estimate: 2-3 h
- Depends on: OPS-005
- Evidence:
  - `OPERATIONS.md` now records the minimum production monitoring bundle: PostgreSQL queries for OAuth audit events and refresh-reuse/high-signal failures, PM2 health/log commands, public-edge/origin probe commands, and the first-release operational owner assignment.
  - Live rollback/containment controls were exercised on 2026-06-30 by disabling the production OAuth client, verifying new authorize requests fail safely, verifying refresh fails with `invalid_client`, verifying an already-issued access token continues to authorize until expiry, and re-enabling the client successfully.
  - The project owner confirmed on 2026-06-30 that the public GPT release prerequisites are complete and the handoff now points at a fully connected first-release GPT rather than only the live server-side OAuth deployment.

Acceptance criteria:

- Dashboards or queries cover OAuth failures, token issuance, refresh reuse, API latency, `401`, `403`, `429`, and `5xx` rates.
- Alerts and an operational owner are assigned.
- Runbooks cover client disablement, customer revocation, suspected token theft, secret rotation, and rollback.
- Documentation status is updated to `DONE` with deployment and test evidence.

## Deferred backlog

Add task IDs before starting any deferred item.

| Candidate | Trigger for reconsideration |
|---|---|
| Booking creation or cancellation | Read-only release is stable and product approves consequential actions. |
| Payment initiation | Dedicated payment threat model and confirmation workflow exist. |
| Multiple GPTs or third-party clients | A second client is approved. |
| PKCE | A future public client or documented ChatGPT support requires it. |
| OpenID Connect | A relying party needs federated identity rather than API access. |
| Dynamic client registration | A developer-platform product is funded. |

## Change log

| Date | Change | Author |
|---|---|---|
| 2026-06-29 | Initial implementation plan created. | Codex |
| 2026-06-29 | Completed `DB-004` token hashing and random-secret utilities. | Codex |
| 2026-06-29 | Completed `FLOW-001` authorization-request validator. | Codex |
| 2026-06-29 | Completed `FLOW-003` authorization-code issuance and atomic consumption. | Codex |
| 2026-06-29 | Completed `FLOW-004` OAuth client authentication. | Codex |
| 2026-06-29 | Completed `FLOW-008` OAuth protocol audit events and metrics. | Codex |
| 2026-06-29 | Completed `API-005` invoice metadata endpoint. | Codex |
| 2026-06-29 | Completed `TEST-005` existing application regression coverage and restored dashboard/sign-in Jest compatibility after the OAuth auth-context changes. | Codex |
| 2026-06-29 | Started `TEST-004` with an automated security verification runner and recorded the first passing abuse-case report. | Codex |
| 2026-06-29 | Expanded `TEST-004` so the security runner now regenerates a case-level verification report, refreshed automated suite counts, and closed `GATE-04` from the repeated cross-customer authorization evidence. | Codex |
| 2026-06-29 | Synchronized `TEST-004` security-plan case statuses with the passing automated verification report and narrowed the remaining blockers to live/manual validation only. | Codex |
| 2026-06-29 | Completed `TEST-007` with a repeatable focused quality-review runner and an explicit single-reviewer release decision. | Codex |
| 2026-06-29 | Expanded `TEST-004` automated abuse-case coverage for disabled-client shutdown behavior and markup/control-character handling, then refreshed the generated security report counts. | Codex |
| 2026-06-29 | Started `OPS-001` with a production OAuth operations runbook and managed client rotation/enablement tooling. | Codex |
| 2026-06-29 | Started `OPS-002` with a committed Nginx topology template, PM2 cleanup-worker registration, and a repeatable topology verification runner. | Codex |
| 2026-06-30 | Completed live production rollout work for `OPS-001` through `OPS-003`, including DB/code backups, secret configuration, production client provisioning, migrations, build, PM2 reload, and origin Nginx hardening. | Codex |
| 2026-06-30 | Continued `TEST-004` and `OPS-005` with public-domain end-to-end OAuth/API verification across deny, approve, reconnect, refresh, revocation, and strict cross-customer isolation. | Codex |
| 2026-06-30 | Fixed a production-only Next.js 16 consent-screen failure by moving the authorize CSRF proof into the signed decision token instead of mutating cookies from the server-rendered page. | Codex |
| 2026-06-30 | Verified the emergency client disable/enable path live and recorded the Cloudflare-fronted production TLS topology in `DEC-021`. | Codex |
| 2026-06-30 | Recorded the project-owner manual confirmations for `MAN-03`, `MAN-05`, `MAN-07`, `GPT-01` through `GPT-10`, and `GATE-09`, then marked first-release development complete. | Codex |
| 2026-06-30 | Extended the revoke integration test so automated coverage now proves previously issued access and refresh tokens stop working immediately after customer revocation. | Codex |
| 2026-06-30 | Synchronized the remaining `TEST-004` browser/GPT blockers after confirming live `MAN-01`/`MAN-02`/`MAN-04`/`MAN-06` evidence and re-checking that the in-app ChatGPT browser session is still logged out. | Codex |
