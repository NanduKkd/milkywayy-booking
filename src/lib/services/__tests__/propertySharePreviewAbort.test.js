/** @jest-environment node */

jest.mock("sharp", () => jest.fn());

import sharp from "sharp";
import {
  createPropertySharePreview,
  PropertySharePreviewUnavailableError,
  readBoundedPreviewSource,
  withPreviewDeadline,
} from "../propertySharePreview";

function pendingProcessor() {
  let rejectOutput;
  const output = new Promise((_, reject) => {
    rejectOutput = reject;
  });
  const processor = {
    rotate: jest.fn(() => processor),
    resize: jest.fn(() => processor),
    jpeg: jest.fn(() => processor),
    timeout: jest.fn(() => processor),
    toBuffer: jest.fn(() => output),
    destroy: jest.fn(() => rejectOutput(new Error("processor destroyed"))),
  };
  return processor;
}

describe("property share preview abort handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("destroys an active Sharp processor when the outer deadline aborts", async () => {
    const processor = pendingProcessor();
    sharp.mockReturnValue(processor);
    const source = await readBoundedPreviewSource(new Uint8Array([1, 2, 3]));

    await expect(
      withPreviewDeadline(
        (signal) => createPropertySharePreview(source, { signal }),
        { timeoutMs: 1 },
      ),
    ).rejects.toBeInstanceOf(PropertySharePreviewUnavailableError);
    expect(processor.destroy).toHaveBeenCalledTimes(1);
  });
});
