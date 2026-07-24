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

The customer Files dashboard now groups current delivery files by booking and
their exact persisted type. Each group—including the legacy `Videography`
group—is one review decision with one status, Dubai deadline, revision number,
and revision request. Individual filenames, links/downloads, and `fileId`
highlights remain inside their service section.

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
