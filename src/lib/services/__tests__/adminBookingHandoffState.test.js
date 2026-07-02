import {
  buildAdminBookingHandoffMetadata,
  getAdminBookingHandoffBookingIds,
  getAdminBookingHandoffMetadata,
  isAdminBookingHandoffCheckoutAllowed,
  isAdminBookingHandoffExpired,
  isAdminBookingHandoffTransaction,
  mergeAdminBookingHandoffMetadata,
} from "../adminBookingHandoffState";

describe("adminBookingHandoffState helpers", () => {
  const baseMetadata = buildAdminBookingHandoffMetadata({
    version: "handoff-v1",
    customerMode: "new",
    requiresRegistration: true,
    registrationVerifiedAt: null,
    createdByUserId: 9,
    generatedAt: "2026-07-02T10:00:00.000Z",
    expiresAt: "2099-07-02T14:00:00.000Z",
  });

  it("builds and reads handoff metadata", () => {
    const transaction = {
      metadata: {
        bookingIds: [1, 2],
        adminBookingHandoff: baseMetadata,
      },
    };

    expect(getAdminBookingHandoffMetadata(transaction)).toEqual(baseMetadata);
    expect(isAdminBookingHandoffTransaction(transaction)).toBe(true);
    expect(getAdminBookingHandoffBookingIds(transaction)).toEqual([1, 2]);
  });

  it("updates handoff metadata while preserving unrelated transaction metadata", () => {
    const merged = mergeAdminBookingHandoffMetadata(
      {
        bookingIds: [8],
        marker: "keep-me",
        adminBookingHandoff: baseMetadata,
      },
      {
        ...baseMetadata,
        version: "handoff-v2",
        registrationVerifiedAt: "2026-07-02T11:00:00.000Z",
      },
    );

    expect(merged.marker).toBe("keep-me");
    expect(merged.bookingIds).toEqual([8]);
    expect(merged.adminBookingHandoff.version).toBe("handoff-v2");
    expect(merged.adminBookingHandoff.registrationVerifiedAt).toBe(
      "2026-07-02T11:00:00.000Z",
    );
  });

  it("evaluates expiry and checkout gating", () => {
    const activeTransaction = {
      metadata: {
        adminBookingHandoff: {
          ...baseMetadata,
          registrationVerifiedAt: "2026-07-02T11:00:00.000Z",
        },
      },
    };
    const blockedTransaction = {
      metadata: {
        adminBookingHandoff: {
          ...baseMetadata,
        },
      },
    };
    const expiredTransaction = {
      metadata: {
        adminBookingHandoff: {
          ...baseMetadata,
          expiresAt: "2026-07-02T09:59:00.000Z",
        },
      },
    };

    expect(
      isAdminBookingHandoffCheckoutAllowed(
        activeTransaction,
        new Date("2026-07-02T12:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isAdminBookingHandoffCheckoutAllowed(
        blockedTransaction,
        new Date("2026-07-02T12:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      isAdminBookingHandoffExpired(
        expiredTransaction,
        new Date("2026-07-02T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});
