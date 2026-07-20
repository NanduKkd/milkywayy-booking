/** @jest-environment node */

const { QueryTypes } = require("sequelize");
const {
  createDisposablePostgresDatabase,
} = require("../../db/testing/disposablePostgres");
const {
  applyPromotionPostgresSchema,
} = require("../../db/testing/promotionPostgresSchema");

jest.setTimeout(30000);

describe("promotion checkout and payment lifecycle with disposable PostgreSQL", () => {
  const originalDbEnvironment = Object.fromEntries(
    ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"].map((name) => [
      name,
      process.env[name],
    ]),
  );
  const lifecycleNow = new Date("2026-07-21T10:00:00.000Z");
  let database;
  let appSequelize;
  let models;
  let evaluateCheckoutPromotionPricing;
  let reservePromotionForCheckoutTransaction;
  let releasePromotionForCheckoutTransaction;
  let expirePromotionForCheckoutTransaction;
  let finalizePaidPromotionCheckoutTransaction;
  let buildTransactionPaymentSummary;
  let buildInvoiceDiscountSummaries;
  let calculateWalletCreditPreview;
  let fixtureSequence = 0;

  function replaceApplicationDatabaseEnvironment(environment) {
    for (const [name, value] of Object.entries(environment)) {
      if (value == null) delete process.env[name];
      else process.env[name] = value;
    }
  }

  async function createUser() {
    const [row] = await database.sequelize.query(
      `INSERT INTO users (created_at, updated_at)
       VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      { type: QueryTypes.INSERT },
    );
    return Number(row[0].id);
  }

  async function createBooking(userId, total = 100.01) {
    return models.Booking.create({
      userId,
      total,
      status: "DRAFT",
      shootDetails: { services: ["Photography"] },
      propertyDetails: { type: "Apartment", size: "1 Bed" },
    });
  }

  async function createPromotion(overrides = {}) {
    fixtureSequence += 1;
    return models.Promotion.create({
      kind: "GENERIC",
      code: `LIFE-${fixtureSequence}`,
      name: `Lifecycle promotion ${fixtureSequence}`,
      benefitType: "FIXED",
      benefitValue: 12.34,
      minimumSpend: 0,
      status: "ACTIVE",
      triggerType: "NONE",
      triggerConfig: {},
      ...overrides,
    });
  }

  function createFakeStripe({ failure = null } = {}) {
    const create = jest.fn(async (_payload) => {
      if (failure) throw failure;
      return {
        id: "cs_test_promotion_lifecycle",
        url: "https://stripe.test/session",
      };
    });
    return { checkout: { sessions: { create } } };
  }

  async function beginCheckout({
    userId,
    booking,
    enteredCode,
    selectedPromotion = null,
    now = lifecycleNow,
    expiresAt = new Date(lifecycleNow.getTime() + 60 * 60 * 1000),
  }) {
    const pricing = await evaluateCheckoutPromotionPricing({
      userId,
      eligibleSubtotal: booking.total,
      enteredCode,
      now,
    });
    const selection = selectedPromotion || pricing.selectedPromotion;
    const payableAmount = Number(
      (Number(booking.total) - Number(selection?.benefitAmount || 0)).toFixed(
        2,
      ),
    );
    const transaction = await models.Transaction.create({
      userId,
      amount: payableAmount,
      status: "pending",
      metadata: { bookingIds: [booking.id] },
    });
    await booking.update({ transactionId: transaction.id });
    if (selection) {
      await reservePromotionForCheckoutTransaction({
        transactionId: transaction.id,
        userId,
        bookingIds: [booking.id],
        enteredCode,
        eligibleSubtotal: booking.total,
        selectedPromotion: selection,
        reservationExpiresAt: expiresAt,
        now,
        transaction: null,
      });
    }
    return { pricing, selection, payableAmount, transaction };
  }

  beforeAll(async () => {
    database = await createDisposablePostgresDatabase({
      databaseLabel: "promotion_checkout_lifecycle",
      setup: applyPromotionPostgresSchema,
    });
    replaceApplicationDatabaseEnvironment(
      database.applicationDatabaseEnvironment,
    );
    jest.resetModules();
    appSequelize = require("../../db/db").sequelize;
    database.registerConnection(appSequelize);
    require("../../db/relations");
    models = require("../../db/models").default;
    ({ evaluateCheckoutPromotionPricing } = require("../promotionPricing"));
    ({
      reservePromotionForCheckoutTransaction,
      releasePromotionForCheckoutTransaction,
      expirePromotionForCheckoutTransaction,
      finalizePaidPromotionCheckoutTransaction,
    } = require("../promotionCheckout"));
    ({
      buildTransactionPaymentSummary,
    } = require("../../helpers/transactionPricing"));
    ({ buildInvoiceDiscountSummaries } = require("../../helpers/invoice"));
    ({
      calculateWalletCreditPreview,
    } = require("../../helpers/promotionPricing"));
    await appSequelize.authenticate();
  });

  afterAll(async () => {
    try {
      await database?.close();
    } finally {
      replaceApplicationDatabaseEnvironment(originalDbEnvironment);
      jest.resetModules();
    }
  });

  beforeEach(async () => {
    fixtureSequence = 0;
    await database.sequelize.query(`
      TRUNCATE TABLE promotion_audit_events, promotion_assignments,
        promotion_redemptions, bookings, promotions, transactions, users
      RESTART IDENTITY CASCADE
    `);
  });

  it("persists generic checkout through Stripe payload, payment, invoice, and immutable snapshot in cents", async () => {
    const userId = await createUser();
    const booking = await createBooking(userId, 100.01);
    const promotion = await createPromotion({ code: "CENT-1234" });
    const fakeStripe = createFakeStripe();
    const walletPreview = calculateWalletCreditPreview(
      [{ isActive: true, type: "wallet", percentage: 10, maxDiscount: 25 }],
      100.01,
    );

    const checkout = await beginCheckout({
      userId,
      booking,
      enteredCode: promotion.code,
    });
    const session = await fakeStripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aed",
            unit_amount: Math.round(checkout.payableAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { transactionId: String(checkout.transaction.id) },
    });
    await checkout.transaction.update({ stripePaymentIntentId: session.id });
    const finalized = await finalizePaidPromotionCheckoutTransaction({
      transactionId: checkout.transaction.id,
      stripePaymentIntentId: "pi_test_promotion_lifecycle",
      paidAt: lifecycleNow,
    });

    const transaction = await models.Transaction.findByPk(
      checkout.transaction.id,
    );
    const redemption = await models.PromotionRedemption.findByPk(
      transaction.promotionRedemptionId,
    );
    await booking.reload();
    const paymentSummary = buildTransactionPaymentSummary(transaction, [
      { amount: booking.total },
    ]);
    const invoiceRows = buildInvoiceDiscountSummaries(transaction);

    expect(finalized.alreadyFinalized).toBe(false);
    expect(fakeStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 8767 }),
          }),
        ],
      }),
    );
    expect({
      transactionCents: Math.round(Number(transaction.amount) * 100),
      stripeCents: 8767,
      snapshotCents: Math.round(
        Number(transaction.promotionSnapshot.benefitAmount) * 100,
      ),
      redemptionCents: Math.round(Number(redemption.benefitAmount) * 100),
      invoiceCents: Math.round(Number(invoiceRows[0].amount) * 100),
    }).toEqual({
      transactionCents: 8767,
      stripeCents: 8767,
      snapshotCents: 1234,
      redemptionCents: 1234,
      invoiceCents: 1234,
    });
    expect(paymentSummary).toMatchObject({
      subtotal: 100.01,
      totalPaidAmount: 87.67,
      promotion: { amount: 12.34, code: "CENT-1234" },
    });
    expect(booking.status).toBe("CONFIRMED");
    expect(redemption.state).toBe("APPLIED");
    expect(walletPreview.amount).toBe(10.001);
    expect(checkout.selection.promotionId).toBe(promotion.id);

    await promotion.update({ name: "Changed after payment", benefitValue: 99 });
    await transaction.reload();
    expect(transaction.promotionSnapshot).toMatchObject({
      name: "Lifecycle promotion 1",
      benefitAmount: 12.34,
    });
    console.info(
      "[promotion-lifecycle] transaction=1 redemption=1 snapshot=immutable cents=8767/1234",
    );
  });

  it("revalidates stale previews when eligibility changes before reservation", async () => {
    const cases = [
      {
        name: "paused",
        mutate: (promotion) => promotion.update({ status: "PAUSED" }),
      },
      {
        name: "deactivated",
        mutate: (promotion) => promotion.update({ status: "DEACTIVATED" }),
      },
      {
        name: "expired window",
        mutate: (promotion) =>
          promotion.update({ endsAt: new Date(lifecycleNow.getTime() - 1) }),
      },
      {
        name: "limit exhausted",
        mutate: async (promotion, userId) => {
          const otherTransaction = await models.Transaction.create({
            userId,
            amount: 1,
            status: "pending",
          });
          await models.PromotionRedemption.create({
            promotionId: promotion.id,
            userId,
            transactionId: otherTransaction.id,
            eligibleSubtotal: 1,
            benefitAmount: 1,
            benefitTypeSnapshot: "FIXED",
            triggerSnapshot: {},
            state: "RESERVED",
            reservedAt: lifecycleNow,
          });
        },
        promotion: { totalLimit: 1 },
      },
      {
        name: "first booking trigger changed",
        mutate: async (_promotion, userId) => {
          const paidTransaction = await models.Transaction.create({
            userId,
            amount: 1,
            status: "success",
          });
          await models.Booking.create({
            userId,
            transactionId: paidTransaction.id,
            total: 1,
            status: "CONFIRMED",
          });
        },
        promotion: {
          kind: "AUTOMATIC",
          code: null,
          triggerType: "FIRST_PAID_BOOKING",
        },
      },
      {
        name: "personal assignment removed",
        setup: async (promotion, userId) =>
          models.PromotionAssignment.create({
            promotionId: promotion.id,
            userId,
            assignedAt: lifecycleNow,
          }),
        mutate: async (promotion, userId) =>
          models.PromotionAssignment.update(
            { unassignedAt: lifecycleNow },
            {
              where: { promotionId: promotion.id, userId, unassignedAt: null },
            },
          ),
        promotion: { kind: "PERSONAL", code: null },
      },
    ];

    for (const scenario of cases) {
      await database.sequelize.query(
        `TRUNCATE TABLE promotion_audit_events, promotion_assignments, promotion_redemptions, bookings, promotions, transactions, users RESTART IDENTITY CASCADE`,
      );
      const userId = await createUser();
      const booking = await createBooking(userId);
      const promotion = await createPromotion(scenario.promotion);
      await scenario.setup?.(promotion, userId);
      const preview = await evaluateCheckoutPromotionPricing({
        userId,
        eligibleSubtotal: booking.total,
        enteredCode: promotion.code,
        now: lifecycleNow,
      });
      expect(preview.selectedPromotion?.promotionId).toBe(promotion.id);
      await scenario.mutate(promotion, userId);
      const transaction = await models.Transaction.create({
        userId,
        amount: 87.67,
        status: "pending",
      });
      await expect(
        reservePromotionForCheckoutTransaction({
          transactionId: transaction.id,
          userId,
          bookingIds: [booking.id],
          enteredCode: promotion.code,
          eligibleSubtotal: booking.total,
          selectedPromotion: preview.selectedPromotion,
          now: lifecycleNow,
        }),
      ).rejects.toThrow("Promotion is no longer eligible for checkout");
      expect(
        await models.PromotionRedemption.count({
          where: { transactionId: transaction.id },
        }),
      ).toBe(0);
      console.info(
        `[promotion-lifecycle] stale-preview=${scenario.name} rejected`,
      );
    }
  });

  it("keeps generic, personal, automatic, and wallet calculations separate", async () => {
    const userId = await createUser();
    const automatic = await createPromotion({
      kind: "AUTOMATIC",
      code: null,
      benefitValue: 5,
      priority: 20,
      triggerType: "FIRST_PAID_BOOKING",
    });
    const personal = await createPromotion({
      kind: "PERSONAL",
      code: null,
      benefitValue: 8,
      priority: 1,
    });
    const generic = await createPromotion({ code: "BETTER?", benefitValue: 7 });
    await models.PromotionAssignment.create({
      promotionId: personal.id,
      userId,
      assignedAt: lifecycleNow,
    });

    const pricing = await evaluateCheckoutPromotionPricing({
      userId,
      eligibleSubtotal: 100,
      enteredCode: generic.code,
      now: lifecycleNow,
    });
    const wallet = calculateWalletCreditPreview(
      [{ isActive: true, type: "wallet", percentage: 50, maxDiscount: 20 }],
      100,
    );

    expect(pricing.selectedPromotion).toMatchObject({
      promotionId: personal.id,
      kind: "PERSONAL",
      benefitAmount: 8,
    });
    expect(pricing.codeValidation).toMatchObject({ status: "SUPERSEDED" });
    expect(pricing.evaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ promotionId: automatic.id, eligible: true }),
        expect.objectContaining({ promotionId: personal.id, eligible: true }),
        expect.objectContaining({ promotionId: generic.id, eligible: true }),
      ]),
    );
    expect(wallet.amount).toBe(20);
  });

  it("releases failed or cancelled sessions and expires timed-out sessions exactly once", async () => {
    const userId = await createUser();
    const booking = await createBooking(userId);
    const promotion = await createPromotion();
    const checkout = await beginCheckout({
      userId,
      booking,
      enteredCode: promotion.code,
    });
    const fakeStripe = createFakeStripe({
      failure: new Error("synthetic Stripe create failure"),
    });
    await expect(fakeStripe.checkout.sessions.create({})).rejects.toThrow(
      "synthetic Stripe create failure",
    );
    await releasePromotionForCheckoutTransaction({
      transactionId: checkout.transaction.id,
      reason: "checkout_session_create_failed",
      now: lifecycleNow,
    });
    await releasePromotionForCheckoutTransaction({
      transactionId: checkout.transaction.id,
      reason: "checkout_cancelled",
      now: new Date(lifecycleNow.getTime() + 1),
    });
    const failedTransaction = await models.Transaction.findByPk(
      checkout.transaction.id,
    );
    const released = await models.PromotionRedemption.findByPk(
      failedTransaction.promotionRedemptionId,
    );
    expect(released).toMatchObject({
      state: "RELEASED",
      releaseReason: "checkout_session_create_failed",
    });

    const expiryBooking = await createBooking(userId);
    const expiryCheckout = await beginCheckout({
      userId,
      booking: expiryBooking,
      enteredCode: promotion.code,
    });
    await expirePromotionForCheckoutTransaction({
      transactionId: expiryCheckout.transaction.id,
      now: lifecycleNow,
    });
    await expirePromotionForCheckoutTransaction({
      transactionId: expiryCheckout.transaction.id,
      now: new Date(lifecycleNow.getTime() + 1),
    });
    const expiredTransaction = await models.Transaction.findByPk(
      expiryCheckout.transaction.id,
    );
    const expired = await models.PromotionRedemption.findByPk(
      expiredTransaction.promotionRedemptionId,
    );
    expect(expired).toMatchObject({
      state: "EXPIRED",
      releaseReason: "expired",
    });
  });

  it("applies paid reconciliation and duplicate webhook replay only once", async () => {
    const userId = await createUser();
    const booking = await createBooking(userId);
    const promotion = await createPromotion();
    const checkout = await beginCheckout({
      userId,
      booking,
      enteredCode: promotion.code,
    });
    const first = await finalizePaidPromotionCheckoutTransaction({
      transactionId: checkout.transaction.id,
      paidAt: lifecycleNow,
    });
    const replay = await finalizePaidPromotionCheckoutTransaction({
      transactionId: checkout.transaction.id,
      paidAt: new Date(lifecycleNow.getTime() + 1000),
    });
    const transaction = await models.Transaction.findByPk(
      checkout.transaction.id,
    );
    const redemption = await models.PromotionRedemption.findByPk(
      transaction.promotionRedemptionId,
    );
    await booking.reload();

    expect(first.alreadyFinalized).toBe(false);
    expect(replay.alreadyFinalized).toBe(true);
    expect(redemption.state).toBe("APPLIED");
    expect(redemption.appliedAt).toEqual(lifecycleNow);
    expect(booking.status).toBe("CONFIRMED");
    console.info(
      "[promotion-lifecycle] paid-reconciliation=applied webhook-replay=idempotent",
    );
  });

  it("rolls back a failed webhook reconciliation so a later retry can finalize once", async () => {
    const userId = await createUser();
    const booking = await createBooking(userId);
    const promotion = await createPromotion();
    const checkout = await beginCheckout({
      userId,
      booking,
      enteredCode: promotion.code,
    });

    await expect(
      appSequelize.transaction(async (transaction) => {
        await finalizePaidPromotionCheckoutTransaction({
          transactionId: checkout.transaction.id,
          paidAt: lifecycleNow,
          transaction,
        });
        throw new Error("synthetic webhook worker failure");
      }),
    ).rejects.toThrow("synthetic webhook worker failure");

    let transaction = await models.Transaction.findByPk(
      checkout.transaction.id,
    );
    let redemption = await models.PromotionRedemption.findByPk(
      transaction.promotionRedemptionId,
    );
    await booking.reload();
    expect(transaction.status).toBe("pending");
    expect(redemption.state).toBe("RESERVED");
    expect(booking.status).toBe("DRAFT");

    await finalizePaidPromotionCheckoutTransaction({
      transactionId: checkout.transaction.id,
      paidAt: lifecycleNow,
    });
    transaction = await models.Transaction.findByPk(checkout.transaction.id);
    redemption = await models.PromotionRedemption.findByPk(
      transaction.promotionRedemptionId,
    );
    await booking.reload();
    expect(transaction.status).toBe("success");
    expect(redemption.state).toBe("APPLIED");
    expect(booking.status).toBe("CONFIRMED");
  });
});
