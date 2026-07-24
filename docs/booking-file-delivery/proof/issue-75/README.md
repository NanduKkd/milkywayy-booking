# Issue 75 proof

All proof uses synthetic booking, property, filename, object-link, and session
data. No customer archive was requested or generated.

## Responsive Files UI

| Viewport | Artifact | Verified behavior |
| --- | --- | --- |
| 1440 × 900 | [desktop-1440x900.jpg](./desktop-1440x900.jpg) | One ZIP action appears for the two-member Photography group; the one-member Long Form Video group has no ZIP action; individual Download and Copy Link controls remain. |
| 390 × 844 browser override | [narrow-390-viewport.jpg](./narrow-390-viewport.jpg) | The same group actions stack without horizontal overflow. The measured document client width and scroll width were both 375 CSS pixels after browser scrollbar allocation inside the 390-pixel override. |

The browser DOM contained one ZIP link, two individual download links, and one
copy-link button at both widths. Browser console inspection reported no warning
or error messages.

## Five-download memory proof

Command:

```sh
DELIVERY_ZIP_MEMORY_BYTES=2147483648 npm run verify:delivery-zip-memory
```

Result: one test passed while five concurrent logical 2 GiB archives streamed
through reused 64 KiB synthetic chunks. Peak incremental process RSS was
19.25 MiB, final incremental RSS was 19.34 MiB, and the maximum number of
simultaneously open synthetic S3 bodies was five—one per archive. No archive
was written to disk.
