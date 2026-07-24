import { projectDeliveryServiceGroups } from "@/lib/services/deliveryServiceGroups";

const file = (overrides = {}) => ({
  id: 1,
  type: "Photography",
  label: "Photography",
  status: "UNDER_REVIEW",
  revisionCount: 1,
  reviewDeadlineAt: "2099-01-02T20:00:00.000Z",
  currentVersion: { id: 10 },
  ...overrides,
});

describe("delivery service group projection", () => {
  it("uses booking-local exact types and preserves legacy Videography", () => {
    const groups = projectDeliveryServiceGroups([
      file({ id: 1, type: "Photography" }),
      file({ id: 2, type: "Photography", revisionCount: 1 }),
      file({ id: 3, type: "Videography", label: "Videography" }),
      file({ id: 4, type: "Photography", status: "CHANGES_REQUESTED" }),
    ]);

    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "Photography",
          memberCount: 3,
          status: "CHANGES_REQUESTED",
          pendingReplacementCount: 1,
          files: [
            expect.objectContaining({ id: 1 }),
            expect.objectContaining({ id: 2 }),
          ],
        }),
        expect.objectContaining({
          type: "Videography",
          memberCount: 1,
          status: "UNDER_REVIEW",
        }),
      ]),
    );
  });
});
