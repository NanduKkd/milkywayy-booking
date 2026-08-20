# Admin scheduling calendar operations

- Last updated: 2026-08-20

## Migration and rollout

1. Add calendar-event storage and indexes without changing availability results.
2. Deploy the shared read-only calendar query and compare its booking/block view
   with existing Time Slots and booking data.
3. Switch customer and admin availability reads to the shared evaluator after
   parity tests pass.
4. Release the Calendar read view.
5. Release event mutation, exact blocking, admin booking preparation, secure
   customer handoff, WhatsApp notification, and payment integration together.

Calendar-only records must remain non-blocking in both customer and admin
availability evaluation.

## Pre-release checks

- Run migration against representative existing bookings and date overrides.
- Compare effective availability for working/non-working days, blocks,
  exclusive-period conflicts, and rolling-window boundaries.
- Verify events and bookings across Dubai midnight and month transitions.
- Exercise simultaneous block/booking creation against the same interval.
- Verify both customer-state handoff links, editable multiple properties,
  automatic/personal/generic promotion states, separate wallet earning, OTP
  verification, WhatsApp choice, and payment completion.
- Change availability, token version, promotion eligibility, and a usage limit
  after preview and confirm checkout fails without a second transaction or
  stale booking set. Force a synthetic Stripe-session failure and confirm retry
  replaces promotion/wallet artifacts safely.
- Verify four-hour expiry, pending availability release, copy-link behavior, and
  replacement-link invalidation without duplicate reservations.
- Confirm block warnings enumerate existing affected records without mutating them.

Run `npm run verify:scheduling-calendar-rollout` before release review to
refresh the tracked automated evidence in `ROLLOUT-VERIFICATION.md` and to
prepare the ignored local worksheet
`docs/private/ADMIN-SCHEDULING-CALENDAR-ROLLOUT.md` for migration execution,
environment-specific smoke-test notes, monitoring confirmation, and rollback
rehearsal details.

## Monitoring

Monitor calendar query latency, conflict response rate, scheduling calculation
errors, handoff creation/completion/expiry, promotion-preview rate limits and
failures, OTP failures, WhatsApp delivery, checkout failures, and differences
between customer and admin availability.

## Rollback

- Disable Calendar mutations before rolling back shared evaluation code.
- Preserve calendar-event rows during application rollback; unused rows are safer
  than destructive down-migration.
- Revoke outstanding customer handoff links before rolling back their backing
  schema or application routes.
- Restore the previous customer availability path only if its schema remains compatible.
- Blocks continue to use existing date overrides and therefore remain operational.

Exact production scheduling and deployment details remain in the private
production document.
