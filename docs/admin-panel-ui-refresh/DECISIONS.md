# Admin panel UI refresh decisions

- Last updated: 2026-06-30

## Accepted decisions

| ID | Decision | Rationale |
|---|---|---|
| UI-D001 | `adminPrototype.jsx` is a visual and interaction reference, not production source code. | It contains hard-coded data, decorative controls, in-memory navigation, and missing runtime dependencies. |
| UI-D002 | Existing operational behavior takes precedence over prototype simplification. | Bookings, pricing, scheduling, invoices, portfolio, and reviews already contain production functionality absent from the mockup. |
| UI-D003 | Existing Next.js routes remain authoritative. | URLs, server boundaries, permission checks, loading behavior, and direct navigation must remain reliable. |
| UI-D004 | Login uses an unauthenticated layout outside the admin shell. | Anonymous users must not see authenticated navigation or logout controls. |
| UI-D005 | Dashboard values come only from the analytics service. | This prevents duplicated formulas and disagreement with Reports. |
| UI-D006 | Time Slots and Pricing redesigns are deferred. | Product design for those pages is not approved; behavior may only change where another accepted feature requires a shared backend fix. |
| UI-D007 | All in-scope pages receive responsive and accessibility treatment. | The prototype's permanent sidebar and wide tables are not sufficient mobile behavior. |

## Open implementation choices

- Select the chart library after bundle size, accessibility, server rendering,
  and testability are reviewed. `recharts` is referenced by the prototype but is
  not currently installed and is not automatically selected by this decision.
- Decide whether invoice search is debounced server search or explicit-submit
  search after representative invoice volume is measured.

## Non-goals

- Rewriting working domain services for visual consistency.
- Introducing mock or seeded business data into production routes.
- Making client-side navigation visibility an authorization control.
