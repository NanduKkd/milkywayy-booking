# Issue #62 promotion and checkout proof

Sanitized responsive evidence for token-scoped handoff promotion previews,
wallet-credit separation, OTP verification, and the checkout redirect boundary.
The temporary local fixture rendered the production
`BookingHandoffPageClient` and `SharedBookingForm`, intercepted only synthetic
handoff requests in the browser, and was removed after capture.

## Responsive pricing evidence

| Customer path | State | Viewport | Document client/scroll width | Horizontal overflow | Screenshot |
| --- | --- | ---: | ---: | --- | --- |
| Existing | Personal benefit, wallet credit, superseded-code feedback | 390 x 844 | 390 / 390 | No | `handoff-existing-mobile-390x844.png` |
| Existing | Personal benefit, wallet credit, superseded-code feedback | 768 x 1024 | 753 / 753 | No | `handoff-existing-tablet-768x1024.png` |
| Existing | Personal benefit, wallet credit, superseded-code feedback | 1440 x 900 | 1425 / 1425 | No | `handoff-existing-desktop-1440x900.png` |
| New | OTP sent; customer fields locked | 390 x 844 | 375 / 375 | No | `handoff-new-customer-otp-mobile-390x844.png` |
| New | OTP verified; generic code applied with wallet credit separate | 390 x 844 | 375 / 375 | No | `handoff-new-customer-verified-mobile-390x844.png` |

The existing-customer captures show subtotal AED 550, a personal benefit of AED
120, payable total AED 430, wallet credit AED 27.5, and superseded-code
feedback. The verified new-customer capture shows a generic code benefit of AED
100, payable total AED 450, wallet credit AED 27.5, and applied-code feedback.
Automated coverage records automatic-benefit selection and the remaining code
states.

## Checkout transition evidence

| Customer path | Viewport | Payable amount | Reused transaction | Promotion | Screenshot |
| --- | ---: | ---: | ---: | --- | --- |
| Existing | 1440 x 900 | AED 430 | #6201 | Synthetic Personal Benefit | `stripe-transition-existing-desktop-1440x900.png` |
| OTP-verified new | 390 x 844 | AED 450 | #6202 | Synthetic Welcome Code | `stripe-transition-new-customer-mobile-390x844.png` |

Both transitions were initiated by the production form's continue action. The
local destination represents the Stripe redirect boundary only; it did not
create a Stripe session. Browser console inspection reported no errors.

All names, phone numbers, email addresses, tokens, OTPs, transaction IDs,
promotions, properties, and payment destinations in this directory are
synthetic. No real customer or secret data was used or published.
