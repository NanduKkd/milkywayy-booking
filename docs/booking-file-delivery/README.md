# Booking File Delivery

This document describes the current booking-deliverable classification and
upload compatibility contract.

## Delivery classifications

New admin uploads use exactly these persisted classifications:

1. `Photography`
2. `Short Form Video`
3. `Long Form Video`
4. `360 Virtual Tour`

For every new delivery file, the selected classification is stored unchanged
in both `BookingDeliveryFile.type` and `BookingDeliveryFile.label`. The
customer `/dashboard/files` view renders that persisted label, so short-form
and long-form video remain distinct.

`Videography` is a compatibility-only legacy value. Existing records remain
readable on admin and customer surfaces and can receive replacement versions,
but admins cannot select `Videography` for a new delivery. No existing rows are
guessed, backfilled, or migrated to a canonical video classification.

## Upload and replacement rules

Both the direct multipart flow and the S3/external-link registration flow
enforce the new-delivery allow-list on the server. Unsupported values and
compatibility-only `Videography` values are rejected for new records.

A replacement must submit the exact type already stored on its target delivery
file. This permits legacy `Videography` replacements while preventing a
replacement from reclassifying a file. Replacement versions preserve the
logical file's existing `type`, `label`, revision count, and review history.

`Short Form Video`, `Long Form Video`, and legacy `Videography` all use video
upload categorization and downstream video media handling. Photography and
360-tour behavior, MIME and size limits, booking state and ownership checks,
authenticated downloads, revision limits, completion rules, and
property-sharing eligibility are unchanged by this classification split.

## Data and operations

The delivery type and label columns already store strings, so this change does
not require a database migration or production backfill. Operators should
leave legacy rows untouched and select one of the four canonical choices for
every new upload.

## Customer review groups

Bookings and Properties open the same authenticated delivery/review modal,
backed by the exact persisted-type service projection. Each group—including
legacy `Videography`—is one review decision with one status, Dubai deadline,
revision number, and revision request. One-file services retain their
individual download or copy-link action. Multi-file services expose only the
group ZIP action and never individual member actions. The generic
`/dashboard/files` route ignores `fileId` query targeting and provides no
existence, scrolling, highlighting, or modal-state signal for it.

The customer Bookings dashboard projects the five reference workflow steps:
**Shoot Booked**, **Shoot Done**, **Editing**, **Files Uploaded**, and
**Project Completed**. Completed steps use filled checks, the current step uses
an outlined number, and pending steps remain dim. The tracker is horizontal at
`900×560` and above; it switches to the reference vertical presentation when
either the viewport is narrower than 900px or shorter than 560px.

Reference-facing ready, partial, and replacement labels come from existing
booking/service state; they add no persisted workflow state. A partially
delivered project remains visually on **Editing** while more booked services
are pending, even though publishing a safe file may already have advanced the
server workflow to `FILES_UPLOADED`. Completed projects fill all five steps.
Cancellation overrides stale workflow state. Legacy `Videography` remains
distinct, while private, deleted, and changes-requested members do not appear
as ready categories.

Delivery-state cards expose **Download Files** directly into the reusable
authenticated delivery/review modal. Eligible unshared projects open the real
**Create Share Link** listing modal directly from Bookings; published projects
show the active-link state and route **Edit Share Link** back to Properties.
Scheduled Reschedule/Cancel controls do not leak into partial, uploaded, or
completed delivery states.

A customer revision request identifies only the booking and service type. The
server authorizes that owner-scoped group, locks the booking and its current
members in deterministic order, records the same bounded note and request
number on every member, and changes the whole group together. Requested groups
remain pending until every requested member has a replacement; the final
replacement reopens all current members under one fresh deadline. Adding a
file to a reviewable or accepted group similarly reopens the complete group.

Manual completion and deadline acceptance operate on locked complete groups;
they never leave a service partially accepted. A booking still cannot complete
while any private or changes-requested group remains.

## Admin delivery categories

The admin booking Deliverables panel derives the same exact-type categories as
customer review, but includes every active nondeleted member so operators can
also manage private and replacement-pending files. Each category shows one
derived status, revision count, review deadline, and unresolved request note.
Multi-file categories start collapsed behind `Show All Files`; one-file
categories render their member directly. Requested members retain individual
replacement controls only when their category is visible.

`Delete Category` operates on the server-derived `(booking_id, exact type)`
group, never a client-supplied file list. It removes every active member and
its owned historical storage objects after the database transaction commits,
clears delivery-finished state, and leaves other categories unchanged.

## Multi-file downloads

Reviewable or accepted groups with two or more current customer-visible members
expose **Download ZIP** without rendering individual member actions. One-file
groups retain their individual download or copy-link action. A group awaiting
any replacement exposes no partial ZIP. The
authenticated ZIP route derives the owner-scoped booking and exact service type
on the server, then snapshots and preflights eligible current versions before
it starts streaming. S3 objects are stored in the ZIP without recompression;
copy-link deliveries are written to `EXTERNAL_LINKS.txt` and are never fetched
by the application.
