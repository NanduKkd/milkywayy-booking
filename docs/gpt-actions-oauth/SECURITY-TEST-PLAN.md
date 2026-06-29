# GPT Actions OAuth security and test plan

- Last updated: 2026-06-29
- Verification status: `IN_PROGRESS`

## Test strategy

The OAuth authorization server and resource API are a new security boundary. Verification must include unit tests, database-backed protocol integration tests, HTTP route tests, manual browser testing, and an end-to-end connection from the actual Custom GPT.

Mock-only tests are insufficient for authorization-code consumption, refresh rotation, uniqueness constraints, and concurrent requests. Those behaviors require isolated PostgreSQL integration tests.

## Release gates

| Gate | Status | Requirement | Evidence |
|---|---|---|---|
| GATE-01 | `NOT_STARTED` | All release-blocking tasks in `TASKS.md` are `DONE`. | — |
| GATE-02 | `DONE` | Changed OAuth/API files pass Biome and relevant Jest suites. | `npm run verify:oauth-quality` passed on 2026-06-29, covering the focused OAuth/GPT Biome scope, release-blocking Jest suites, and no skipped/todo release-blocking tests. |
| GATE-03 | `NOT_STARTED` | No critical or high security finding remains open. | — |
| GATE-04 | `NOT_STARTED` | Cross-customer isolation passes for every resource endpoint. | — |
| GATE-05 | `NOT_STARTED` | Actual ChatGPT authorization, token exchange, API call, refresh, and revocation pass. | — |
| GATE-06 | `DONE` | Log review finds no secret, OTP, session, code, or token leakage. | `npm run verify:oauth-log-safety` passed on 2026-06-29; see `TEST-006` evidence and `SECURITY-VERIFICATION-REPORT.md`. |
| GATE-07 | `NOT_STARTED` | Production TLS, domain, timeout, payload, and rate-limit requirements pass. | — |
| GATE-08 | `NOT_STARTED` | Rollback and emergency client revocation procedures are verified. | — |
| GATE-09 | `NOT_STARTED` | Current public-GPT privacy policy, domain verification, support contact, and publication-review requirements are satisfied. | — |

## Automated test matrix

Run the automated OAuth/GPT security matrix with:

- `npm run verify:oauth-security`

This command executes the repository's focused OAuth, GPT resource API, rate-limit, audit, cleanup, and PostgreSQL-backed protocol suites. Manual browser, Custom GPT, production-topology, and explicit log-review checks remain separate release blockers.

### Configuration and secrets

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| CFG-01 | `NOT_STARTED` | Production starts without required OAuth configuration. | Startup or OAuth initialization fails closed. |
| CFG-02 | `NOT_STARTED` | Callback URI is HTTP, malformed, or on an unapproved domain. | Configuration is rejected. |
| CFG-03 | `NOT_STARTED` | Client secret or token is serialized through an API/model response. | Sensitive field is absent. |
| CFG-04 | `NOT_STARTED` | Development/test configuration is loaded. | Explicit non-production values are used. |

### Authorization endpoint

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| AUT-01 | `NOT_STARTED` | Valid client, callback, `state`, and scopes. | Login/consent interaction starts. |
| AUT-02 | `NOT_STARTED` | Missing or empty `state`. | Request fails; no code is issued. |
| AUT-03 | `NOT_STARTED` | Unknown or disabled client. | Local safe error; no external redirect. |
| AUT-04 | `NOT_STARTED` | Callback differs by path, query, case, encoding, subdomain, or trailing slash. | Exact-match validation rejects it. |
| AUT-05 | `NOT_STARTED` | Attacker supplies a callback with an approved domain embedded in user-info or query text. | Request is rejected. |
| AUT-06 | `NOT_STARTED` | Unsupported response type or grant. | Standards-compatible error; no code. |
| AUT-07 | `NOT_STARTED` | Unknown or unapproved scope. | `invalid_scope`; no broader grant. |
| AUT-08 | `NOT_STARTED` | Anonymous customer completes OTP login. | Original validated interaction resumes once. |
| AUT-09 | `NOT_STARTED` | Authorization interaction expires during login. | Safe restart is required. |
| AUT-10 | `NOT_STARTED` | Approval/denial POST lacks valid CSRF proof. | Request is rejected. |
| AUT-11 | `NOT_STARTED` | Customer denies access. | Callback receives `access_denied` and original `state`. |
| AUT-12 | `NOT_STARTED` | Customer approves access. | Callback receives one code and original `state`. |
| AUT-13 | `NOT_STARTED` | Scope request increases after prior consent. | New consent is required. |

### Authorization-code exchange

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| COD-01 | `NOT_STARTED` | Valid code, client, callback, and form-encoded request. | One token set is issued. |
| COD-02 | `NOT_STARTED` | Code is exchanged twice. | Second request returns `invalid_grant`. |
| COD-03 | `NOT_STARTED` | Two concurrent requests exchange one code. | Exactly one succeeds. |
| COD-04 | `NOT_STARTED` | Code is expired. | `invalid_grant`; no tokens. |
| COD-05 | `NOT_STARTED` | Code is used by another client. | `invalid_grant`; no information leak. |
| COD-06 | `NOT_STARTED` | Exchange callback differs from authorization callback. | `invalid_grant`. |
| COD-07 | `NOT_STARTED` | Client secret is wrong, missing, duplicated, or malformed. | `invalid_client`; rate-limit counter advances. |
| COD-08 | `NOT_STARTED` | Token request uses unsupported content type. | Safe standards-compatible failure. |
| COD-09 | `NOT_STARTED` | Raw code/token persistence is inspected. | Only hashes are present. |
| COD-10 | `NOT_STARTED` | Token exchange uses `client_secret_post`, then `client_secret_basic`. | Both explicitly permitted methods authenticate successfully. |
| COD-11 | `NOT_STARTED` | Credentials are supplied through both methods, duplicated, or conflict. | `invalid_client`; no method-precedence ambiguity. |

### Refresh and revocation

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| REF-01 | `NOT_STARTED` | Valid refresh token is used. | New access and refresh tokens are issued; old refresh token is consumed. |
| REF-02 | `NOT_STARTED` | Consumed refresh token is reused. | Entire token family is revoked and an alertable event is emitted. |
| REF-03 | `NOT_STARTED` | Two concurrent refreshes use one token. | At most one succeeds; family behavior is deterministic. |
| REF-04 | `NOT_STARTED` | Expired or revoked refresh token is used. | `invalid_grant`; no token. |
| REF-05 | `NOT_STARTED` | Refresh token is submitted by another client. | Request fails without revealing ownership. |
| REF-06 | `NOT_STARTED` | Customer disconnects the GPT. | Existing access and refresh tokens cease to authorize requests. |
| REF-07 | `NOT_STARTED` | Client is disabled administratively. | New authorization, exchange, and refresh operations fail; an existing access token expires normally within 15 minutes unless explicitly revoked. |

### Resource API authorization

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| API-01 | `NOT_STARTED` | Missing or malformed authorization header. | `401`; no protected data. |
| API-02 | `NOT_STARTED` | Unknown, expired, or revoked access token. | `401`; no protected data. |
| API-03 | `NOT_STARTED` | Valid token lacks required scope. | `403`; no protected data. |
| API-04 | `NOT_STARTED` | Customer A requests customer B's booking identifier. | `404`; no existence disclosure. |
| API-05 | `NOT_STARTED` | Customer A lists bookings/invoices. | Only customer A records are returned. |
| API-06 | `NOT_STARTED` | Staff/admin website session cookie is sent without Bearer token. | `401`; cookie is not treated as OAuth. |
| API-07 | `NOT_STARTED` | OAuth token is presented as a website session cookie. | It does not create a website session. |
| API-08 | `NOT_STARTED` | Page size, cursor, dates, or filters exceed bounds. | Validated `4xx`; bounded database work. |
| API-09 | `NOT_STARTED` | Other-customer and nonexistent IDs are compared. | Indistinguishable safe error shape. |
| API-10 | `NOT_STARTED` | Deleted, disabled, or role-changed customer owns a live token. | Disabled-customer tokens expire normally within 15 minutes, deleted/unresolvable customers fail authorization, and role changes never create staff access. |
| API-11 | `NOT_STARTED` | Delivery-file metadata is listed. | Only the authenticated customer's visible files and authenticated dashboard links are returned; no binary, S3 key, direct storage URL, or signed URL is exposed. |
| API-12 | `NOT_STARTED` | A dashboard file link contains an invalid or other-customer `fileId`. | The normal files page renders without an existence signal; no other-customer card is targeted. |

### Rate limits, payloads, and resilience

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| RES-01 | `NOT_STARTED` | OTP, authorize, token, refresh, or API limits are exceeded. | `429` with safe retry guidance. |
| RES-02 | `NOT_STARTED` | PM2 restarts or multiple production processes handle requests. | Atomic PostgreSQL-backed limits remain correct. |
| RES-03 | `NOT_STARTED` | Maximum valid page is requested. | Response stays below 100,000 characters. |
| RES-04 | `NOT_STARTED` | Slow dependency or database query approaches timeout. | Request fails safely before 45 seconds. |
| RES-05 | `NOT_STARTED` | Database error occurs after code consumption begins. | Transaction prevents partial token issuance. |
| RES-06 | `NOT_STARTED` | Cleanup runs during token operations. | Active artifacts remain valid and operations do not deadlock. |
| RES-07 | `NOT_STARTED` | User-controlled data contains markup or control characters. | JSON remains valid and UI output is safely escaped. |

### Logging and privacy

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| LOG-01 | `NOT_STARTED` | Successful and failed OAuth flows are captured. | Logs contain safe event codes and correlation IDs. |
| LOG-02 | `DONE` | Logs/error tracker are searched for test secrets. | `npm run verify:oauth-log-safety` now enforces the reviewed OAuth/GPT logging boundaries, verifies no environment secrets are logged in reviewed config/worker paths, confirms no live credentials appear in source/docs/scripts fixtures, and repo review found no separate in-repo error-monitoring SDK. |
| LOG-03 | `NOT_STARTED` | Resource responses are inspected. | Only consented fields are returned. |
| LOG-04 | `NOT_STARTED` | A customer revokes consent. | Audit trail records who/what/when without sensitive artifacts. |
| LOG-05 | `NOT_STARTED` | Refresh-token reuse occurs. | High-severity event is observable and actionable. |
| LOG-06 | `DONE` | Database audit retention cleanup runs. | Focused cleanup tests cover bounded batch deletion for expired OAuth audit events and other expired/revoked artifacts. |

## Manual browser verification

| ID | Status | Procedure | Evidence |
|---|---|---|---|
| MAN-01 | `NOT_STARTED` | Open a valid authorize URL while logged out; finish OTP and confirm the consent page resumes. | — |
| MAN-02 | `NOT_STARTED` | Deny consent and verify the correct callback error and unchanged state. | — |
| MAN-03 | `NOT_STARTED` | Approve consent and verify that browser history and UI do not expose tokens or secrets. | — |
| MAN-04 | `NOT_STARTED` | Reconnect with unchanged scopes and validate the chosen repeat-consent behavior. | — |
| MAN-05 | `NOT_STARTED` | Reconnect with increased scopes and verify fresh consent. | — |
| MAN-06 | `NOT_STARTED` | Disconnect from the customer dashboard and verify API access stops. | — |
| MAN-07 | `NOT_STARTED` | Open a returned `/dashboard/files?fileId=...` link while signed in and signed out. | Login preserves the target; the page scrolls to and identifies only the owned file card. |

## Custom GPT end-to-end verification

Use at least two production-like test customers with different bookings.

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| GPT-01 | `NOT_STARTED` | Import the OpenAPI document into the target GPT. | Import succeeds and only approved operations appear. |
| GPT-02 | `NOT_STARTED` | Invoke an action while disconnected. | ChatGPT displays the Milkywayy sign-in control. |
| GPT-03 | `NOT_STARTED` | Complete OTP login and consent. | ChatGPT receives a token and retries/completes the action. |
| GPT-04 | `NOT_STARTED` | Ask for current customer's bookings. | Only that customer's bounded records are returned. |
| GPT-05 | `NOT_STARTED` | Ask for a booking belonging to the other test customer. | No other-customer data or existence signal is returned. |
| GPT-06 | `NOT_STARTED` | Let/force the access token expire. | Refresh succeeds without another login while refresh grant remains valid. |
| GPT-07 | `NOT_STARTED` | Revoke access in Milkywayy. | Subsequent action requires reconnection. |
| GPT-08 | `NOT_STARTED` | Trigger rate limiting safely. | ChatGPT receives `429` and backs off without exposing internals. |
| GPT-09 | `NOT_STARTED` | Exercise largest expected response. | Call completes under 45 seconds and 100,000 characters. |
| GPT-10 | `NOT_STARTED` | Ask for delivered files and open one returned website link. | ChatGPT returns metadata only; the authenticated website opens at the selected customer-owned file. |

## Regression suites

At minimum, rerun tests covering:

- Customer OTP send, verification, login, logout, and session retrieval.
- Admin login and customer/admin route separation.
- Dashboard return-path handling.
- Booking ownership, listing, and detail retrieval.
- Invoice ownership and metadata generation.
- File authorization, even though binary files are excluded from GPT Actions.
- Proxy behavior and all changed API route handlers.

Pre-existing failures must be recorded with their baseline commit and must not obscure new failures.

## Production smoke test

After deployment and before enabling the GPT for users:

1. Confirm existing website and admin login still work.
2. Confirm OAuth endpoints are HTTPS on the production domain.
3. Confirm an invalid callback is never followed.
4. Connect a dedicated smoke-test customer through ChatGPT.
5. Call each approved read operation and check ownership manually.
6. Refresh the token, then revoke the connection and confirm access stops.
7. Inspect application and error-monitoring logs for leaked artifacts.
8. Confirm metrics, rate limits, alerts, cleanup, and rollback controls are active.
