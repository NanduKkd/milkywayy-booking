# Review load failure is presented as an empty testimonial set

- **Route:** `/admin/reviews`
- **Severity:** High
- **Status:** `DONE`
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

## Resolution

The reviews page now renders a dedicated unavailable state when its initial API request fails. It does not mount the review management list in that state, so unknown totals are no longer displayed as zero and the Featured/Standard empty-state prompts are suppressed. A `Try again` link reloads `/admin/reviews`. A successful response containing an empty array still renders the genuine zero totals and both empty review groups.

## Resolution evidence

- Updated `src/app/admin/reviews/page.jsx` to keep failed review data distinct from a successfully loaded empty collection.
- Expanded `src/app/admin/reviews/__tests__/page.test.jsx` to assert that a failed request shows the API error and retry link while hiding totals and both empty-list prompts, and that a successful empty response retains the genuine empty state.
- Focused Jest verification of `src/app/admin/reviews/__tests__/page.test.jsx` and `src/app/admin/reviews/__tests__/ReviewList.test.jsx` with `--runInBand` passed on July 12, 2026: 2 suites, 8 tests.
- Biome checking of `src/app/admin/reviews/page.jsx` and `src/app/admin/reviews/__tests__/page.test.jsx` passed on July 12, 2026 after formatting the updated test.
