# Admin scheduling calendar decisions

- Last updated: 2026-06-30

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| CAL-D001 | Support both calendar-only events and complete admin-created bookings. | Operational holds/notes do not always need customer, payment, invoice, or delivery records; real bookings do. |
| CAL-D002 | Time Slots remains the scheduling configuration authority. | Working days are only one overlap; blocks, periods, capacity, weights, rolling windows, and existing bookings must also agree. |
| CAL-D003 | Calendar-only events explicitly declare whether they consume capacity. | Informational notes must not block customers, while holds and manual shoots usually should. |
| CAL-D004 | Full-day and period blocks reuse existing date overrides. | A second block store would create inconsistent customer and admin availability. |
| CAL-D005 | Existing bookings survive later blocks. | Blocking future availability must not silently mutate paid or operational records. |
| CAL-D006 | Admin booking creation uses shared pricing and availability services. | Duplicate calculation logic would drift from customer checkout. |
| CAL-D007 | Dubai business time controls scheduling boundaries. | The service operates on Dubai property schedules, independent of server/operator timezone. |
| CAL-D008 | Server-side conflict checks are mandatory at mutation time. | Calendar views become stale and cannot safely guarantee capacity on their own. |

## Deferred decisions

- Recurring events.
- Drag-and-drop rescheduling.
- External calendar synchronization.
- Automated staff/resource assignment.
