import sharp from "sharp";

export const PROPERTY_SHARE_PREVIEW_WIDTH = 1200;
export const PROPERTY_SHARE_PREVIEW_HEIGHT = 630;
export const PROPERTY_SHARE_PREVIEW_QUALITY = 80;
// This accepts typical high-quality DSLR JPEGs while bounding one preview's
// in-memory compressed source before Sharp is allowed to decode it.
export const PROPERTY_SHARE_PREVIEW_MAX_SOURCE_BYTES = 32 * 1024 * 1024;
export const PROPERTY_SHARE_PREVIEW_MAX_OUTPUT_BYTES = 1 * 1024 * 1024;
export const PROPERTY_SHARE_PREVIEW_MAX_PIXELS = 24_000_000;
export const PROPERTY_SHARE_PREVIEW_TIMEOUT_MS = 8_000;

export class PropertySharePreviewUnavailableError extends Error {
  constructor() {
    super("Property share preview unavailable");
    this.name = "PropertySharePreviewUnavailableError";
  }
}

const unavailable = () => new PropertySharePreviewUnavailableError();

export function isBoundedPreviewSize(
  value,
  maxBytes = PROPERTY_SHARE_PREVIEW_MAX_SOURCE_BYTES,
) {
  const size = Number(value);
  return Number.isSafeInteger(size) && size > 0 && size <= maxBytes;
}

function cleanupBody(body, reader = null) {
  if (reader?.cancel) {
    // A locked Web stream must be cancelled through its reader. Deliberately
    // absorb cancellation failures: the caller is already failing closed.
    void Promise.resolve(reader.cancel()).catch(() => {});
    return;
  }
  if (typeof body?.destroy === "function") {
    body.destroy();
    return;
  }
  if (typeof body?.cancel === "function") {
    void Promise.resolve(body.cancel()).catch(() => {});
  }
}

async function* chunksFrom(body, { setReader } = {}) {
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    setReader?.(reader);
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
      setReader?.(null);
    }
    return;
  }
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    yield* body;
    return;
  }
  if (body instanceof Uint8Array) {
    yield body;
    return;
  }
  throw unavailable();
}

export async function readBoundedPreviewSource(
  body,
  { maxBytes = PROPERTY_SHARE_PREVIEW_MAX_SOURCE_BYTES, signal } = {},
) {
  const chunks = [];
  let total = 0;
  let reader = null;
  const abort = () => cleanupBody(body, reader);
  if (signal?.aborted) {
    cleanupBody(body);
    throw unavailable();
  }
  signal?.addEventListener("abort", abort, { once: true });
  try {
    for await (const chunk of chunksFrom(body, {
      setReader: (value) => {
        reader = value;
      },
    })) {
      if (signal?.aborted) throw unavailable();
      if (!Buffer.isBuffer(chunk) && !(chunk instanceof Uint8Array)) {
        throw unavailable();
      }
      const chunkBytes = chunk.byteLength;
      if (!Number.isSafeInteger(chunkBytes) || chunkBytes <= 0) {
        throw unavailable();
      }
      if (chunkBytes > maxBytes - total) throw unavailable();
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += chunkBytes;
      chunks.push(buffer);
    }
    if (signal?.aborted) throw unavailable();
  } catch (error) {
    cleanupBody(body, reader);
    if (error instanceof PropertySharePreviewUnavailableError) throw error;
    throw unavailable();
  } finally {
    signal?.removeEventListener("abort", abort);
  }
  if (!total) throw unavailable();
  return Buffer.concat(chunks, total);
}

export async function createPropertySharePreview(
  source,
  {
    maxPixels = PROPERTY_SHARE_PREVIEW_MAX_PIXELS,
    maxOutputBytes = PROPERTY_SHARE_PREVIEW_MAX_OUTPUT_BYTES,
    timeoutMs = PROPERTY_SHARE_PREVIEW_TIMEOUT_MS,
    signal,
  } = {},
) {
  let processor;
  let outputPromise;
  const abort = () => {
    if (typeof processor?.destroy === "function") processor.destroy();
    // `destroy()` causes Sharp's pending output promise to reject. Consume it
    // here as well so a client abort cannot surface as an unhandled rejection.
    void outputPromise?.catch(() => {});
  };
  if (signal?.aborted) throw unavailable();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    processor = sharp(source, {
      failOn: "error",
      limitInputPixels: maxPixels,
      sequentialRead: true,
    });
    outputPromise = processor
      .rotate()
      .resize(PROPERTY_SHARE_PREVIEW_WIDTH, PROPERTY_SHARE_PREVIEW_HEIGHT, {
        fit: "cover",
        position: "attention",
      })
      .jpeg({ quality: PROPERTY_SHARE_PREVIEW_QUALITY, mozjpeg: true })
      .timeout({ seconds: Math.max(1, Math.ceil(timeoutMs / 1000)) })
      .toBuffer();
    const output = await outputPromise;
    if (!isBoundedPreviewSize(output.length, maxOutputBytes))
      throw unavailable();
    return output;
  } catch (error) {
    if (error instanceof PropertySharePreviewUnavailableError) throw error;
    throw unavailable();
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

export async function withPreviewDeadline(
  operation,
  { timeoutMs = PROPERTY_SHARE_PREVIEW_TIMEOUT_MS, controller } = {},
) {
  const abortController = controller || new AbortController();
  let timeout;
  try {
    return await Promise.race([
      operation(abortController.signal),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          abortController.abort();
          reject(unavailable());
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof PropertySharePreviewUnavailableError) throw error;
    throw unavailable();
  } finally {
    clearTimeout(timeout);
  }
}
