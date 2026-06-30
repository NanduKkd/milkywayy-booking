# Admin scheduling calendar operations

- Last updated: 2026-06-30

## Migration and rollout

1. Add calendar-event storage and indexes without changing availability results.
2. Deploy the shared read-only calendar query and compare its booking/block view
   with existing Time Slots and booking data.
3. Switch customer and admin availability reads to the shared evaluator after
   parity tests pass.
4. Release the Calendar read view.
5. Enable calendar-event mutation, blocking, then full admin-booking creation in
   separate gates.

Calendar-only records must not affect customer availability until the shared
evaluator and `consumesCapacity` behavior are enabled together.

## Pre-release checks

- Run migration against representative existing bookings and date overrides.
- Compare effective availability for working/non-working days, blocks, full
  capacity, partial capacity, and rolling-window boundaries.
- Verify events and bookings across Dubai midnight and month transitions.
- Exercise simultaneous event/booking creation against the same capacity.
- Confirm block warnings enumerate existing affected records without mutating them.

## Monitoring

Monitor calendar query latency, conflict response rate, override creation,
capacity calculation errors, failed manual booking creation, and differences
reported between customer and admin availability.

## Rollback

- Disable Calendar mutations before rolling back shared evaluation code.
- Preserve calendar-event rows during application rollback; unused rows are safer
  than destructive down-migration.
- Restore the previous customer availability path only if its schema remains compatible.
- Blocks continue to use existing date overrides and therefore remain operational.

Exact production scheduling and deployment details remain in the private
production document.
