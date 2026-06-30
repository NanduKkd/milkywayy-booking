# Admin access control and Settings operations

- Last updated: 2026-06-30

## Preconditions

- Inventory all current staff-role rows and confirm at least one recoverable Super Admin.
- Complete the admin page/API/action permission inventory.
- Select and configure the email provider in non-production and production environments.
- Store exact sender/domain/provider/deployment details only in approved private configuration.

## Staged rollout

1. Add `ADMIN` and `ACCOUNTS` role values, account state, permission, invitation,
   and audit storage without removing legacy values.
2. Seed safe permission defaults and deploy central permission checks in
   compatibility/report-only mode where practical.
3. Deploy Settings to Super Admin only.
4. Inventory legacy `TRANSPORT`/`SHOOT` rows, disable them, and assign new roles
   only after explicit review.
5. Enforce permissions route by route and API/action by API/action.
6. Enable email invitations and acceptance after token and provider gates pass.
7. Prove no runtime/default/migration references use legacy roles.
8. Remove legacy enum values through a dedicated verified migration.

## Email operations

Monitor send acceptance, provider rejection, bounce/failure signals, resend,
expiration, revoke, and acceptance. Provider outages must leave a retryable
invitation record without exposing or reusing plaintext tokens.

## Lockout safeguards

- Super Admin permission bypass is code-defined and not editable.
- The last active Super Admin cannot be deactivated, demoted, or deleted.
- Rollout requires a verified recovery path documented privately.
- Permission changes apply predictably to new and existing sessions under the
  accepted session refresh/invalidation design.

## Monitoring

Monitor authorization denials by permission, legacy-role encounters, invite
failures, token validation failures, staff lifecycle changes, and audit-write
failures. Do not log credentials, plaintext tokens, or full provider payloads.

## Rollback

- Stop new invitations and permission edits first.
- Revert enforcement to the last compatible permission snapshot without
  restoring the unsafe “any non-customer is admin” shortcut.
- Retain invitation and audit rows.
- Do not remove new enum values or tables while application versions still reference them.
