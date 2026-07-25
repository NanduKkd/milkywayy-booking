import {
  projectAdminDeliveryServiceGroups,
  projectDeliveryServiceGroups,
} from "@/lib/services/deliveryServiceGroups";

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

  it("keeps all active admin members while selecting one deterministic group note", () => {
    const groups = projectAdminDeliveryServiceGroups([
      file({
        id: 1,
        type: "Photography",
        status: "PRIVATE",
        fileRevisions: [],
      }),
      file({
        id: 2,
        type: "Photography",
        status: "CHANGES_REQUESTED",
        fileRevisions: [
          {
            id: 2,
            note: "Earlier note",
            requestedAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
      file({
        id: 3,
        type: "Photography",
        status: "CHANGES_REQUESTED",
        fileRevisions: [
          {
            id: 3,
            note: "Latest matching note",
            requestedAt: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
      file({ id: 4, type: "Videography", label: "Videography" }),
      file({ id: 5, type: "Photography", deletedAt: "2026-07-01" }),
    ]);

    expect(groups).toEqual([
      expect.objectContaining({
        type: "Photography",
        status: "CHANGES_REQUESTED",
        memberCount: 3,
        requestedNote: "Latest matching note",
        files: [
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
          expect.objectContaining({ id: 3 }),
        ],
      }),
      expect.objectContaining({
        type: "Videography",
        memberCount: 1,
      }),
    ]);

    expect(projectDeliveryServiceGroups(groups[0].files)).toEqual([
      expect.objectContaining({ memberCount: 2, files: [] }),
    ]);
  });
});
