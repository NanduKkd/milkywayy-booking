# Issue 80 proof

All proof uses synthetic property, service, filename, link, and identifier data.
No customer dashboard or production delivery was opened for capture.

## Responsive Files UI

| Viewport | Artifact | Verified behavior |
| --- | --- | --- |
| 1440 × 900 | [desktop-expanded-1440x900.jpg](./desktop-expanded-1440x900.jpg) | Photography is expanded with its two individual Download actions; Long Form Video remains collapsed; the service summary, revision action, and Download ZIP remain visible. The document client width and scroll width were both 1440 CSS pixels. |
| 390 × 844 browser override | [narrow-collapsed-390x844.jpg](./narrow-collapsed-390x844.jpg) | All non-empty service groups start collapsed while their summaries and group actions remain visible. The measured document client width and scroll width were both 375 CSS pixels after scrollbar allocation inside the 390-pixel override. |

Both captures use native button disclosure controls with `aria-expanded` and
`aria-controls`. The desktop interaction expanded only the selected group. The
narrow initial state rendered no individual file cards and retained one ZIP
action. Browser console inspection reported no warning or error messages.

## Focused component proof

`FileList.test.jsx` covers default collapse, isolated expand/collapse behavior,
accessible disclosure attributes, retained group actions, accepted one-file
groups, direct and copy-link actions after expansion, replacement-pending
behavior, and automatic expansion plus scrolling for a highlighted deep-linked
file.
