# Admin access control and Settings security test plan

- Last updated: 2026-06-30
- Release gate status: `NOT_STARTED`

## Automated authorization matrix

For anonymous, Customer, disabled staff, Admin, Accounts, and Super Admin,
exercise every admin page, API, and server action with allowed and denied
permissions. Cover direct URLs and direct mutation requests, not only navigation.

Required cases include:

- missing role-permission rows deny access;
- Super Admin retains access regardless of editable matrix rows;
- Admin and Accounts gain/lose access after persisted matrix changes;
- customer and staff query boundaries never overlap;
- role and permission mass assignment is rejected;
- last-Super-Admin demotion/deactivation is rejected atomically;
- disabled staff sessions cannot continue privileged access;
- legacy `TRANSPORT`/`SHOOT` roles receive no implicit admin access.

## Invitation security gates

- Tokens have sufficient entropy, are hashed at rest, expire, and are single-use.
- Tampered, unknown, expired, accepted, revoked, and superseded tokens fail with
  non-enumerating responses.
- Resend revokes the previous token.
- Concurrent acceptance creates/activates at most one account.
- Invited email and accepted identity follow the approved binding policy.
- Redirect/return URLs cannot be used for open redirects.
- Password/credential establishment uses existing password policy and safe hashing.
- Provider errors do not leak secrets or plaintext tokens into logs.
- Invitation endpoints are rate limited and audited.

## Audit gates

- Permission changes, invites, resend, revoke, acceptance, role changes, and
  activation state produce actor-attributed events.
- Audit failures block high-impact mutations or follow the explicitly accepted
  failure policy.
- Logs exclude passwords, OTPs, invitation tokens, session tokens, API keys, and provider secrets.

## Manual verification

- Sign in separately as each role and verify navigation plus direct route/API behavior.
- Change Admin/Accounts permissions and verify session refresh behavior.
- Complete invite, resend, revoke, expiry, duplicate acceptance, and provider-failure scenarios.
- Verify staff appear only in Settings and customers only in Users.
- Exercise emergency Super Admin recovery using the private operational procedure.

## Release blockers

- Any server boundary still relies on `user.role !== CUSTOMER` as sufficient authorization.
- A client-hidden action remains directly callable without permission.
- Legacy roles receive access after the enforcement cutover.
- Last-Super-Admin lockout is possible.
- Invitation tokens are stored/logged plaintext, reusable, non-expiring, or enumerable.
- Email-provider credentials or live deployment details appear in tracked files.
