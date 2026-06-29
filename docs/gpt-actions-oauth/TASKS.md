# GPT Actions OAuth task tracker

- Last updated: 2026-06-29
- Overall implementation status: `IN_PROGRESS`
- Current milestone: `M4 - GPT resource API and OpenAPI schema`

This is the authoritative progress tracker. Status values and update rules are defined in [README.md](./README.md).

## Progress summary

| Milestone | Status | Done | Total | Estimate |
|---|---|---:|---:|---:|
| M0 - Scope and decisions | `BLOCKED` | 3 | 4 | 4-6 h |
| M1 - Authentication and configuration baseline | `DONE` | 5 | 5 | 8-12 h |
| M2 - OAuth persistence | `DONE` | 5 | 5 | 10-14 h |
| M3 - Authorization and token service | `DONE` | 8 | 8 | 22-30 h |
| M4 - GPT resource API and OpenAPI schema | `IN_PROGRESS` | 4 | 8 | 19-29 h |
| M5 - Verification and security release gates | `NOT_STARTED` | 0 | 7 | 16-24 h |
| M6 - Deployment and ChatGPT UAT | `NOT_STARTED` | 0 | 6 | 8-13 h |
| **Total** | `IN_PROGRESS` | **25** | **43** | **87-128 h** |

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

- Status: `BLOCKED`
- Owner: `Project owner`
- Estimate: 1 h
- Depends on: OAUTH-002
- Evidence:
  - Repository search confirmed the target GPT ID, owner/workspace, and exact callback URLs are not yet recorded in project-controlled documentation.
  - `DECISIONS.md` already captures the required scope, distribution target, and callback exact-match policy, but not the GPT-editor-specific values needed to provision the client safely.
  - Blocker: a project owner must supply the target GPT record and exact callback URLs from the GPT editor without committing the client secret.

Acceptance criteria:

- The target GPT ID and owner/workspace are recorded securely.
- Public GPT distribution is recorded for the target GPT.
- Both callback URLs displayed or documented for the GPT are captured exactly.
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
  - CSRF-protected approval and denial POST handling added in `src/app/oauth/authorize/decision/route.js` using signed decision state from `src/lib/oauth/authorizationDecision.js`, double-submit protection from `src/lib/oauth/authorizationCsrf.js`, and shared interaction normalization in `src/lib/oauth/interaction.js`.
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

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: API-001, API-002
- Evidence: —

Acceptance criteria:

- Invoice listing requires `customer:read` and filters by authenticated customer.
- The response contains metadata and safe website navigation links, not PDF bytes or unrestricted storage URLs.
- Payment-provider internals and other customers' invoice existence are not exposed.

### API-006 - Add resource rate limits and response bounds

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: API-001
- Evidence: —

Acceptance criteria:

- Limits are applied by client and user, with stricter controls for authentication endpoints.
- PostgreSQL counter updates are atomic and remain effective across PM2 restarts and multiple web processes.
- Exceeded limits return `429` with safe retry guidance.
- Endpoint time and payload budgets stay materially below 45 seconds and 100,000 characters.

### API-007 - Create and validate the GPT Action OpenAPI schema

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: API-003, API-004, API-005, API-008
- Evidence: —

Acceptance criteria:

- The schema exposes only approved operations and the production HTTPS server URL.
- Operation IDs are unique and stable; descriptions stay within GPT Actions limits.
- OAuth security and scopes match server enforcement.
- Responses use raw structured data rather than prewritten conversational text.
- The schema passes an OpenAPI validator and imports successfully into the GPT editor.

### API-008 - Implement delivery-file metadata endpoint and dashboard deep links

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 3-5 h
- Depends on: API-001, API-002
- Evidence: —

Acceptance criteria:

- `GET /api/gpt/v1/files` requires `customer:read` and returns only delivery files visible to the authenticated customer.
- Responses contain bounded customer-visible metadata and `/dashboard/files?fileId={fileId}` website links, never binary content, S3 keys, direct storage URLs, or unrestricted signed URLs.
- Opening a valid link preserves `fileId` through dashboard authentication, scrolls the matching file card into view, and visually identifies it.
- Invalid, missing, and other-customer file identifiers render safely without revealing file existence.
- API and dashboard behavior have cross-customer, deep-link, and regression tests.

## M5 - Verification and security release gates

### TEST-001 - Add OAuth service unit tests

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 3-4 h
- Depends on: FLOW-006
- Evidence: —

Acceptance criteria:

- Tests cover validators, expiry boundaries, scope handling, hashing, OAuth errors, and token rotation logic.
- Tests are deterministic and do not use production credentials or external services.

### TEST-002 - Add database-backed protocol integration tests

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 4-6 h
- Depends on: FLOW-007
- Evidence: —

Acceptance criteria:

- Tests use isolated PostgreSQL state and real transaction behavior.
- Code redemption and refresh rotation are verified under concurrent requests.
- Migrations, cleanup, expiry, revocation, and uniqueness constraints are exercised.

### TEST-003 - Add route and cross-user authorization tests

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 3-4 h
- Depends on: API-005
- Evidence: —

Acceptance criteria:

- Tests cover all `401`, `403`, `404`, validation, pagination, and rate-limit paths.
- Customer A cannot infer or retrieve customer B's bookings or invoices.
- Revoked and insufficient-scope tokens fail on every resource endpoint.

### TEST-004 - Run security abuse-case verification

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: TEST-001, TEST-002, TEST-003
- Evidence: —

Acceptance criteria:

- All cases in `SECURITY-TEST-PLAN.md` are executed.
- No critical/high finding remains open.
- Medium findings have an owner and explicit release decision.

### TEST-005 - Verify existing application regression coverage

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 1-2 h
- Depends on: AUTH-005, API-005
- Evidence: —

Acceptance criteria:

- Existing login, logout, dashboard access, admin separation, bookings, invoices, and file-delivery tests are run.
- New failures caused by OAuth changes are fixed.
- Pre-existing unrelated failures are documented separately and are not silently ignored.

### TEST-006 - Perform log and secret-leak review

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 1-2 h
- Depends on: FLOW-008, API-006
- Evidence: —

Acceptance criteria:

- Automated or manual inspection confirms logs exclude secrets, tokens, codes, OTPs, cookie values, and full authorization headers.
- Error monitoring scrubs the same values.
- Test fixtures contain no usable credentials.

### TEST-007 - Complete code-quality review

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: TEST-001, TEST-002, TEST-003
- Evidence: —

Acceptance criteria:

- All changed OAuth and GPT API files pass Biome checks.
- Relevant Jest suites pass without skipped release-blocking tests.
- Security-critical code receives explicit review by someone other than the author where staffing permits.
- Any exception is recorded as a release decision rather than hidden through configuration.

## M6 - Deployment and ChatGPT UAT

### OPS-001 - Prepare production secrets and client configuration

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 1-2 h
- Depends on: DB-003, AUTH-001
- Evidence: —

Acceptance criteria:

- Production secrets are generated and stored in the deployment secret mechanism.
- Both exact ChatGPT callback URLs are registered.
- OAuth and API endpoints share the approved production domain.
- Secret rotation and emergency client-disable procedures are documented.

### OPS-002 - Configure TLS, proxying, and rate-limit topology

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 1-2 h
- Depends on: API-006
- Evidence: —

Acceptance criteria:

- Public endpoints use TLS 1.2+ on port 443 with a valid certificate.
- Nginx terminates HTTPS and reverse-proxies to the PM2-managed Next.js process.
- Forwarded protocol/host handling cannot produce an attacker-controlled redirect URI.
- PostgreSQL-backed rate limiting is correct for the current PM2 topology and any later increase in web-process count.
- Request-body and timeout limits match action requirements.

### OPS-003 - Deploy migrations and application safely

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 1-2 h
- Depends on: TEST-007, OPS-001, OPS-002
- Evidence: —

Acceptance criteria:

- Database backup and migration order are confirmed.
- Migrations deploy before code that depends on them.
- Smoke tests verify existing website authentication before OAuth is enabled.
- Rollback procedure is exercised or rehearsed.

### OPS-004 - Configure Custom GPT OAuth and action schema

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 1 h
- Depends on: API-007, OPS-003
- Evidence: —

Acceptance criteria:

- GPT editor contains the correct client ID, securely transferred secret, authorization URL, token URL, and scopes.
- The validated OpenAPI schema imports without warnings that weaken security.
- Public distribution requirements for privacy policy, verified domain, support contact, and publication review are complete.
- No production secret is placed in the OpenAPI document or GPT instructions.

### OPS-005 - Execute end-to-end ChatGPT UAT

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: OPS-004
- Evidence: —

Acceptance criteria:

- A new customer connection completes login, consent, code exchange, and the first API call.
- Existing consent reconnect, access-token expiry, refresh, denial, logout, and dashboard revocation are exercised.
- Two test customers demonstrate strict data isolation.
- ChatGPT receives bounded raw JSON and responds correctly for each approved use case.

### OPS-006 - Enable monitoring and complete release handoff

- Status: `NOT_STARTED`
- Owner: `TBD`
- Estimate: 2-3 h
- Depends on: OPS-005
- Evidence: —

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
