# Issue 80 proof

All proof uses synthetic property, service, filename, link, and identifier data.
No customer dashboard or production delivery was opened for capture.

## Responsive Files UI

| Viewport | Artifact | Verified behavior |
| --- | --- | --- |
| 1440 × 900 | [desktop-expanded-1440x900.jpg](./desktop-expanded-1440x900.jpg) | Multi-file Photography is expanded with the generic `Hide All Files` label and both individual Download actions. The one-file 360 Virtual Tour and Short Form Video groups render their file actions directly with no disclosure control. The document client width and scroll width were both 1425 CSS pixels after scrollbar allocation. |
| 390 × 844 browser override | [narrow-collapsed-390x844.jpg](./narrow-collapsed-390x844.jpg) | Multi-file Photography starts collapsed with the generic `Show All Files` label while its summary and group actions remain visible. The one-file 360 Virtual Tour file remains directly visible with no disclosure control. The measured document client width and scroll width were both 375 CSS pixels after scrollbar allocation inside the 390-pixel override. |

Multi-file groups use native button disclosure controls with `aria-expanded`,
`aria-controls`, and service-specific assistive text while the visible label
stays generic. The desktop interaction expanded only Photography. The narrow
initial state retained the ZIP action and rendered no Photography member cards.
Browser console inspection reported no warning or error messages.

## Focused component proof

`FileList.test.jsx` covers multi-file default collapse, generic visible labels,
isolated expand/collapse behavior, accessible disclosure attributes, retained
group actions, directly visible one-file groups without toggles, direct and
copy-link actions, replacement-pending behavior, and automatic expansion plus
scrolling for a highlighted deep-linked file.
