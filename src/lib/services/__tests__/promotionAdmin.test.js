import { Op } from "sequelize";
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

function buildValidGenericInput(overrides = {}) {
  return {
    kind: "GENERIC",
    code: "SAVE20",
    name: "Save 20",
    benefitType: "PERCENTAGE",
    benefitValue: 20,
    benefitCap: 200,
    minimumSpend: 500,
    status: "DRAFT",
    systemFlag: false,
    priority: 0,
    perUserLimit: 1,
    totalLimit: 50,
    triggerType: "NONE",
    triggerConfig: {},
    ...overrides,
  };
}

function buildValidPersonalInput(overrides = {}) {
  return buildValidGenericInput({
    kind: "PERSONAL",
    code: null,
    triggerType: "NONE",
    ...overrides,
  });
}

function buildValidAutomaticInput(overrides = {}) {
  return buildValidGenericInput({
    kind: "AUTOMATIC",
    code: null,
    triggerType: "ANY_PAID_BOOKING",
    ...overrides,
  });
}

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

  it("normalizes list filters", async () => {
    models.Promotion.findAll.mockResolvedValue([]);

    await listPromotions({
      actorUser: superadminActor,
      kind: " personal ",
      status: " deactivated ",
    });

    expect(models.Promotion.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          kind: "PERSONAL",
          status: "DEACTIVATED",
        },
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

  it.each([
    [null, "Unauthorized"],
    [{ id: "invalid", role: "SUPERADMIN" }, "Actor user ID is required"],
  ])("rejects invalid actor identity", async (actorUser, message) => {
    await expect(listPromotions({ actorUser })).rejects.toThrow(message);
    expect(models.Promotion.findAll).not.toHaveBeenCalled();
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

  describe("create normalization and validation matrix", () => {
    beforeEach(() => {
      models.Promotion.findOne.mockResolvedValue(null);
      models.Promotion.create.mockImplementation(async (values) =>
        buildPromotionRecord({ id: 88, ...values }),
      );
    });

    it.each([
      {
        label: "generic code, kind, name, enums, numbers, text, and dates",
        input: buildValidGenericInput({
          kind: " generic ",
          code: " summer-20 ",
          name: " Summer offer ",
          adminDescription: " Internal context ",
          customerMessage: " Customer copy ",
          benefitType: " percentage ",
          benefitValue: "25",
          benefitCap: "175",
          minimumSpend: "300",
          startsAt: "2026-07-01T00:00:00.000Z",
          endsAt: "2026-07-31T23:59:59.000Z",
          status: " paused ",
          systemFlag: true,
          priority: "4",
          perUserLimit: "2",
          totalLimit: "80",
          triggerType: " none ",
          legacySourceType: " coupon ",
          legacySourceId: " 17 ",
        }),
        expected: {
          kind: "GENERIC",
          code: "SUMMER-20",
          name: "Summer offer",
          adminDescription: "Internal context",
          customerMessage: "Customer copy",
          benefitType: "PERCENTAGE",
          benefitValue: 25,
          benefitCap: 175,
          minimumSpend: 300,
          startsAt: new Date("2026-07-01T00:00:00.000Z"),
          endsAt: new Date("2026-07-31T23:59:59.000Z"),
          status: "PAUSED",
          systemFlag: true,
          priority: 4,
          perUserLimit: 2,
          totalLimit: 80,
          triggerType: "NONE",
          triggerConfig: {},
          legacySourceType: "coupon",
          legacySourceId: "17",
        },
      },
      {
        label: "personal defaults and cleared optional fields",
        input: {
          kind: "personal",
          code: " ",
          name: " Partner offer ",
          adminDescription: " ",
          customerMessage: null,
          benefitType: "fixed",
          benefitValue: "100",
          benefitCap: "",
          minimumSpend: "",
          startsAt: "",
          endsAt: null,
          perUserLimit: "",
          totalLimit: null,
          triggerType: "none",
          triggerConfig: null,
        },
        expected: {
          kind: "PERSONAL",
          code: null,
          name: "Partner offer",
          adminDescription: null,
          customerMessage: null,
          benefitType: "FIXED",
          benefitValue: 100,
          benefitCap: null,
          minimumSpend: 0,
          startsAt: null,
          endsAt: null,
          status: "DRAFT",
          systemFlag: false,
          priority: 0,
          perUserLimit: null,
          totalLimit: null,
          triggerType: "NONE",
          triggerConfig: {},
        },
      },
      {
        label: "automatic date-range trigger config and boolean flags",
        input: buildValidAutomaticInput({
          name: "Date range",
          triggerType: " date_range ",
          triggerConfig: {
            startDate: "2026-07-01",
            endDate: "2026-07-31",
            includeStart: false,
            includeEnd: true,
          },
        }),
        expected: {
          kind: "AUTOMATIC",
          code: null,
          triggerType: "DATE_RANGE",
          triggerConfig: {
            startDate: "2026-07-01",
            endDate: "2026-07-31",
            includeStart: false,
            includeEnd: true,
          },
        },
      },
    ])("normalizes $label", async ({ input, expected }) => {
      await createPromotion({ actorUser: superadminActor, input });

      expect(models.Promotion.create).toHaveBeenCalledWith(
        expect.objectContaining(expected),
        { transaction: mockTransaction },
      );
    });

    it.each(["FIRST_PAID_BOOKING", "SECOND_PAID_BOOKING", "ANY_PAID_BOOKING"])(
      "accepts the %s automatic trigger",
      async (triggerType) => {
        await createPromotion({
          actorUser: superadminActor,
          input: buildValidAutomaticInput({ triggerType }),
        });

        expect(models.Promotion.create).toHaveBeenCalledWith(
          expect.objectContaining({
            kind: "AUTOMATIC",
            triggerType,
            triggerConfig: {},
          }),
          { transaction: mockTransaction },
        );
      },
    );

    it("uses a caller-provided transaction without opening another one", async () => {
      await createPromotion({
        actorUser: superadminActor,
        input: buildValidGenericInput(),
        transaction: mockTransaction,
      });

      expect(sequelize.transaction).not.toHaveBeenCalled();
      expect(models.Promotion.create).toHaveBeenCalledWith(expect.any(Object), {
        transaction: mockTransaction,
      });
    });

    it.each([
      [
        "missing kind",
        buildValidGenericInput({ kind: " " }),
        "Promotion kind is required",
      ],
      [
        "unknown kind",
        buildValidGenericInput({ kind: "BULK" }),
        "Promotion kind must be GENERIC, PERSONAL, or AUTOMATIC",
      ],
      [
        "missing generic code",
        buildValidGenericInput({ code: " " }),
        "Generic promotions require a code",
      ],
      [
        "personal code",
        buildValidPersonalInput({ code: "VIP" }),
        "Only generic promotions may define a code",
      ],
      [
        "automatic code",
        buildValidAutomaticInput({ code: "AUTO" }),
        "Only generic promotions may define a code",
      ],
      [
        "blank name",
        buildValidGenericInput({ name: "  " }),
        "Promotion name is required",
      ],
      [
        "missing benefit type",
        buildValidGenericInput({ benefitType: "" }),
        "Benefit type is required",
      ],
      [
        "unknown benefit type",
        buildValidGenericInput({ benefitType: "CREDIT" }),
        "Benefit type must be FIXED or PERCENTAGE",
      ],
      [
        "zero benefit",
        buildValidGenericInput({ benefitValue: 0 }),
        "Benefit value must be a positive number",
      ],
      [
        "negative benefit",
        buildValidGenericInput({ benefitValue: -1 }),
        "Benefit value must be a positive number",
      ],
      [
        "non-numeric benefit",
        buildValidGenericInput({ benefitValue: "many" }),
        "Benefit value must be a positive number",
      ],
      [
        "percentage above 100",
        buildValidGenericInput({ benefitValue: 100.01 }),
        "Percentage benefits cannot exceed 100",
      ],
      [
        "zero cap",
        buildValidGenericInput({ benefitCap: 0 }),
        "Benefit cap must be a positive number",
      ],
      [
        "negative cap",
        buildValidGenericInput({ benefitCap: -1 }),
        "Benefit cap must be a positive number",
      ],
      [
        "fixed benefit cap",
        buildValidGenericInput({ benefitType: "FIXED", benefitCap: 10 }),
        "Fixed-amount promotions cannot define a benefit cap",
      ],
      [
        "negative minimum spend",
        buildValidGenericInput({ minimumSpend: -1 }),
        "Minimum spend must be a non-negative number",
      ],
      [
        "invalid start date",
        buildValidGenericInput({ startsAt: "not-a-date" }),
        "Start date must be a valid date",
      ],
      [
        "impossible end date",
        buildValidGenericInput({ endsAt: "2026-02-30" }),
        "End date must be a valid date",
      ],
      [
        "reversed eligibility window",
        buildValidGenericInput({
          startsAt: "2026-08-02",
          endsAt: "2026-08-01",
        }),
        "End date must be on or after the start date",
      ],
      [
        "unknown status",
        buildValidGenericInput({ status: "ARCHIVED" }),
        "Promotion status must be DRAFT, ACTIVE, PAUSED, or DEACTIVATED",
      ],
      [
        "deactivated create status",
        buildValidGenericInput({ status: "DEACTIVATED" }),
        "New promotions cannot start in DEACTIVATED status",
      ],
      [
        "non-boolean system flag",
        buildValidGenericInput({ systemFlag: "true" }),
        "Boolean fields must be true or false",
      ],
      [
        "negative priority",
        buildValidGenericInput({ priority: -1 }),
        "Priority must be a non-negative integer",
      ],
      [
        "fractional priority",
        buildValidGenericInput({ priority: 1.5 }),
        "Priority must be a non-negative integer",
      ],
      [
        "zero per-user limit",
        buildValidGenericInput({ perUserLimit: 0 }),
        "Per-user limit must be a positive integer",
      ],
      [
        "fractional per-user limit",
        buildValidGenericInput({ perUserLimit: 1.5 }),
        "Per-user limit must be a positive integer",
      ],
      [
        "zero total limit",
        buildValidGenericInput({ totalLimit: 0 }),
        "Total limit must be a positive integer",
      ],
      [
        "fractional total limit",
        buildValidGenericInput({ totalLimit: 1.5 }),
        "Total limit must be a positive integer",
      ],
      [
        "generic trigger",
        buildValidGenericInput({ triggerType: "ANY_PAID_BOOKING" }),
        "Generic and personal promotions must use trigger type NONE",
      ],
      [
        "personal trigger",
        buildValidPersonalInput({ triggerType: "FIRST_PAID_BOOKING" }),
        "Generic and personal promotions must use trigger type NONE",
      ],
      [
        "automatic NONE trigger",
        buildValidAutomaticInput({ triggerType: "NONE" }),
        "Automatic promotions require a non-NONE trigger type",
      ],
      [
        "unknown trigger",
        buildValidAutomaticInput({ triggerType: "ORDER_COUNT" }),
        "Trigger type must be NONE, FIRST_PAID_BOOKING, SECOND_PAID_BOOKING, ANY_PAID_BOOKING, or DATE_RANGE",
      ],
      [
        "scalar trigger config",
        buildValidAutomaticInput({ triggerConfig: "all" }),
        "Trigger config must be an object",
      ],
      [
        "missing date-range config",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: null,
        }),
        "Date-range trigger config must be an object",
      ],
      [
        "missing date-range start",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: { endDate: "2026-07-31" },
        }),
        "Date-range start date is required",
      ],
      [
        "bad date-range start format",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: { startDate: "2026/07/01", endDate: "2026-07-31" },
        }),
        "Date-range start date must use YYYY-MM-DD",
      ],
      [
        "impossible date-range start",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: { startDate: "2026-02-30", endDate: "2026-03-02" },
        }),
        "Date-range start date must be a valid date",
      ],
      [
        "bad date-range end format",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: { startDate: "2026-07-01", endDate: "31-07-2026" },
        }),
        "Date-range end date must use YYYY-MM-DD",
      ],
      [
        "impossible date-range end",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: { startDate: "2026-02-01", endDate: "2026-02-30" },
        }),
        "Date-range end date must be a valid date",
      ],
      [
        "reversed date-range trigger",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: { startDate: "2026-07-31", endDate: "2026-07-01" },
        }),
        "Date-range end date must be on or after start date",
      ],
      [
        "invalid include-start flag",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: {
            startDate: "2026-07-01",
            endDate: "2026-07-31",
            includeStart: 1,
          },
        }),
        "Boolean fields must be true or false",
      ],
      [
        "invalid include-end flag",
        buildValidAutomaticInput({
          triggerType: "DATE_RANGE",
          triggerConfig: {
            startDate: "2026-07-01",
            endDate: "2026-07-31",
            includeEnd: "yes",
          },
        }),
        "Boolean fields must be true or false",
      ],
    ])("rejects %s", async (_label, input, message) => {
      await expect(
        createPromotion({ actorUser: superadminActor, input }),
      ).rejects.toThrow(message);

      expect(models.Promotion.create).not.toHaveBeenCalled();
      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });
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

  it("searches assignable customers without exposing staff accounts", async () => {
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

  it("returns early for short customer searches", async () => {
    await expect(
      searchAssignableCustomers({
        actorUser: superadminActor,
        query: " a ",
      }),
    ).resolves.toEqual([]);

    expect(models.User.findAll).not.toHaveBeenCalled();
  });

  it("normalizes numeric customer search and caps the result limit", async () => {
    models.User.findAll.mockResolvedValue([]);

    await searchAssignableCustomers({
      actorUser: superadminActor,
      query: "42",
      limit: 200,
    });

    const query = models.User.findAll.mock.calls[0][0];
    expect(query.limit).toBe(20);
    expect(query.where[Op.or][0]).toEqual({ id: 42 });
  });

  it.each([0, -1, 1.5])(
    "rejects an invalid customer search limit of %s",
    async (limit) => {
      await expect(
        searchAssignableCustomers({
          actorUser: superadminActor,
          query: "customer",
          limit,
        }),
      ).rejects.toThrow("Customer search limit must be a positive integer");
    },
  );

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

  describe("update normalization and status protection", () => {
    it("normalizes provided fields while preserving omitted fields", async () => {
      const promotion = buildPromotionRecord({
        id: 19,
        status: "ACTIVE",
        name: "Old promo",
        adminDescription: "Old internal copy",
        customerMessage: "Old customer copy",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-07-31T00:00:00.000Z"),
      });

      models.Promotion.findByPk.mockResolvedValue(promotion);
      models.Promotion.findOne.mockResolvedValue(null);

      await updatePromotion({
        actorUser: superadminActor,
        promotionId: "19",
        input: {
          code: " updated20 ",
          name: " Updated promo ",
          adminDescription: " ",
          benefitValue: "30",
          benefitCap: "",
          minimumSpend: "250",
          startsAt: null,
          priority: "2",
          perUserLimit: "",
          triggerConfig: null,
        },
      });

      expect(promotion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "GENERIC",
          code: "UPDATED20",
          name: "Updated promo",
          adminDescription: null,
          customerMessage: "Old customer copy",
          benefitType: "PERCENTAGE",
          benefitValue: 30,
          benefitCap: null,
          minimumSpend: 250,
          startsAt: null,
          endsAt: new Date("2026-07-31T00:00:00.000Z"),
          status: "ACTIVE",
          priority: 2,
          perUserLimit: null,
          totalLimit: 50,
          triggerType: "NONE",
          triggerConfig: {},
          updatedByUserId: 11,
        }),
        { transaction: mockTransaction },
      );
    });

    it("rejects direct status updates before loading a promotion", async () => {
      await expect(
        updatePromotion({
          actorUser: superadminActor,
          promotionId: 19,
          input: { status: "PAUSED" },
        }),
      ).rejects.toThrow(
        "Promotion status must be changed through activate, pause, or deactivate actions",
      );

      expect(sequelize.transaction).not.toHaveBeenCalled();
      expect(models.Promotion.findByPk).not.toHaveBeenCalled();
    });

    it("rejects an update for a missing promotion", async () => {
      models.Promotion.findByPk.mockResolvedValue(null);

      await expect(
        updatePromotion({
          actorUser: superadminActor,
          promotionId: 404,
          input: { name: "Missing" },
        }),
      ).rejects.toThrow("Promotion not found");

      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("case-insensitive active generic-code conflicts", () => {
    function expectLowercaseCodeLookup(code, excludePromotionId = null) {
      const query = models.Promotion.findOne.mock.calls[0][0];
      const conditions = query.where[Op.and];
      const codeCondition = conditions.find(
        (condition) => condition?.attribute?.fn === "LOWER",
      );

      expect(codeCondition.logic).toBe(code.toLowerCase());

      if (excludePromotionId != null) {
        expect(conditions).toContainEqual({
          id: { [Op.ne]: excludePromotionId },
        });
      }
    }

    it("rejects an active create when another code differs only by case", async () => {
      models.Promotion.findOne.mockResolvedValue(
        buildPromotionRecord({ code: "SAVE20", status: "ACTIVE" }),
      );

      await expect(
        createPromotion({
          actorUser: superadminActor,
          input: buildValidGenericInput({
            code: " save20 ",
            status: "ACTIVE",
          }),
        }),
      ).rejects.toThrow("An active generic promotion already uses that code");

      expectLowercaseCodeLookup("SAVE20");
      expect(models.Promotion.create).not.toHaveBeenCalled();
    });

    it("allows the same generic code on a draft create without an active lookup", async () => {
      models.Promotion.create.mockResolvedValue(
        buildPromotionRecord({ code: "SAVE20", status: "DRAFT" }),
      );

      await createPromotion({
        actorUser: superadminActor,
        input: buildValidGenericInput({ code: " save20 ", status: "DRAFT" }),
      });

      expect(models.Promotion.findOne).not.toHaveBeenCalled();
    });

    it("rejects an active update when another code differs only by case", async () => {
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ id: 19, code: "OLD20", status: "ACTIVE" }),
      );
      models.Promotion.findOne.mockResolvedValue(
        buildPromotionRecord({ id: 20, code: "SAVE20", status: "ACTIVE" }),
      );

      await expect(
        updatePromotion({
          actorUser: superadminActor,
          promotionId: 19,
          input: { code: " save20 " },
        }),
      ).rejects.toThrow("An active generic promotion already uses that code");

      expectLowercaseCodeLookup("SAVE20", 19);
    });

    it("rejects activation when another active code differs only by case", async () => {
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ id: 19, code: "SaVe20", status: "PAUSED" }),
      );
      models.Promotion.findOne.mockResolvedValue(
        buildPromotionRecord({ id: 20, code: "SAVE20", status: "ACTIVE" }),
      );

      await expect(
        activatePromotion({
          actorUser: superadminActor,
          promotionId: 19,
        }),
      ).rejects.toThrow("An active generic promotion already uses that code");

      expectLowercaseCodeLookup("SAVE20", 19);
    });
  });

  describe("lifecycle transition matrix", () => {
    it.each([
      ["ACTIVE", activatePromotion],
      ["PAUSED", pausePromotion],
      ["DEACTIVATED", deactivatePromotion],
    ])("treats repeated %s actions as no-ops", async (status, action) => {
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ id: 61, status }),
      );

      const result = await action({
        actorUser: superadminActor,
        promotionId: 61,
      });

      expect(result.status).toBe(status);
      expect(models.Promotion.findOne).not.toHaveBeenCalled();
      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });

    it("rejects pausing a promotion that has never been activated", async () => {
      const promotion = buildPromotionRecord({ id: 62, status: "DRAFT" });
      models.Promotion.findByPk.mockResolvedValue(promotion);

      await expect(
        pausePromotion({
          actorUser: superadminActor,
          promotionId: 62,
        }),
      ).rejects.toThrow("Only active promotions may be paused");

      expect(promotion.update).not.toHaveBeenCalled();
      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });

    it.each([activatePromotion, pausePromotion])(
      "keeps deactivated promotions terminal",
      async (action) => {
        const promotion = buildPromotionRecord({
          id: 63,
          status: "DEACTIVATED",
        });
        models.Promotion.findByPk.mockResolvedValue(promotion);

        await expect(
          action({ actorUser: superadminActor, promotionId: 63 }),
        ).rejects.toThrow("Deactivated promotions cannot change status");

        expect(promotion.update).not.toHaveBeenCalled();
        expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
      },
    );

    it("rejects lifecycle actions for a missing promotion", async () => {
      models.Promotion.findByPk.mockResolvedValue(null);

      await expect(
        deactivatePromotion({
          actorUser: superadminActor,
          promotionId: 404,
        }),
      ).rejects.toThrow("Promotion not found");
    });
  });

  describe("assignment and unassignment rejection matrix", () => {
    it.each([assignPromotionCustomer, unassignPromotionCustomer])(
      "rejects an invalid customer ID before opening a transaction",
      async (action) => {
        await expect(
          action({
            actorUser: superadminActor,
            promotionId: 7,
            userId: 0,
          }),
        ).rejects.toThrow("Customer user ID is required");

        expect(sequelize.transaction).not.toHaveBeenCalled();
      },
    );

    it("rejects an invalid promotion ID", async () => {
      await expect(
        assignPromotionCustomer({
          actorUser: superadminActor,
          promotionId: "invalid",
          userId: 42,
        }),
      ).rejects.toThrow("Promotion ID is required");

      expect(models.Promotion.findByPk).not.toHaveBeenCalled();
    });

    it.each([assignPromotionCustomer, unassignPromotionCustomer])(
      "rejects a missing promotion",
      async (action) => {
        models.Promotion.findByPk.mockResolvedValue(null);

        await expect(
          action({
            actorUser: superadminActor,
            promotionId: 404,
            userId: 42,
          }),
        ).rejects.toThrow("Promotion not found");
      },
    );

    it.each([
      [
        assignPromotionCustomer,
        "Only personal promotions may be assigned to customers",
      ],
      [
        unassignPromotionCustomer,
        "Only personal promotions may be unassigned from customers",
      ],
    ])("rejects the wrong promotion kind", async (action, message) => {
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ kind: "GENERIC" }),
      );

      await expect(
        action({
          actorUser: superadminActor,
          promotionId: 7,
          userId: 42,
        }),
      ).rejects.toThrow(message);

      expect(models.PromotionAssignment.create).not.toHaveBeenCalled();
    });

    it("rejects assignment when the customer is missing", async () => {
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ kind: "PERSONAL", code: null }),
      );
      models.User.findOne.mockResolvedValue(null);

      await expect(
        assignPromotionCustomer({
          actorUser: superadminActor,
          promotionId: 7,
          userId: 404,
        }),
      ).rejects.toThrow("Customer account not found");
    });

    it("rejects a duplicate active assignment without rewriting history", async () => {
      const assignment = buildAssignmentRecord();
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ kind: "PERSONAL", code: null }),
      );
      models.User.findOne.mockResolvedValue(buildCustomerRecord());
      models.PromotionAssignment.findOne.mockResolvedValue(assignment);

      await expect(
        assignPromotionCustomer({
          actorUser: superadminActor,
          promotionId: 7,
          userId: 42,
        }),
      ).rejects.toThrow("Customer already has an active promotion assignment");

      expect(models.PromotionAssignment.create).not.toHaveBeenCalled();
      expect(assignment.update).not.toHaveBeenCalled();
      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });

    it("rejects unassignment when the customer is missing", async () => {
      const assignment = buildAssignmentRecord();
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ kind: "PERSONAL", code: null }),
      );
      models.PromotionAssignment.findOne.mockResolvedValue(assignment);
      models.User.findOne.mockResolvedValue(null);

      await expect(
        unassignPromotionCustomer({
          actorUser: superadminActor,
          promotionId: 7,
          userId: 42,
        }),
      ).rejects.toThrow("Customer account not found");

      expect(assignment.update).not.toHaveBeenCalled();
      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });

    it("rejects a missing active assignment without creating history", async () => {
      models.Promotion.findByPk.mockResolvedValue(
        buildPromotionRecord({ kind: "PERSONAL", code: null }),
      );
      models.PromotionAssignment.findOne.mockResolvedValue(null);

      await expect(
        unassignPromotionCustomer({
          actorUser: superadminActor,
          promotionId: 7,
          userId: 42,
        }),
      ).rejects.toThrow("Active promotion assignment not found");

      expect(models.PromotionAuditEvent.create).not.toHaveBeenCalled();
    });
  });
});
