# GPT Actions OAuth security and test plan

- Last updated: 2026-06-30
- Verification status: `DONE`

## Test strategy

The OAuth authorization server and resource API are a new security boundary. Verification must include unit tests, database-backed protocol integration tests, HTTP route tests, manual browser testing, and an end-to-end connection from the actual Custom GPT.

Mock-only tests are insufficient for authorization-code consumption, refresh rotation, uniqueness constraints, and concurrent requests. Those behaviors require isolated PostgreSQL integration tests.

## Release gates

| Gate | Status | Requirement | Evidence |
|---|---|---|---|
| GATE-01 | `DONE` | All release-blocking tasks in `TASKS.md` are `DONE`. | As of 2026-06-30, every release-blocking task in `TASKS.md` is marked `DONE` for the first release. |
| GATE-02 | `DONE` | Changed OAuth/API files pass Biome and relevant Jest suites. | `npm run verify:oauth-quality` passed on 2026-06-29, covering the focused OAuth/GPT Biome scope, release-blocking Jest suites, and no skipped/todo release-blocking tests. |
| GATE-03 | `DONE` | No critical or high security finding remains open. | `npm run verify:oauth-security` on 2026-06-29 found no critical or high-severity finding in the automated OAuth/GPT matrix, the project owner completed the remaining manual/GPT checks on 2026-06-30, and the focused revoke integration coverage was extended the same day to prove post-revocation access-token and refresh-token failure. |
| GATE-04 | `DONE` | Cross-customer isolation passes for every resource endpoint. | `npm run verify:oauth-security` on 2026-06-29 regenerated `SECURITY-VERIFICATION-REPORT.md` with automated coverage for `API-04`, `API-05`, `API-09`, `API-11`, and `API-12`, plus the shared `401`/`403`/`429` GPT API authorization paths. |
| GATE-05 | `DONE` | Actual ChatGPT authorization, token exchange, API call, refresh, and revocation pass. | The project owner confirmed the full Custom GPT flow on 2026-06-30, including import, connect, read operations, refresh, rate-limit handling, file-link handoff, and reconnection after revocation. |
| GATE-06 | `DONE` | Log review finds no secret, OTP, session, code, or token leakage. | `npm run verify:oauth-log-safety` passed on 2026-06-29; see `TEST-006` evidence and `SECURITY-VERIFICATION-REPORT.md`. |
| GATE-07 | `DONE` | Production TLS, domain, timeout, payload, and rate-limit requirements pass. | On 2026-06-30, `curl -Ik https://milkywayy.com` confirmed the public HTTPS endpoint, the origin proxy was verified against the required forwarded-host/proto and GPT-safe proxy limits, and live `/oauth/*` plus `/api/gpt/v1/*` requests succeeded through the public domain. Exact host-level deployment details are maintained in `docs/private/PRODUCTION-DEPLOYMENT.md`; `DEC-021` records the tracked safety constraints. |
| GATE-08 | `DONE` | Rollback and emergency client revocation procedures are verified. | On 2026-06-30, predeploy DB/code backups were created, customer revocation was validated live, and the production client disable/enable path was exercised end-to-end: new authorize requests failed safely, refresh failed with `invalid_client`, existing access tokens kept working until expiry, and re-enable restored authorize rendering. |
| GATE-09 | `DONE` | Current public-GPT privacy policy, domain verification, support contact, and publication-review requirements are satisfied. | The project owner confirmed these public-GPT release prerequisites were complete on 2026-06-30. |

## Automated test matrix

Run the automated OAuth/GPT security matrix with:

- `npm run verify:oauth-security`

This command executes the repository's focused OAuth, GPT resource API, rate-limit, audit, cleanup, and PostgreSQL-backed protocol suites. Manual browser, Custom GPT, production-topology, and explicit log-review checks remain separate release blockers.

After each passing run, `SECURITY-VERIFICATION-REPORT.md` is regenerated with the current suite counts and automated case coverage. Treat that report as the execution evidence for automated abuse-case checks; the tables below remain the authoritative scenario list and still require separate manual/GPT/production evidence where noted.

### Configuration and secrets

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| CFG-01 | `DONE` | Production starts without required OAuth configuration. | Startup or OAuth initialization fails closed. |
| CFG-02 | `DONE` | Callback URI is HTTP, malformed, or on an unapproved domain. | Configuration is rejected. |
| CFG-03 | `DONE` | Client secret or token is serialized through an API/model response. | Sensitive field is absent. |
| CFG-04 | `DONE` | Development/test configuration is loaded. | Explicit non-production values are used. |

### Authorization endpoint

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| AUT-01 | `DONE` | Valid client, callback, `state`, and scopes. | Login/consent interaction starts. |
| AUT-02 | `DONE` | Missing or empty `state`. | Request fails; no code is issued. |
| AUT-03 | `DONE` | Unknown or disabled client. | Local safe error; no external redirect. |
| AUT-04 | `DONE` | Callback differs by path, query, case, encoding, subdomain, or trailing slash. | Exact-match validation rejects it. |
| AUT-05 | `DONE` | Attacker supplies a callback with an approved domain embedded in user-info or query text. | Request is rejected. |
| AUT-06 | `DONE` | Unsupported response type or grant. | Standards-compatible error; no code. |
| AUT-07 | `DONE` | Unknown or unapproved scope. | `invalid_scope`; no broader grant. |
| AUT-08 | `DONE` | Anonymous customer completes OTP login. | Original validated interaction resumes once. |
| AUT-09 | `DONE` | Authorization interaction expires during login. | Safe restart is required. |
| AUT-10 | `DONE` | Approval/denial POST lacks valid CSRF proof. | Request is rejected. |
| AUT-11 | `DONE` | Customer denies access. | Callback receives `access_denied` and original `state`. |
| AUT-12 | `DONE` | Customer approves access. | Callback receives one code and original `state`. |
| AUT-13 | `DONE` | Scope request increases after prior consent. | New consent is required. |

### Authorization-code exchange

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| COD-01 | `DONE` | Valid code, client, callback, and form-encoded request. | One token set is issued. |
| COD-02 | `DONE` | Code is exchanged twice. | Second request returns `invalid_grant`. |
| COD-03 | `DONE` | Two concurrent requests exchange one code. | Exactly one succeeds. |
| COD-04 | `DONE` | Code is expired. | `invalid_grant`; no tokens. |
| COD-05 | `DONE` | Code is used by another client. | `invalid_grant`; no information leak. |
| COD-06 | `DONE` | Exchange callback differs from authorization callback. | `invalid_grant`. |
| COD-07 | `DONE` | Client secret is wrong, missing, duplicated, or malformed. | `invalid_client`; rate-limit counter advances. |
| COD-08 | `DONE` | Token request uses unsupported content type. | Safe standards-compatible failure. |
| COD-09 | `DONE` | Raw code/token persistence is inspected. | Only hashes are present. |
| COD-10 | `DONE` | Token exchange uses `client_secret_post`, then `client_secret_basic`. | Both explicitly permitted methods authenticate successfully. |
| COD-11 | `DONE` | Credentials are supplied through both methods, duplicated, or conflict. | `invalid_client`; no method-precedence ambiguity. |

### Refresh and revocation

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| REF-01 | `DONE` | Valid refresh token is used. | New access and refresh tokens are issued; old refresh token is consumed. |
| REF-02 | `DONE` | Consumed refresh token is reused. | Entire token family is revoked and an alertable event is emitted. |
| REF-03 | `DONE` | Two concurrent refreshes use one token. | At most one succeeds; family behavior is deterministic. |
| REF-04 | `DONE` | Expired or revoked refresh token is used. | `invalid_grant`; no token. |
| REF-05 | `DONE` | Refresh token is submitted by another client. | Request fails without revealing ownership. |
| REF-06 | `DONE` | Customer disconnects the GPT. | Existing access and refresh tokens cease to authorize requests. |
| REF-07 | `DONE` | Client is disabled administratively. | New authorization, exchange, and refresh operations fail; an existing access token expires normally within 15 minutes unless explicitly revoked. |

### Resource API authorization

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| API-01 | `DONE` | Missing or malformed authorization header. | `401`; no protected data. |
| API-02 | `DONE` | Unknown, expired, or revoked access token. | `401`; no protected data. |
| API-03 | `DONE` | Valid token lacks required scope. | `403`; no protected data. |
| API-04 | `DONE` | Customer A requests customer B's booking identifier. | `404`; no existence disclosure. |
| API-05 | `DONE` | Customer A lists bookings/invoices. | Only customer A records are returned. |
| API-06 | `DONE` | Staff/admin website session cookie is sent without Bearer token. | `401`; cookie is not treated as OAuth. |
| API-07 | `DONE` | OAuth token is presented as a website session cookie. | It does not create a website session. |
| API-08 | `DONE` | Page size, cursor, dates, or filters exceed bounds. | Validated `4xx`; bounded database work. |
| API-09 | `DONE` | Other-customer and nonexistent IDs are compared. | Indistinguishable safe error shape. |
| API-10 | `DONE` | Deleted, disabled, or role-changed customer owns a live token. | Disabled-customer tokens expire normally within 15 minutes, deleted/unresolvable customers fail authorization, and role changes never create staff access. |
| API-11 | `DONE` | Delivery-file metadata is listed. | Only the authenticated customer's visible files and authenticated dashboard links are returned; no binary, S3 key, direct storage URL, or signed URL is exposed. |
| API-12 | `DONE` | A dashboard URL contains any `fileId` query value. | The normal generic files page renders without resolving, highlighting, opening, or emitting an existence signal for that value. |

### Rate limits, payloads, and resilience

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| RES-01 | `DONE` | OTP, authorize, token, refresh, or API limits are exceeded. | `429` with safe retry guidance. |
| RES-02 | `DONE` | PM2 restarts or multiple production processes handle requests. | Atomic PostgreSQL-backed limits remain correct. |
| RES-03 | `DONE` | Maximum valid page is requested. | Response stays below 100,000 characters. |
| RES-04 | `DONE` | Slow dependency or database query approaches timeout. | Request fails safely before 45 seconds. |
| RES-05 | `DONE` | Database error occurs after code consumption begins. | Transaction prevents partial token issuance. |
| RES-06 | `DONE` | Cleanup runs during token operations. | Active artifacts remain valid and operations do not deadlock. |
| RES-07 | `DONE` | User-controlled data contains markup or control characters. | JSON remains valid and UI output is safely escaped. |

### Logging and privacy

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| LOG-01 | `DONE` | Successful and failed OAuth flows are captured. | Logs contain safe event codes and correlation IDs. |
| LOG-02 | `DONE` | Logs/error tracker are searched for test secrets. | `npm run verify:oauth-log-safety` now enforces the reviewed OAuth/GPT logging boundaries, verifies no environment secrets are logged in reviewed config/worker paths, confirms no live credentials appear in source/docs/scripts fixtures, and repo review found no separate in-repo error-monitoring SDK. |
| LOG-03 | `DONE` | Resource responses are inspected. | Only consented fields are returned. |
| LOG-04 | `DONE` | A customer revokes consent. | Audit trail records who/what/when without sensitive artifacts. |
| LOG-05 | `DONE` | Refresh-token reuse occurs. | High-severity event is observable and actionable. |
| LOG-06 | `DONE` | Database audit retention cleanup runs. | Focused cleanup tests cover bounded batch deletion for expired OAuth audit events and other expired/revoked artifacts. |

## Manual browser verification

| ID | Status | Procedure | Evidence |
|---|---|---|---|
| MAN-01 | `DONE` | Open a valid authorize URL while logged out; finish OTP and confirm the consent page resumes. | Live production verification on 2026-06-30 exercised logged-out authorize through OTP login and resumed to the consent screen for a production-like customer account. |
| MAN-02 | `DONE` | Deny consent and verify the correct callback error and unchanged state. | Live production verification on 2026-06-30 exercised consent denial and observed `access_denied` with the original `state` preserved. |
| MAN-03 | `DONE` | Approve consent and verify that browser history and UI do not expose tokens or secrets. | The project owner confirmed on 2026-06-30 that approval redirected successfully and no tokens, codes, or comparable secrets were visible in browser history, the address bar, the page UI, or inspectable client-side storage. |
| MAN-04 | `DONE` | Reconnect with unchanged scopes and validate the chosen repeat-consent behavior. | Live production verification on 2026-06-30 exercised unchanged-scope reconnect and confirmed the repeat-consent rendering path. |
| MAN-05 | `DONE` | Reconnect with increased scopes and verify fresh consent. | First-release v1 exposes only `customer:read`, so there is no broader-scope reconnect path to exercise yet. This scenario is closed as not applicable for v1 and should be reopened only when an additional scope is introduced. |
| MAN-06 | `DONE` | Disconnect from the customer dashboard and verify API access stops. | Live production verification on 2026-06-30 exercised dashboard revocation and confirmed both resource authorization and subsequent refresh stopped working. |
| MAN-07 | `DONE` | Open the returned `/dashboard/files` URL while signed in and signed out. | Authentication gates the page normally and no file-targeting query contract is present. |

## Custom GPT end-to-end verification

Use at least two production-like test customers with different bookings.

| ID | Status | Scenario | Expected result |
|---|---|---|---|
| GPT-01 | `DONE` | Import the OpenAPI document into the target GPT. | The project owner confirmed the OpenAPI import completed successfully with only the approved read-only operations visible. |
| GPT-02 | `DONE` | Invoke an action while disconnected. | The project owner confirmed ChatGPT showed the Milkywayy sign-in control when disconnected. |
| GPT-03 | `DONE` | Complete OTP login and consent. | The project owner confirmed ChatGPT completed the OTP login and consent path successfully. |
| GPT-04 | `DONE` | Ask for current customer's bookings. | The project owner confirmed customer-scoped booking reads returned only the connected customer's data. |
| GPT-05 | `DONE` | Ask for a booking belonging to the other test customer. | The project owner confirmed ChatGPT did not reveal any existence signal or foreign-customer data. |
| GPT-06 | `DONE` | Let/force the access token expire. | The project owner confirmed refresh worked without another login while the refresh grant remained valid. |
| GPT-07 | `DONE` | Revoke access in Milkywayy. | The project owner confirmed the next ChatGPT action required reconnection after revoking the connection in Milkywayy. |
| GPT-08 | `DONE` | Trigger rate limiting safely. | The project owner confirmed ChatGPT received bounded `429` behavior without exposed internals. |
| GPT-09 | `DONE` | Exercise largest expected response. | The project owner confirmed the largest expected response completed within the platform limits. |
| GPT-10 | `DONE` | Ask for delivered files and open one returned website link. | The project owner confirmed ChatGPT returned metadata-only file results and the website link handoff behaved correctly. |

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
