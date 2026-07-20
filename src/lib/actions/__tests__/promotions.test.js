const mockAuth = jest.fn();
const mockFindByPk = jest.fn();
const mockRevalidatePath = jest.fn();
const mockListPromotions = jest.fn();
const mockCreatePromotion = jest.fn();
const mockUpdatePromotion = jest.fn();
const mockActivatePromotion = jest.fn();
const mockPausePromotion = jest.fn();
const mockDeactivatePromotion = jest.fn();
const mockSearchAssignableCustomers = jest.fn();
const mockAssignPromotionCustomer = jest.fn();
const mockUnassignPromotionCustomer = jest.fn();
let mockRelationsInitialized = false;

jest.mock("next/cache", () => ({
  revalidatePath: (...args) => mockRevalidatePath(...args),
}));

jest.mock("@/lib/db/relations", () => {
  mockRelationsInitialized = true;
  return {};
});

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findByPk: (...args) => mockFindByPk(...args),
    },
  },
}));

jest.mock("@/lib/services/promotionAdmin", () => ({
  activatePromotion: (...args) => mockActivatePromotion(...args),
  assignPromotionCustomer: (...args) => mockAssignPromotionCustomer(...args),
  createPromotion: (...args) => mockCreatePromotion(...args),
  deactivatePromotion: (...args) => mockDeactivatePromotion(...args),
  listPromotions: (...args) => mockListPromotions(...args),
  pausePromotion: (...args) => mockPausePromotion(...args),
  searchAssignableCustomers: (...args) =>
    mockSearchAssignableCustomers(...args),
  unassignPromotionCustomer: (...args) =>
    mockUnassignPromotionCustomer(...args),
  updatePromotion: (...args) => mockUpdatePromotion(...args),
}));

jest.unmock("../promotions");
jest.unmock("../utils");

const {
  activateAdminPromotion,
  assignAdminPromotionCustomer,
  createAdminPromotion,
  deactivateAdminPromotion,
  getPromotionsAdminData,
  pauseAdminPromotion,
  searchPromotionAssignableCustomers,
  unassignAdminPromotionCustomer,
  updateAdminPromotion,
} = require("../promotions");

const authenticatedDbActor = { id: "42", role: "SUPERADMIN" };
const expectedActor = { id: 42, role: "SUPERADMIN" };
const callerInput = {
  name: "Summer offer",
  role: "SUPERADMIN",
};

const authorizedCases = [
  {
    name: "lists promotions",
    action: getPromotionsAdminData,
    args: [],
    service: mockListPromotions,
    serviceResult: [{ id: 101, name: "Summer offer" }],
    expectedServiceArgs: [{ actorUser: expectedActor }],
    expectedData: {
      promotions: [{ id: 101, name: "Summer offer" }],
    },
    mutates: false,
  },
  {
    name: "creates a promotion",
    action: createAdminPromotion,
    args: [callerInput],
    service: mockCreatePromotion,
    serviceResult: { id: 102, name: "Summer offer" },
    expectedServiceArgs: [{ actorUser: expectedActor, input: callerInput }],
    expectedData: { id: 102, name: "Summer offer" },
    mutates: true,
  },
  {
    name: "updates a promotion",
    action: updateAdminPromotion,
    args: [102, callerInput],
    service: mockUpdatePromotion,
    serviceResult: { id: 102, name: "Updated offer" },
    expectedServiceArgs: [
      { actorUser: expectedActor, promotionId: 102, input: callerInput },
    ],
    expectedData: { id: 102, name: "Updated offer" },
    mutates: true,
  },
  {
    name: "activates a promotion",
    action: activateAdminPromotion,
    args: [102],
    service: mockActivatePromotion,
    serviceResult: { id: 102, status: "ACTIVE" },
    expectedServiceArgs: [{ actorUser: expectedActor, promotionId: 102 }],
    expectedData: { id: 102, status: "ACTIVE" },
    mutates: true,
  },
  {
    name: "pauses a promotion",
    action: pauseAdminPromotion,
    args: [102],
    service: mockPausePromotion,
    serviceResult: { id: 102, status: "PAUSED" },
    expectedServiceArgs: [{ actorUser: expectedActor, promotionId: 102 }],
    expectedData: { id: 102, status: "PAUSED" },
    mutates: true,
  },
  {
    name: "deactivates a promotion",
    action: deactivateAdminPromotion,
    args: [102],
    service: mockDeactivatePromotion,
    serviceResult: { id: 102, status: "DEACTIVATED" },
    expectedServiceArgs: [{ actorUser: expectedActor, promotionId: 102 }],
    expectedData: { id: 102, status: "DEACTIVATED" },
    mutates: true,
  },
  {
    name: "searches assignable customers",
    action: searchPromotionAssignableCustomers,
    args: ["alex"],
    service: mockSearchAssignableCustomers,
    serviceResult: [{ id: 501, displayName: "Alex Customer" }],
    expectedServiceArgs: [{ actorUser: expectedActor, query: "alex" }],
    expectedData: [{ id: 501, displayName: "Alex Customer" }],
    mutates: false,
  },
  {
    name: "assigns a customer",
    action: assignAdminPromotionCustomer,
    args: [102, 501],
    service: mockAssignPromotionCustomer,
    serviceResult: { id: 102, assignments: [{ userId: 501 }] },
    expectedServiceArgs: [
      { actorUser: expectedActor, promotionId: 102, userId: 501 },
    ],
    expectedData: { id: 102, assignments: [{ userId: 501 }] },
    mutates: true,
  },
  {
    name: "unassigns a customer",
    action: unassignAdminPromotionCustomer,
    args: [102, 501],
    service: mockUnassignPromotionCustomer,
    serviceResult: { id: 102, assignments: [] },
    expectedServiceArgs: [
      { actorUser: expectedActor, promotionId: 102, userId: 501 },
    ],
    expectedData: { id: 102, assignments: [] },
    mutates: true,
  },
];

describe("promotion server actions", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      id: "session-user-7",
      role: "CUSTOMER",
    });
    mockFindByPk.mockResolvedValue(authenticatedDbActor);
    mockListPromotions.mockImplementation(async () => {
      if (!mockRelationsInitialized) {
        throw new Error("Promotion associations were not initialized");
      }

      return [];
    });
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rejects an anonymous request before loading a database user", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(getPromotionsAdminData()).resolves.toEqual({
      success: false,
      message: "Unauthorized",
      data: null,
    });
    expect(mockFindByPk).not.toHaveBeenCalled();
    expect(mockListPromotions).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a session whose database user no longer exists", async () => {
    mockFindByPk.mockResolvedValue(null);

    await expect(getPromotionsAdminData()).resolves.toEqual({
      success: false,
      message: "Unauthorized: Promotion admin access required",
      data: null,
    });
    expect(mockFindByPk).toHaveBeenCalledWith("session-user-7");
    expect(mockListPromotions).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a customer even when the session claims Super Admin", async () => {
    mockAuth.mockResolvedValue({
      id: "session-user-7",
      role: "SUPERADMIN",
    });
    mockFindByPk.mockResolvedValue({ id: 7, role: "CUSTOMER" });

    await expect(getPromotionsAdminData()).resolves.toEqual({
      success: false,
      message: "Unauthorized: Promotion admin access required",
      data: null,
    });
    expect(mockListPromotions).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it.each(authorizedCases)(
    "$name with the database-derived Super Admin actor",
    async ({
      action,
      args,
      service,
      serviceResult,
      expectedServiceArgs,
      expectedData,
      mutates,
    }) => {
      service.mockResolvedValue(serviceResult);

      await expect(action(...args)).resolves.toEqual({
        success: true,
        message: null,
        data: expectedData,
      });

      expect(mockAuth).toHaveBeenCalledTimes(1);
      expect(mockFindByPk).toHaveBeenCalledTimes(1);
      expect(mockFindByPk).toHaveBeenCalledWith("session-user-7");
      expect(service).toHaveBeenCalledTimes(1);
      expect(service).toHaveBeenCalledWith(...expectedServiceArgs);

      if (mutates) {
        expect(mockRevalidatePath.mock.calls).toEqual([
          ["/admin"],
          ["/admin/promotions"],
        ]);
        expect(service.mock.invocationCallOrder[0]).toBeLessThan(
          mockRevalidatePath.mock.invocationCallOrder[0],
        );
      } else {
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      }
    },
  );

  it.each(authorizedCases)(
    "wraps a service error from $name in a stable action result",
    async ({ action, args, service }) => {
      service.mockRejectedValue(new Error("Safe promotion service error"));

      await expect(action(...args)).resolves.toEqual({
        success: false,
        message: "Safe promotion service error",
        data: null,
      });
      expect(service).toHaveBeenCalledTimes(1);
      expect(mockRevalidatePath).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Server Action Error:",
        expect.any(Error),
      );
    },
  );

  it("requires relation initialization before listing assignment includes", async () => {
    mockListPromotions.mockImplementation(async ({ actorUser }) => {
      if (!mockRelationsInitialized) {
        throw new Error("Promotion associations were not initialized");
      }

      return [{ id: 101, actorId: actorUser.id }];
    });

    await expect(getPromotionsAdminData()).resolves.toEqual({
      success: true,
      message: null,
      data: { promotions: [{ id: 101, actorId: 42 }] },
    });
    expect(mockRelationsInitialized).toBe(true);
    expect(mockListPromotions).toHaveBeenCalledWith({
      actorUser: expectedActor,
    });
  });

  it("uses the actionWrapper fallback for a service rejection without a message", async () => {
    mockSearchAssignableCustomers.mockRejectedValue(null);

    await expect(searchPromotionAssignableCustomers("alex")).resolves.toEqual({
      success: false,
      message: "An unexpected error occurred",
      data: null,
    });
  });
});
