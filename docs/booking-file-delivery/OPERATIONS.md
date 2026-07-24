# Booking delivery review operations

The automatic completion worker accepts an expired service group only after it
locks the booking and confirms every current member is still under review with
an expired deadline. It then accepts every member in the same transaction.

If an operator sees a group awaiting replacement, replacements must be
submitted against the existing logical files. Do not alter persisted type,
revision, or status rows manually; doing so can violate the review boundary.

## ZIP delivery guardrails

The current PM2 production deployment runs one web process. ZIP admission is
therefore process-wide: at most five archive pipelines run at once and a sixth
request receives HTTP 429 before an S3 object is opened. Do not scale the web
application to multiple processes until this in-process admission guard is
replaced with a shared lease/semaphore.

The host has a 2 GiB memory budget for this service. Keep non-ZIP baseline RSS
at or below 1.2 GiB before enabling five concurrent downloads, retaining at
least 512 MiB of operational headroom. ZIPs stream one upstream object at a
time with 64 KiB stream high-water marks; they never buffer a complete object
or archive. The defaults cap an archive at 100 members, 20 GiB declared bytes,
and two hours of upstream time. Operators may lower these through
`DELIVERY_ZIP_MAX_MEMBERS`, `DELIVERY_ZIP_MAX_BYTES`, and
`DELIVERY_ZIP_MAX_UPSTREAM_MS`; the pipeline count cannot be raised above five.

Nginx disables response and request buffering for
`/api/files/download-zip`, suppresses selector-bearing access logs, and applies
125-minute upstream/downstream timeouts around the application's two-hour
deadline. Next.js incoming-request logging also ignores this route. These
controls let a slow customer apply backpressure to S3 instead of filling proxy
storage or memory.

Run the normal bounded proof with:

```sh
npm run verify:delivery-zip-memory
```

Before production enablement, run the full logical 2 GiB-per-download proof:

```sh
DELIVERY_ZIP_MEMORY_BYTES=2147483648 npm run verify:delivery-zip-memory
```

The harness reuses 64 KiB synthetic chunks, discards output, samples process
RSS, and proves five simultaneous archives stay within 320 MiB incremental RSS,
open no more than one S3 body each, release all permits, and do not allocate or
commit generated archives.
