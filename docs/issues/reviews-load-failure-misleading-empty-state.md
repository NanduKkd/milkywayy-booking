# Review load failure is presented as an empty testimonial set

- **Route:** `/admin/reviews`
- **Severity:** High
- **Status:** `NOT_STARTED`
- **Owner:** Engineering
- **Project-owner intervention:** No

## Steps to reproduce

1. Sign in to the admin portal as a super administrator.
2. Open `/admin/reviews` in the default desktop browser view (1280 × 720).
3. Wait for the review tables to finish loading.

## Expected

When the live review request fails, the page should preserve that error state and avoid treating the testimonial set as empty. Totals and the Featured/Standard tables should show an unavailable/error state, with an actionable retry path where appropriate.

## Actual

The page displays `Unable to load every review` and `fetch failed`, but also renders all summary counts as `0` and shows `No featured reviews found` and `No standard reviews found`, each encouraging the administrator to create or feature a review. This makes a production-data load failure indistinguishable from a genuinely empty review set and risks duplicate replacement testimonials.

## Evidence

- Reproduced on July 11, 2026 at `http://localhost:3000/admin/reviews`.
- Browser viewport: 1280 × 720 pixels.
- The visible page error was `Unable to load every review` followed by `fetch failed`.
- At the same time, the page reported `Total reviews 0`, `Visible on site 0`, and `Ordering groups 0 featured`, then displayed empty states for both review groups.
- No retry control was visible in the error state.
- The `New Review` control safely opened the `Create New Review` dialog and was closed without submitting any business data.
