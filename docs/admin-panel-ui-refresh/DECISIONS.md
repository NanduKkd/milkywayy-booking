# Admin panel UI refresh decisions

- Last updated: 2026-07-03

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| UI-D001 | `adminPrototype.jsx` is visual inspiration, not production source or a pixel specification. | Accessibility, live data, existing workflows, and practical layout constraints may require different markup and spacing. |
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

## Implementation discretion

- Engineering may choose the chart implementation that best reuses the completed analytics work and current dependencies.
- Exact spacing, responsive breakpoints, and component composition may be adjusted to keep existing content usable.
- Page-scoped commits are allowed even though deployment is one release.

## Non-goals

- Rewriting working domain services for visual consistency.
- Introducing mock or seeded business data into production routes.
- Adding staff roles, Settings, or a new permission model.
- Making client-side navigation an authorization control.
