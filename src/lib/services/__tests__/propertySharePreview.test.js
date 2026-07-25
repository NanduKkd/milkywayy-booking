/** @jest-environment node */

import { Readable } from "node:stream";
import sharp from "sharp";
import {
  createPropertySharePreview,
  PROPERTY_SHARE_PREVIEW_HEIGHT,
  PROPERTY_SHARE_PREVIEW_WIDTH,
  PropertySharePreviewUnavailableError,
  readBoundedPreviewSource,
  withPreviewDeadline,
} from "../propertySharePreview";

async function syntheticPng(width = 80, height = 40) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 60, g: 90, b: 120 },
    },
  })
    .png()
    .toBuffer();
}

describe("property share preview processing", () => {
  it("creates a bounded 1200x630 JPEG from an in-memory owned image", async () => {
    const preview = await createPropertySharePreview(await syntheticPng());
    const metadata = await sharp(preview).metadata();

    expect(metadata).toEqual(
      expect.objectContaining({
        format: "jpeg",
        width: PROPERTY_SHARE_PREVIEW_WIDTH,
        height: PROPERTY_SHARE_PREVIEW_HEIGHT,
      }),
    );
  });

  it("rejects a chunked source when actual bytes exceed the cap and closes it", async () => {
    const body = Readable.from([Buffer.alloc(8), Buffer.alloc(8)]);
    const destroy = jest.spyOn(body, "destroy");

    await expect(
      readBoundedPreviewSource(body, { maxBytes: 12 }),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
    expect(destroy).toHaveBeenCalled();
  });

  it("rejects an oversized Web chunk before copying it and cancels its reader", async () => {
    const cancel = jest.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(13));
      },
      cancel,
    });

    await expect(
      readBoundedPreviewSource(body, { maxBytes: 12 }),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
    await Promise.resolve();
    expect(cancel).toHaveBeenCalled();
    expect(body.locked).toBe(false);
  });

  it("closes a pending source when the caller aborts", async () => {
    const controller = new AbortController();
    const body = new Readable({ read() {} });
    const destroy = jest.spyOn(body, "destroy");
    const pending = readBoundedPreviewSource(body, {
      maxBytes: 20,
      signal: controller.signal,
    });

    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(
      PropertySharePreviewUnavailableError,
    );
    expect(destroy).toHaveBeenCalled();
  });

  it("cancels the acquired Web reader and releases its lock on abort", async () => {
    const controller = new AbortController();
    const cancel = jest.fn();
    let signalReaderAcquired;
    const readerAcquired = new Promise((resolve) => {
      signalReaderAcquired = resolve;
    });
    const body = new ReadableStream({
      cancel,
    });
    const getReader = body.getReader.bind(body);
    jest.spyOn(body, "getReader").mockImplementation((...args) => {
      const reader = getReader(...args);
      signalReaderAcquired();
      return reader;
    });
    const pending = readBoundedPreviewSource(body, {
      maxBytes: 20,
      signal: controller.signal,
    });

    await readerAcquired;
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(
      PropertySharePreviewUnavailableError,
    );
    expect(cancel).toHaveBeenCalled();
    expect(body.locked).toBe(false);
  });

  it("fails closed and aborts work that exceeds the preview deadline", async () => {
    const controller = new AbortController();

    await expect(
      withPreviewDeadline(() => new Promise(() => {}), {
        timeoutMs: 1,
        controller,
      }),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
    expect(controller.signal.aborted).toBe(true);
  });

  it("fails closed for malformed input, decoded-pixel limits, and oversized output", async () => {
    await expect(
      createPropertySharePreview(Buffer.from("not an image")),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
    await expect(
      createPropertySharePreview(await syntheticPng(20, 20), {
        maxPixels: 100,
      }),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
    await expect(
      createPropertySharePreview(await syntheticPng(), { maxOutputBytes: 10 }),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
  });
});
