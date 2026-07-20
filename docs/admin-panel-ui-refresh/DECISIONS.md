# Admin panel UI refresh decisions

- Last updated: 2026-07-20

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| UI-D001 | Superseded by UI-D018. The earlier prototype-as-inspiration contract no longer applies. | Owner acceptance feedback established a stricter reference-as-spec direction. |
| UI-D002 | Existing operational behavior takes precedence over prototype simplification. | The current admin contains working behavior absent from the mockup. |
| UI-D003 | Every current admin page receives the shared dark styling in this release. | A partially refreshed admin would retain the inconsistency this work is intended to remove. |
| UI-D004 | Existing routes remain authoritative. `/admin` is Dashboard and `/admin/analytics` remains detailed Reports. | Direct navigation and existing links remain stable while Dashboard analytics moves onto the landing page. |
| UI-D005 | The current login structure and authentication flow remain in place; only its styling changes. | Authentication restructuring is outside this visual cleanup. |
| UI-D006 | Dashboard values come only from the analytics service. | This prevents duplicated formulas and disagreement with Reports. |
| UI-D007 | The release targets the current Super Admin surface only. Permission-aware navigation and Admin/Accounts role acceptance are removed. | `admin-access-control` is deferred and those roles are not current product scope. |
| UI-D008 | Navigation groups are Workspace, Finance, Operations, and Content. The `/admin/users` label becomes Customers. | This matches the current route inventory and makes the customer-management purpose explicit. |
| UI-D009 | Promotions is one navigation item with Generic Codes, Personal Auto-Apply, and Automatic Discounts tabs. | Coupons and Discounts have already been consolidated; their legacy routes redirect to Promotions. |
| UI-D010 | The admin supports one dark theme. | Light and system themes do not contribute to the immediate cleanup goal. |
| UI-D011 | Mobile navigation uses a drawer; wide tables use intentional horizontal scrolling rather than mobile cards. | This keeps the complete navigation and reduces page-specific responsive reimplementation. |
| UI-D012 | Unsupported prototype controls, including New Booking, are omitted. | Decorative controls must not imply unavailable behavior. |
| UI-D013 | Add Bookings status filters, Invoice search and filtered totals, and Portfolio media-type filters. | These small interactions materially improve the refreshed list pages. |
| UI-D014 | Preserve Portfolio drag ordering and add Review drag ordering within Featured and Standard groups. | Both content surfaces need direct, consistent control over public display order without changing featured priority. |
| UI-D015 | Reviews do not receive the prototype preview column. | The owner explicitly excluded it from this release. |
| UI-D016 | The feature ships as one release; final visual acceptance is performed by the owner. | The goal is a coherent whole-admin refresh without a formal visual-certification process. |
| UI-D017 | Pricing Configuration uses the prototype's single price-matrix UI and removes summary cards, slot inputs, evening toggles, badges, service panels, and the duplicate save action. | The owner explicitly approved the simpler pricing surface. Price edits continue through the existing server action, and unexposed configuration fields are retained in the saved object. Commercial uses one Long Form column because its live configuration has one direct long-form price rather than the three residential variants. |
| UI-D018 | The owner-supplied `design-reference.jsx` is the target visual specification and may be copied directly wherever current production behavior permits. | The admin must match the accepted dense design rather than reinterpret it as a spacious themed system. |
| UI-D019 | The default admin presentation is compact, dense, and scan-first. Use the reference's narrow fixed shell, zinc surfaces, small radii, compact controls, and table-first hierarchy throughout the current authenticated route inventory. | Repeat operators need maximum useful information with minimal reading and scrolling. |
| UI-D020 | Remove repeated introductions, decorative summary cards, and documentation-like helper text from routine surfaces. Preserve labels, validation, error recovery, destructive confirmation, and accessibility text needed to operate safely. | Density must not remove essential operating or safety information. |
| UI-D021 | Reference fixture records and unsupported controls are excluded. Live data, authorization, route boundaries, and supported mutations remain authoritative. | The reference defines presentation, not domain state or product capability. |
| UI-D022 | Calendar month cells have fixed height, show at most two short status-colored markers, and expose additional entries as `+N`; selecting the date exposes the complete day. | Busy dates must not make the month grid grow or become difficult to scan. |
| UI-D023 | `/admin/timeslots` is configuration-only; the calendar and all date-specific availability changes live in `/admin/scheduling-calendar`. | A duplicate calendar adds navigation and maintenance cost without adding capability. |
| UI-D024 | Pricing highlights changed cells and marks every property-type tab containing unsaved edits until a successful save. | Operators need to see both the precise changed value and unsaved work hidden behind another tab. |
| UI-D025 | Portfolio and Reviews keep drag ordering but show only an accessible grip handle, not a repeated `DRAG` label or persisted order number. | The row position already communicates sequence; repeated labels and often-stale numeric values add noise. |
| UI-D026 | Promotions shows one active-tab create action, uses tab-specific columns, and places row mutations in an accessible overflow menu. Generic shows Code, Discount, Min Spend, Limits, Validity, and Status; Personal shows Customers, Promotion, Discount, Limits, Validity, and Status; Automatic shows Promotion, Trigger, Discount, Requirements, Validity, and Status. | Each table exposes only the fields an operator can act on for that promotion kind. The payload has configured limits but no redemption count, so labeling the column as Uses would be misleading. |
| UI-D027 | Time Slots uses dark native time controls and places Apartment, Villa/Townhouse, and Commercial property-weight groups in one compact desktop row. | Visible picker icons and three-up composition improve contrast and reduce scrolling without changing configuration behavior. |
| UI-D028 | Portfolio and Reviews server pages read through a shared admin content service rather than fetching the application's own HTTP routes through `NEXT_PUBLIC_BASE_URL`. | Direct model-backed reads are independent of deployment host/port configuration and ensure the admin Portfolio includes hidden entries. |
| UI-D029 | Dashboard and Reports use tone-coded KPI values, a top-right percentage badge, and an explicit “vs … last month” baseline. Expense, pending, and cancelled movements invert favorable-color semantics. | The reference communicates direction at a glance while the explicit baseline prevents an unlabeled or ambiguous “No prior period” state. |
| UI-D030 | Revenue by Service and Booking Status use accessible SVG donut charts backed by the existing live aggregates. | This matches the reference without adding a charting dependency or introducing sample data. |
| UI-D031 | Dashboard Today’s Schedule contains only current-Dubai-business-day bookings; Recent Bookings adopts the reference fields and its View All action navigates to `/admin/bookings`. Expense Tracker is one compact panel with five-row client pagination while retaining all CRUD and audit behavior. | Titles and actions must describe their actual content, and dense operational tables should not turn into long unbounded pages. |

## Implementation discretion

- Engineering may choose the chart implementation that best reuses the completed analytics work and current dependencies.
- Responsive breakpoints and component composition may be adjusted only where needed to keep live content usable and accessible; the reference density remains the default.
- Page-scoped commits are allowed even though deployment is one release.

## Non-goals

- Rewriting working domain services for visual consistency.
- Introducing mock or seeded business data into production routes.
- Adding staff roles, Settings, or a new permission model.
- Making client-side navigation an authorization control.
