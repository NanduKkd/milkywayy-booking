/** @jest-environment node */

import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  createDeliveryZipStream,
  getActiveDeliveryZipPipelines,
  resetDeliveryZipPipelinesForTests,
  tryAcquireDeliveryZipPipeline,
} from "../deliveryZip";

const chunkBytes = 64 * 1024;
const bytesPerArchive = Number(
  process.env.DELIVERY_ZIP_MEMORY_BYTES || 32 * 1024 * 1024,
);
const fullProof = bytesPerArchive >= 2 * 1024 * 1024 * 1024;

jest.setTimeout(fullProof ? 15 * 60 * 1000 : 60 * 1000);

const repeatedBody = (sizeBytes, onOpen, onClose) => {
  const reusableChunk = Buffer.alloc(chunkBytes, 0x5a);
  let remaining = sizeBytes;
  let closed = false;
  const body = new Readable({
    highWaterMark: chunkBytes,
    read() {
      while (remaining > 0) {
        const size = Math.min(remaining, reusableChunk.length);
        remaining -= size;
        if (!this.push(reusableChunk.subarray(0, size))) return;
      }
      this.push(null);
    },
  });
  onOpen();
  const close = () => {
    if (closed) return;
    closed = true;
    onClose();
  };
  body.once("end", close);
  body.once("close", close);
  return body;
};

const discardSlowly = () =>
  new Writable({
    highWaterMark: chunkBytes,
    write(_chunk, _encoding, callback) {
      setImmediate(callback);
    },
  });

describe("delivery ZIP five-stream memory proof", () => {
  beforeEach(() => {
    resetDeliveryZipPipelinesForTests();
  });

  it("keeps five logical archives bounded and one-body-per-archive", async () => {
    global.gc?.();
    const baselineRss = process.memoryUsage().rss;
    let peakRss = baselineRss;
    let globalActiveBodies = 0;
    let maximumGlobalBodies = 0;
    const perArchiveMaximum = Array(5).fill(0);
    const perArchiveActive = Array(5).fill(0);
    const releases = Array.from({ length: 5 }, () =>
      tryAcquireDeliveryZipPipeline(),
    );

    expect(releases.every(Boolean)).toBe(true);
    expect(tryAcquireDeliveryZipPipeline()).toBeNull();

    const sample = setInterval(() => {
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }, 25);
    sample.unref?.();

    const entryOneBytes = Math.floor(bytesPerArchive / 2);
    const entryTwoBytes = bytesPerArchive - entryOneBytes;
    const runs = Array.from({ length: 5 }, (_, archiveIndex) => {
      const getObject = async ({ key }) => {
        const sizeBytes = key.endsWith("/one") ? entryOneBytes : entryTwoBytes;
        return {
          ContentLength: sizeBytes,
          Body: repeatedBody(
            sizeBytes,
            () => {
              perArchiveActive[archiveIndex] += 1;
              globalActiveBodies += 1;
              perArchiveMaximum[archiveIndex] = Math.max(
                perArchiveMaximum[archiveIndex],
                perArchiveActive[archiveIndex],
              );
              maximumGlobalBodies = Math.max(
                maximumGlobalBodies,
                globalActiveBodies,
              );
            },
            () => {
              perArchiveActive[archiveIndex] -= 1;
              globalActiveBodies -= 1;
            },
          ),
        };
      };
      const zip = createDeliveryZipStream({
        members: [
          {
            key: `${archiveIndex}/one`,
            name: "one.bin",
            sizeBytes: entryOneBytes,
          },
          {
            key: `${archiveIndex}/two`,
            name: "two.bin",
            sizeBytes: entryTwoBytes,
          },
        ],
        declaredBytes: bytesPerArchive,
        sourceMemberCount: 2,
        getObject,
        onComplete: releases[archiveIndex],
      });
      return pipeline(zip, discardSlowly());
    });

    try {
      await Promise.all(runs);
    } finally {
      clearInterval(sample);
      releases.forEach((release) => {
        release?.();
      });
    }

    global.gc?.();
    const finalRss = process.memoryUsage().rss;
    const mebibyte = 1024 * 1024;
    console.info("delivery_zip_memory_proof", {
      bytesPerArchive,
      concurrentArchives: 5,
      peakDeltaMiB: Number(((peakRss - baselineRss) / mebibyte).toFixed(2)),
      finalDeltaMiB: Number(((finalRss - baselineRss) / mebibyte).toFixed(2)),
      maximumGlobalBodies,
    });
    expect(perArchiveMaximum).toEqual([1, 1, 1, 1, 1]);
    expect(maximumGlobalBodies).toBeLessThanOrEqual(5);
    expect(globalActiveBodies).toBe(0);
    expect(getActiveDeliveryZipPipelines()).toBe(0);
    expect((peakRss - baselineRss) / mebibyte).toBeLessThanOrEqual(320);
    expect((finalRss - baselineRss) / mebibyte).toBeLessThanOrEqual(128);
  });
});
