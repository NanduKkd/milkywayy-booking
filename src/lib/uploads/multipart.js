export const MAX_BOOKING_UPLOAD_BYTES = 2_147_483_648;

const wait = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        reject(new DOMException("Upload cancelled", "AbortError"));
      },
      { once: true },
    );
  });

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Upload request failed");
  return data;
};

const signParts = async (sessionId, partNumbers, signal) =>
  readJson(
    await fetch(`/api/admin/booking-uploads/${sessionId}/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partNumbers }),
      signal,
    }),
  );

const putPart = ({ url, blob, signal, onProgress }) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    request.open("PUT", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    request.onload = () => {
      signal?.removeEventListener("abort", abort);
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Part upload failed with status ${request.status}`));
        return;
      }
      const etag = request.getResponseHeader("ETag");
      if (!etag) {
        reject(new Error("S3 did not expose the uploaded part ETag"));
        return;
      }
      onProgress(blob.size);
      resolve(etag);
    };
    request.onerror = () => reject(new Error("Part upload failed"));
    request.onabort = () =>
      reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", abort, { once: true });
    request.send(blob);
  });

export async function uploadBookingFile({
  bookingId,
  replacementFileId,
  deliverableType,
  file,
  signal,
  onSession,
  onState,
}) {
  if (!file || file.size <= 0 || file.size > MAX_BOOKING_UPLOAD_BYTES) {
    throw new Error(
      `Files must be between 1 byte and ${MAX_BOOKING_UPLOAD_BYTES} bytes`,
    );
  }

  let sessionId = null;
  let completionStarted = false;
  try {
    onState({ status: "Preparing", progress: 0 });
    const initiated = await readJson(
      await fetch("/api/admin/booking-uploads/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          replacementFileId: replacementFileId || null,
          deliverableType,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
        signal,
      }),
    );
    sessionId = initiated.sessionId;
    onSession?.(sessionId);

    const loadedByPart = new Map();
    const completedParts = [];
    const updateProgress = (partNumber, loaded) => {
      loadedByPart.set(partNumber, loaded);
      const uploaded = [...loadedByPart.values()].reduce(
        (total, value) => total + value,
        0,
      );
      onState({
        status: "Uploading",
        progress: Math.min(99, Math.round((uploaded / file.size) * 100)),
      });
    };

    for (let start = 1; start <= initiated.partCount; start += 3) {
      const partNumbers = Array.from(
        { length: Math.min(3, initiated.partCount - start + 1) },
        (_, index) => start + index,
      );
      const signed = await signParts(sessionId, partNumbers, signal);
      const initialUrls = new Map(
        signed.parts.map((part) => [part.partNumber, part.url]),
      );

      const batch = await Promise.all(
        partNumbers.map(async (partNumber) => {
          const begin = (partNumber - 1) * initiated.partSize;
          const blob = file.slice(
            begin,
            Math.min(begin + initiated.partSize, file.size),
          );
          let url = initialUrls.get(partNumber);
          for (let attempt = 1; attempt <= 4; attempt += 1) {
            try {
              const etag = await putPart({
                url,
                blob,
                signal,
                onProgress: (loaded) => updateProgress(partNumber, loaded),
              });
              return { partNumber, etag };
            } catch (error) {
              if (error.name === "AbortError" || attempt === 4) throw error;
              loadedByPart.set(partNumber, 0);
              onState({ status: "Retrying", progress: null });
              await wait(500 * 2 ** (attempt - 1), signal);
              const resigned = await signParts(sessionId, [partNumber], signal);
              url = resigned.parts[0].url;
            }
          }
          throw new Error("Part upload failed");
        }),
      );
      completedParts.push(...batch);
    }

    onState({ status: "Completing", progress: 100 });
    completionStarted = true;
    const result = await readJson(
      await fetch(`/api/admin/booking-uploads/${sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts: completedParts }),
        signal,
      }),
    );
    onState({ status: "Complete", progress: 100 });
    onSession?.(null);
    return result;
  } catch (error) {
    if (
      sessionId &&
      (error.name === "AbortError" || completionStarted === false)
    ) {
      await fetch(`/api/admin/booking-uploads/${sessionId}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    onSession?.(null);
    onState({
      status: error.name === "AbortError" ? "Cancelled" : "Failed",
      progress: null,
      error: error.message,
    });
    throw error;
  }
}
