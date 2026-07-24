import { PassThrough, Readable, Transform } from "node:stream";
import archiver from "archiver";
import {
  isBookingDeliverableKeyForBooking,
  sanitizeFilename,
} from "@/lib/storage/s3";

export const DELIVERY_ZIP_MAX_PIPELINES = 5;
export const DELIVERY_ZIP_MAX_MEMBERS = 100;
export const DELIVERY_ZIP_MAX_BYTES = 20 * 1024 * 1024 * 1024;
export const DELIVERY_ZIP_MAX_UPSTREAM_MS = 2 * 60 * 60 * 1000;
export const DELIVERY_ZIP_STREAM_HIGH_WATER_MARK = 64 * 1024;

const state = globalThis.__milkywayyDeliveryZipState || {
  activePipelines: 0,
};
globalThis.__milkywayyDeliveryZipState = state;

const asPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getDeliveryZipLimits = () => ({
  maxPipelines: Math.min(
    DELIVERY_ZIP_MAX_PIPELINES,
    asPositiveInteger(
      process.env.DELIVERY_ZIP_MAX_PIPELINES,
      DELIVERY_ZIP_MAX_PIPELINES,
    ),
  ),
  maxMembers: asPositiveInteger(
    process.env.DELIVERY_ZIP_MAX_MEMBERS,
    DELIVERY_ZIP_MAX_MEMBERS,
  ),
  maxBytes: asPositiveInteger(
    process.env.DELIVERY_ZIP_MAX_BYTES,
    DELIVERY_ZIP_MAX_BYTES,
  ),
  maxUpstreamMs: asPositiveInteger(
    process.env.DELIVERY_ZIP_MAX_UPSTREAM_MS,
    DELIVERY_ZIP_MAX_UPSTREAM_MS,
  ),
});

export const tryAcquireDeliveryZipPipeline = () => {
  const { maxPipelines } = getDeliveryZipLimits();
  if (state.activePipelines >= maxPipelines) return null;
  state.activePipelines += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.activePipelines = Math.max(0, state.activePipelines - 1);
  };
};

export const getActiveDeliveryZipPipelines = () => state.activePipelines;

export const resetDeliveryZipPipelinesForTests = () => {
  if (process.env.NODE_ENV === "test") state.activePipelines = 0;
};

const truncateUtf8 = (value, maxBytes) => {
  let result = "";
  let bytes = 0;
  for (const character of String(value || "")) {
    const characterBytes = Buffer.byteLength(character);
    if (bytes + characterBytes > maxBytes) break;
    result += character;
    bytes += characterBytes;
  }
  return result;
};

const safeArchiveComponent = (value, fallback) => {
  let result = sanitizeFilename(value, fallback)
    .normalize("NFC")
    .replace(/[. ]+$/gu, "")
    .trim();
  if (!result || result === "." || result === "..") result = fallback;
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(result)) {
    result = `_${result}`;
  }
  return result;
};

const collisionKey = (value) => value.normalize("NFKC").toLocaleLowerCase("en");

export const safeZipMemberName = (value, usedNames) => {
  const maxBytes = 180;
  const source = safeArchiveComponent(value, "deliverable");
  const dot = source.lastIndexOf(".");
  const rawStem = dot > 0 ? source.slice(0, dot) : source;
  const extension =
    dot > 0 ? truncateUtf8(source.slice(dot), Math.min(32, maxBytes - 1)) : "";
  let suffix = "";
  let index = 2;

  while (true) {
    const stemBudget =
      maxBytes - Buffer.byteLength(extension) - Buffer.byteLength(suffix);
    const stem =
      truncateUtf8(rawStem, Math.max(1, stemBudget)) || "deliverable";
    const candidate = `${stem}${suffix}${extension}`;
    const key = collisionKey(candidate);
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return candidate;
    }
    suffix = ` (${index})`;
    index += 1;
  }
};

export const safeDeliveryZipName = (type) => {
  const stem = safeArchiveComponent(type, "delivery").replace(/\.zip$/iu, "");
  return `${truncateUtf8(stem, 120)}-deliverables.zip`;
};

const toNodeReadable = (body) => {
  if (body instanceof Readable) return body;
  if (body && typeof body.getReader === "function") {
    return Readable.fromWeb(body);
  }
  throw new Error("S3 body did not provide a readable stream");
};

const manifestText = (links) =>
  [
    "External delivery links (not downloaded by Milkywayy)",
    "",
    ...links.map(({ name, url }) => `${name}: ${url}`),
    "",
  ].join("\n");

const positiveSize = (value, maxBytes) => {
  try {
    const size = BigInt(value);
    if (size <= 0n || size > BigInt(maxBytes)) return null;
    return size;
  } catch {
    return null;
  }
};

export const prepareDeliveryZipMembers = (
  files,
  { bookingId, limits = getDeliveryZipLimits() } = {},
) => {
  if (
    !Array.isArray(files) ||
    files.length < 2 ||
    files.length > limits.maxMembers
  ) {
    return null;
  }

  const names = new Set();
  let declaredBytes = 0n;
  const members = [];
  const links = [];

  for (const file of files) {
    const version = file?.currentVersion;
    if (!version) return null;
    const name = safeZipMemberName(
      version.originalFilename || file.label || file.type,
      names,
    );

    if (file.deliveryMode === "copy_link") {
      let url;
      try {
        const parsed = new URL(version.url);
        if (parsed.protocol !== "https:") return null;
        url = parsed.href;
      } catch {
        return null;
      }
      if (Buffer.byteLength(url) > 4096) return null;
      links.push({ name, url });
      continue;
    }

    if (!["download", "direct_download"].includes(file.deliveryMode)) {
      return null;
    }
    if (!isBookingDeliverableKeyForBooking(file.objectKey, bookingId)) {
      return null;
    }
    const sizeBytes = positiveSize(version.sizeBytes, limits.maxBytes);
    if (sizeBytes === null) return null;
    declaredBytes += sizeBytes;
    if (declaredBytes > BigInt(limits.maxBytes)) return null;
    members.push({
      name,
      key: file.objectKey,
      sizeBytes: Number(sizeBytes),
    });
  }

  if (links.length) {
    const name = safeZipMemberName("EXTERNAL_LINKS.txt", names);
    const text = manifestText(links);
    const sizeBytes = Buffer.byteLength(text);
    declaredBytes += BigInt(sizeBytes);
    if (declaredBytes > BigInt(limits.maxBytes)) return null;
    members.push({ name, text, sizeBytes });
  }

  return {
    members,
    declaredBytes: Number(declaredBytes),
    sourceMemberCount: files.length,
  };
};

export const verifyDeliveryZipObjects = async ({
  members,
  headObject,
  signal,
}) => {
  for (const member of members) {
    if (!member.key) continue;
    if (signal?.aborted) {
      throw signal.reason || new Error("Delivery ZIP request aborted");
    }
    const result = await headObject(member.key, { abortSignal: signal });
    const contentLength = positiveSize(
      result?.ContentLength,
      DELIVERY_ZIP_MAX_BYTES,
    );
    if (contentLength === null || contentLength !== BigInt(member.sizeBytes)) {
      return false;
    }
  }
  return true;
};

const abortError = (message) => {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
};

export const createDeliveryZipStream = ({
  members,
  declaredBytes,
  sourceMemberCount = members.length,
  getObject,
  signal,
  onComplete = () => {},
}) => {
  const limits = getDeliveryZipLimits();
  const output = new PassThrough({
    highWaterMark: DELIVERY_ZIP_STREAM_HIGH_WATER_MARK,
  });
  const archive = archiver("zip", {
    forceZip64: true,
    highWaterMark: DELIVERY_ZIP_STREAM_HIGH_WATER_MARK,
    store: true,
  });
  const controller = new AbortController();
  const startedAt = Date.now();
  let currentBody = null;
  let currentCounted = null;
  let settled = false;
  let streamedBytes = 0;

  const finish = (outcome) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onRequestAbort);
    try {
      onComplete({
        outcome,
        memberCount: sourceMemberCount,
        declaredBytes,
        streamedBytes,
        durationMs: Date.now() - startedAt,
      });
    } catch {
      // Metrics must never change delivery behavior.
    }
  };

  const stop = (outcome, error = abortError("Delivery ZIP stream stopped")) => {
    if (settled) return;
    if (!controller.signal.aborted) controller.abort(error);
    const destroyError = outcome === "aborted" ? undefined : error;
    currentBody?.on("error", () => {});
    currentCounted?.on("error", () => {});
    currentBody?.destroy(destroyError);
    currentCounted?.destroy(destroyError);
    archive.abort();
    finish(outcome);
    if (!output.destroyed) {
      output.destroy(outcome === "aborted" ? undefined : error);
    }
  };

  const onRequestAbort = () =>
    stop("aborted", signal?.reason || abortError("Client disconnected"));
  const timeout = setTimeout(
    () => stop("timed_out", abortError("Delivery ZIP deadline exceeded")),
    limits.maxUpstreamMs,
  );
  timeout.unref?.();

  signal?.addEventListener("abort", onRequestAbort, { once: true });
  archive.on("warning", (error) => stop("failed", error));
  archive.on("error", (error) => stop("failed", error));
  output.on("close", () => {
    if (!settled) stop("aborted", abortError("Downstream closed"));
  });
  output.on("end", () => finish("completed"));
  archive.pipe(output);

  const appendBody = async (member) => {
    const result = await getObject({
      key: member.key,
      abortSignal: controller.signal,
    });
    if (
      result?.ContentLength !== undefined &&
      BigInt(result.ContentLength) !== BigInt(member.sizeBytes)
    ) {
      throw new Error("Delivery ZIP object size changed after preflight");
    }

    currentBody = toNodeReadable(result?.Body);
    let memberBytes = 0;
    currentCounted = new Transform({
      highWaterMark: DELIVERY_ZIP_STREAM_HIGH_WATER_MARK,
      transform(chunk, _encoding, callback) {
        const bytes = Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk);
        memberBytes += bytes;
        streamedBytes += bytes;
        if (memberBytes > member.sizeBytes || streamedBytes > declaredBytes) {
          callback(new Error("Delivery ZIP stream exceeded its declared size"));
          return;
        }
        callback(null, chunk);
      },
    });

    const body = currentBody;
    const counted = currentCounted;
    const ended = new Promise((resolve, reject) => {
      const cleanup = () => {
        counted.off("end", onEnd);
        counted.off("error", onError);
        body.off("error", onError);
      };
      const onEnd = () => {
        cleanup();
        resolve();
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      counted.once("end", onEnd);
      counted.once("error", onError);
      body.once("error", onError);
    });

    body.pipe(counted);
    archive.append(counted, { name: member.name, store: true });
    await ended;
    if (memberBytes !== member.sizeBytes) {
      throw new Error("Delivery ZIP stream ended before its declared size");
    }
    currentBody = null;
    currentCounted = null;
  };

  void (async () => {
    try {
      if (signal?.aborted) throw signal.reason || abortError("Request aborted");
      for (const member of members) {
        if (controller.signal.aborted) throw controller.signal.reason;
        if (member.text !== undefined) {
          streamedBytes += member.sizeBytes;
          if (streamedBytes > declaredBytes) {
            throw new Error("Delivery ZIP stream limit exceeded");
          }
          archive.append(member.text, { name: member.name, store: true });
        } else {
          await appendBody(member);
        }
      }
      if (streamedBytes !== declaredBytes) {
        throw new Error("Delivery ZIP stream did not match its declared size");
      }
      await archive.finalize();
    } catch (error) {
      if (!settled) {
        stop(
          controller.signal.aborted ? "aborted" : "failed",
          error instanceof Error ? error : new Error("Delivery ZIP failed"),
        );
      }
    }
  })();

  return output;
};
