import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  activatePromotion,
  assignPromotionCustomer,
  createPromotion,
  deactivatePromotion,
  listPromotions,
  PROMOTION_ADMIN_AUTHORIZATION_MODE,
  pausePromotion,
  searchAssignableCustomers,
  unassignPromotionCustomer,
  updatePromotion,
} from "../promotionAdmin";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

const superadminActor = { id: 11, role: "SUPERADMIN" };
const customerActor = { id: 21, role: "CUSTOMER" };

function buildPromotionRecord(overrides = {}) {
  const state = {
    id: 7,
    kind: "GENERIC",
    code: "SAVE20",
    name: "Save 20",
    adminDescription: null,
    customerMessage: null,
    benefitType: "PERCENTAGE",
    benefitValue: "20.00",
    benefitCap: "200.00",
    minimumSpend: "500.00",
    startsAt: null,
    endsAt: null,
    status: "DRAFT",
    systemFlag: false,
    priority: 0,
    perUserLimit: 1,
    totalLimit: 50,
    triggerType: "NONE",
    triggerConfig: {},
    legacySourceType: null,
    legacySourceId: null,
    createdByUserId: 5,
    updatedByUserId: 5,
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:00:00.000Z"),
    assignments: [],
    ...overrides,
  };

  return {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
    update: jest.fn(async (values) => {
      Object.assign(state, values, {
        updatedAt: new Date("2026-07-01T12:00:00.000Z"),
      });
      return {
        ...state,
        get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
      };
    }),
  };
}

function buildCustomerRecord(overrides = {}) {
  const state = {
    id: 42,
    fullName: "Assigned Customer",
    companyName: null,
    email: "customer@example.com",
    phone: "+971500000000",
    accountType: "INDIVIDUAL",
    role: "CUSTOMER",
    disabledAt: null,
    updatedAt: new Date("2026-07-01T09:00:00.000Z"),
    ...overrides,
  };

  return {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
  };
}

function buildAssignmentRecord(overrides = {}) {
  const state = {
    id: 301,
    promotionId: 7,
    userId: 42,
    assignedAt: new Date("2026-07-01T13:00:00.000Z"),
    unassignedAt: null,
    assignedByUserId: 11,
    unassignedByUserId: null,
    createdAt: new Date("2026-07-01T13:00:00.000Z"),
    updatedAt: new Date("2026-07-01T13:00:00.000Z"),
    notes: null,
    user: buildCustomerRecord(),
    ...overrides,
  };

  const record = {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
    update: jest.fn(async (values) => {
      Object.assign(state, values, {
        updatedAt: new Date("2026-07-01T14:00:00.000Z"),
      });
      Object.assign(record, state);
      return record;
    }),
  };

  return record;
}

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    Promotion: {
      create: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
    },
    PromotionAssignment: {
      create: jest.fn(),
      findOne: jest.fn(),
    },
    PromotionAuditEvent: {
      create: jest.fn(),
    },
    User: {
      findAll: jest.fn(),
      findOne: jest.fn(),
    },
  },
}));

describe("promotionAdmin service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists promotions for an authorized actor with stable ordering", async () => {
    const assignment = buildAssignmentRecord();
    models.Promotion.findAll.mockResolvedValue([
      buildPromotionRecord({
        id: 10,
        kind: "AUTOMATIC",
        triggerType: "ANY_PAID_BOOKING",
        code: null,
        benefitCap: null,
      }),
      buildPromotionRecord({
        id: 9,
        kind: "PERSONAL",
        code: null,
        assignments: [assignment],
      }),
    ]);

    const result = await listPromotions({ actorUser: superadminActor });

    expect(models.Promotion.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        order: [
          ["kind", "ASC"],
          ["priority", "DESC"],
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],
        transaction: null,
      }),
    );
    expect(models.Promotion.findAll.mock.calls[0][0].include).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          as: "assignments",
        }),
      ]),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 10,
        kind: "AUTOMATIC",
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        id: 9,
        assignments: [
          expect.objectContaining({
            id: 301,
            user: expect.objectContaining({
              id: 42,
              displayName: "Assigned Customer",
            }),
          }),
        ],
      }),
    );
  });

  it("rejects unauthorized promotion admins", async () => {
    await expect(
      createPromotion({
        actorUser: customerActor,
        input: {
          kind: "GENERIC",
          code: "save20",
          name: "Save 20",
          benefitType: "PERCENTAGE",
          benefitValue: 20,
          benefitCap: 200,
          minimumSpend: 500,
          triggerType: "NONE",
        },
      }),
    ).rejects.toThrow("Unauthorized: Promotion admin access required");
  });

  it("creates and audits an active generic promotion with normalized values", async () => {
    const createdPromotion = buildPromotionRecord({
      id: 88,
      status: "ACTIVE",
      code: "SAVE20",
      createdByUserId: 11,
      updatedByUserId: 11,
    });

    models.Promotion.findOne.mockResolvedValue(null);
    models.Promotion.create.mockResolvedValue(createdPromotion);

    const result = await createPromotion({
      actorUser: superadminActor,
      reason: "launch coupon",
      input: {
        kind: "GENERIC",
        code: " save20 ",
        name: "Save 20",
        adminDescription: "Summer launch code",
        customerMessage: "Use at checkout",
        benefitType: "PERCENTAGE",
        benefitValue: "20",
        benefitCap: "200",
        minimumSpend: "500",
        status: "ACTIVE",
        priority: 2,
        perUserLimit: 1,
        totalLimit: 50,
        triggerType: "NONE",
      },
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Promotion.findOne).toHaveBeenCalledTimes(1);
    expect(models.Promotion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "GENERIC",
        code: "SAVE20",
        benefitType: "PERCENTAGE",
        benefitValue: 20,
        benefitCap: 200,
        minimumSpend: 500,
        status: "ACTIVE",
        createdByUserId: 11,
        updatedByUserId: 11,
      }),
      { transaction: mockTransaction },
    );
    expect(models.PromotionAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionId: 88,
        actorUserId: 11,
        action: "CREATED",
        reason: "launch coupon",
        beforeState: null,
        afterState: expect.objectContaining({
          id: 88,
          code: "SAVE20",
          status: "ACTIVE",
        }),
        metadata: expect.objectContaining({
          authorizationMode: PROMOTION_ADMIN_AUTHORIZATION_MODE,
        }),
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 88,
        code: "SAVE20",
        status: "ACTIVE",
      }),
    );
  });

  it("validates automatic date-range promotions before create", async () => {
    await expect(
      createPromotion({
        actorUser: superadminActor,
        input: {
          kind: "AUTOMATIC",
          name: "Bad date range",
          benefitType: "FIXED",
          benefitValue: 100,
          triggerType: "DATE_RANGE",
          triggerConfig: {
            startDate: "2026/07/05",
            endDate: "2026-07-04",
          },
        },
      }),
    ).rejects.toThrow("Date-range start date must use YYYY-MM-DD");
  });

  it("searches only enabled customer accounts", async () => {
    models.User.findAll.mockResolvedValue([
      buildCustomerRecord({
        id: 51,
        fullName: "Alice Customer",
        email: "alice@example.com",
      }),
    ]);

    const result = await searchAssignableCustomers({
      actorUser: superadminActor,
      query: "alice",
    });

    expect(models.User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "CUSTOMER",
          disabledAt: null,
        }),
        limit: 8,
        transaction: null,
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 51,
        displayName: "Alice Customer",
      }),
    ]);
  });

  it("assigns a personal promotion to a customer and returns the refreshed promotion", async () => {
    const promotion = buildPromotionRecord({
      id: 77,
      kind: "PERSONAL",
      code: null,
    });
    const customer = buildCustomerRecord({
      id: 91,
      fullName: "Noura Buyer",
      email: "noura@example.com",
    });
    const createdAssignment = buildAssignmentRecord({
      id: 401,
      promotionId: 77,
      userId: 91,
      user: customer,
    });
    const refreshedPromotion = buildPromotionRecord({
      id: 77,
      kind: "PERSONAL",
      code: null,
      assignments: [createdAssignment],
    });

    models.Promotion.findByPk
      .mockResolvedValueOnce(promotion)
      .mockResolvedValueOnce(refreshedPromotion);
    models.User.findOne.mockResolvedValue(customer);
    models.PromotionAssignment.findOne.mockResolvedValue(null);
    models.PromotionAssignment.create.mockResolvedValue(createdAssignment);

    const result = await assignPromotionCustomer({
      actorUser: superadminActor,
      promotionId: 77,
      userId: 91,
    });

    expect(models.User.findOne).toHaveBeenCalledWith({
      where: {
        id: 91,
        role: "CUSTOMER",
        disabledAt: null,
      },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(models.PromotionAssignment.findOne).toHaveBeenCalledWith({
      where: {
        promotionId: 77,
        userId: 91,
        unassignedAt: null,
      },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(models.PromotionAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionId: 77,
        userId: 91,
        assignedByUserId: 11,
      }),
      { transaction: mockTransaction },
    );
    expect(models.PromotionAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionId: 77,
        promotionAssignmentId: 401,
        action: "ASSIGNED",
        metadata: expect.objectContaining({
          authorizationMode: PROMOTION_ADMIN_AUTHORIZATION_MODE,
          customerUserId: 91,
        }),
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 77,
        kind: "PERSONAL",
        assignments: [
          expect.objectContaining({
            id: 401,
            user: expect.objectContaining({
              id: 91,
              displayName: "Noura Buyer",
            }),
          }),
        ],
      }),
    );
  });

  it.each([
    [
      "disabled customer",
      buildCustomerRecord({
        id: 92,
        disabledAt: new Date("2026-07-01T10:30:00.000Z"),
      }),
    ],
    ["staff user", buildCustomerRecord({ id: 93, role: "SHOOT" })],
    ["missing user", null],
  ])(
    "rejects direct assignment for a %s without revealing account eligibility",
    async (_label, ineligibleCustomer) => {
      const promotion = buildPromotionRecord({
        id: 77,
        kind: "PERSONAL",
        code: null,
      });

      models.Promotion.findByPk.mockResolvedValue(promotion);
      models.User.findOne.mockResolvedValue(
        ineligibleCustomer?.role === "CUSTOMER" &&
          ineligibleCustomer.disabledAt == null
          ? ineligibleCustomer
          : null,
      );

      await expect(
        assignPromotionCustomer({
          actorUser: superadminActor,
          promotionId: 77,
          userId: ineligibleCustomer?.id ?? 999,
        }),
      ).rejects.toThrow("Customer account not found");

      expect(models.User.findOne).toHaveBeenCalledWith({
        where: {
          id: ineligibleCustomer?.id ?? 999,
          role: "CUSTOMER",
          disabledAt: null,
        },
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE,
      });
      expect(models.PromotionAssignment.findOne).not.toHaveBeenCalled();
      expect(models.PromotionAssignment.create).not.toHaveBeenCalled();
      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    },
  );

  it("unassigns a customer while preserving assignment history", async () => {
    const promotion = buildPromotionRecord({
      id: 77,
      kind: "PERSONAL",
      code: null,
    });
    const assignment = buildAssignmentRecord({
      id: 401,
      promotionId: 77,
      userId: 91,
      user: buildCustomerRecord({
        id: 91,
        fullName: "Noura Buyer",
        email: "noura@example.com",
      }),
    });
    const refreshedPromotion = buildPromotionRecord({
      id: 77,
      kind: "PERSONAL",
      code: null,
      assignments: [],
    });

    models.Promotion.findByPk
      .mockResolvedValueOnce(promotion)
      .mockResolvedValueOnce(refreshedPromotion);
    models.PromotionAssignment.findOne.mockResolvedValue(assignment);
    models.User.findOne.mockResolvedValue(assignment.user);

    const result = await unassignPromotionCustomer({
      actorUser: superadminActor,
      promotionId: 77,
      userId: 91,
    });

    expect(models.PromotionAssignment.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          promotionId: 77,
          userId: 91,
          unassignedAt: null,
        },
        transaction: mockTransaction,
        lock: mockTransaction.LOCK.UPDATE,
      }),
    );
    expect(assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        unassignedAt: expect.any(Date),
        unassignedByUserId: 11,
      }),
      { transaction: mockTransaction },
    );
    expect(models.PromotionAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionId: 77,
        promotionAssignmentId: 401,
        action: "UNASSIGNED",
        beforeState: expect.objectContaining({ unassignedAt: null }),
        afterState: expect.objectContaining({
          unassignedAt: expect.any(String),
          unassignedByUserId: 11,
        }),
        metadata: expect.objectContaining({
          authorizationMode: PROMOTION_ADMIN_AUTHORIZATION_MODE,
          customerUserId: 91,
        }),
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 77, assignments: [] }),
    );
  });

  it("updates a promotion, keeps status immutable, and records an UPDATED audit event", async () => {
    const promotion = buildPromotionRecord({
      id: 19,
      status: "ACTIVE",
      name: "Old promo",
    });

    models.Promotion.findByPk.mockResolvedValue(promotion);
    models.Promotion.findOne.mockResolvedValue(null);

    const result = await updatePromotion({
      actorUser: superadminActor,
      promotionId: 19,
      reason: "raise cap",
      input: {
        name: "Updated promo",
        benefitCap: 250,
        priority: 3,
      },
    });

    expect(models.Promotion.findByPk).toHaveBeenCalledWith(19, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(promotion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated promo",
        benefitCap: 250,
        priority: 3,
        status: "ACTIVE",
        updatedByUserId: 11,
      }),
      { transaction: mockTransaction },
    );
    expect(models.PromotionAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotionId: 19,
        actorUserId: 11,
        action: "UPDATED",
        reason: "raise cap",
        beforeState: expect.objectContaining({
          name: "Old promo",
        }),
        afterState: expect.objectContaining({
          name: "Updated promo",
          benefitCap: 250,
        }),
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 19,
        name: "Updated promo",
        benefitCap: 250,
      }),
    );
  });

  it("activates a promotion and records an ACTIVATED audit event", async () => {
    const promotion = buildPromotionRecord({
      id: 30,
      status: "PAUSED",
    });

    models.Promotion.findByPk.mockResolvedValue(promotion);
    models.Promotion.findOne.mockResolvedValue(null);

    const result = await activatePromotion({
      actorUser: superadminActor,
      promotionId: 30,
      reason: "ready for launch",
    });

    expect(promotion.update).toHaveBeenCalledWith(
      {
        status: "ACTIVE",
        updatedByUserId: 11,
      },
      { transaction: mockTransaction },
    );
    expect(models.PromotionAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ACTIVATED",
        reason: "ready for launch",
        beforeState: expect.objectContaining({
          status: "PAUSED",
        }),
        afterState: expect.objectContaining({
          status: "ACTIVE",
        }),
      }),
      { transaction: mockTransaction },
    );
    expect(result.status).toBe("ACTIVE");
  });

  it("pauses and deactivates a promotion with distinct audit events", async () => {
    const activePromotion = buildPromotionRecord({
      id: 41,
      status: "ACTIVE",
    });
    const pausedPromotion = buildPromotionRecord({
      id: 42,
      status: "PAUSED",
    });

    models.Promotion.findByPk
      .mockResolvedValueOnce(activePromotion)
      .mockResolvedValueOnce(pausedPromotion);

    const paused = await pausePromotion({
      actorUser: superadminActor,
      promotionId: 41,
      reason: "temporary stop",
    });
    const deactivated = await deactivatePromotion({
      actorUser: superadminActor,
      promotionId: 42,
      reason: "retired",
    });

    expect(paused.status).toBe("PAUSED");
    expect(deactivated.status).toBe("DEACTIVATED");
    expect(models.PromotionAuditEvent.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "PAUSED",
        reason: "temporary stop",
      }),
      { transaction: mockTransaction },
    );
    expect(models.PromotionAuditEvent.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "DEACTIVATED",
        reason: "retired",
      }),
      { transaction: mockTransaction },
    );
  });

  it("blocks status changes away from DEACTIVATED", async () => {
    models.Promotion.findByPk.mockResolvedValue(
      buildPromotionRecord({
        id: 55,
        status: "DEACTIVATED",
      }),
    );

    await expect(
      activatePromotion({
        actorUser: superadminActor,
        promotionId: 55,
      }),
    ).rejects.toThrow("Deactivated promotions cannot change status");
  });
});
