const { Op } = require("sequelize");

const {
  buildBookingsListResponse,
  buildDeliveryFilesListResponse,
  buildInvoicesListResponse,
  buildSequelizeCursorPagination,
  GptApiDtoValidationError,
  gptDeliveryFileDtoSchema,
  parseBookingsListQuery,
  parseFilesListQuery,
  parseInvoicesListQuery,
  serializeConnectedAccountDto,
  serializeDeliveryFileDto,
  serializeInvoiceDto,
  GPT_API_DEFAULT_PAGE_SIZE,
} = require("../dtos");

describe("GPT API DTO and pagination helpers", () => {
  it("parses bounded bookings filters and defaults the page size", () => {
    const query = parseBookingsListQuery(
      new URLSearchParams(
        "status=CONFIRMED&scheduledFrom=2026-05-01&scheduledTo=2026-05-31",
      ),
    );

    expect(query).toEqual({
      bookingCode: undefined,
      cursor: null,
      limit: GPT_API_DEFAULT_PAGE_SIZE,
      scheduledFrom: "2026-05-01",
      scheduledTo: "2026-05-31",
      status: "CONFIRMED",
      workflowStatus: undefined,
    });
  });

  it("rejects duplicate list query parameters", () => {
    expect(() =>
      parseBookingsListQuery(
        new URLSearchParams("status=CONFIRMED&status=CANCELLED"),
      ),
    ).toThrow(GptApiDtoValidationError);
  });

  it("rejects date ranges that exceed the bound", () => {
    expect(() =>
      parseInvoicesListQuery(
        new URLSearchParams(
          "paidFrom=2025-01-01&paidTo=2026-06-01&status=success",
        ),
      ),
    ).toThrow(GptApiDtoValidationError);
  });

  it("rejects malformed opaque cursors", () => {
    expect(() =>
      parseFilesListQuery(new URLSearchParams("cursor=not-a-real-cursor")),
    ).toThrow(GptApiDtoValidationError);
  });

  it("builds a stable descending Sequelize cursor clause", () => {
    const cursor = {
      id: 42,
      sortValue: "2026-06-29T08:00:00.000Z",
    };

    expect(buildSequelizeCursorPagination(cursor)).toEqual({
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      where: {
        [Op.or]: [
          {
            createdAt: {
              [Op.lt]: "2026-06-29T08:00:00.000Z",
            },
          },
          {
            createdAt: "2026-06-29T08:00:00.000Z",
            id: {
              [Op.lt]: 42,
            },
          },
        ],
      },
    });
  });

  it("serializes the connected account response without internal identifiers", () => {
    expect(
      serializeConnectedAccountDto({
        id: 91,
        accountType: "COMPANY",
        companyName: "Orbit Estates LLC",
        phone: "+971 50 123 4567",
        role: "customer",
      }),
    ).toEqual({
      account: {
        accountType: "COMPANY",
        displayName: "Orbit Estates LLC",
        phoneLast4: "4567",
      },
    });
  });

  it("keeps markup and control characters JSON-safe in serialized DTOs", () => {
    const response = serializeConnectedAccountDto({
      accountType: "COMPANY",
      companyName: 'Orbit <script>alert("x")</script>\nHoldings',
      phone: "+971 50 123 4567",
      role: "customer",
    });

    const json = JSON.stringify(response);

    expect(JSON.parse(json)).toEqual(response);
    expect(json).toContain('\\"x\\"');
    expect(json).toContain("\\n");
  });

  it("builds booking list responses with opaque next cursors", () => {
    const response = buildBookingsListResponse(
      [
        {
          id: 3,
          bookingCode: "MWB-1003",
          status: "CONFIRMED",
          workflowStatus: "FILES_UPLOADED",
          shootDetails: {
            services: ["Photography", "Videography", "Photography"],
          },
          propertyDetails: {
            propertyType: "Apartment",
            propertySize: "2BR",
            building: "Aurora Tower",
            community: "Dubai Marina",
            unitNumber: "1203",
          },
          date: "2026-06-15",
          startTime: "09:00",
          total: "525.00",
          createdAt: "2026-06-20T10:00:00.000Z",
          userId: 7,
          contactDetails: {
            email: "private@example.com",
          },
        },
        {
          id: 2,
          bookingCode: "MWB-1002",
          status: "COMPLETED",
          workflowStatus: "PROJECT_COMPLETED",
          shootDetails: {
            services: ["Photography"],
          },
          propertyDetails: {
            propertyType: "Villa",
            propertySize: "4BR",
            community: "Jumeirah Park",
          },
          date: "2026-06-10",
          startTime: "13:00",
          total: "700.00",
          createdAt: "2026-06-19T10:00:00.000Z",
        },
      ],
      1,
      (booking) => ({
        id: booking.id,
        sortValue: booking.createdAt,
      }),
    );

    expect(response.bookings).toHaveLength(1);
    expect(response.bookings[0]).toEqual({
      bookingCode: "MWB-1003",
      createdAt: "2026-06-20T10:00:00.000Z",
      currency: "AED",
      property: {
        building: "Aurora Tower",
        community: "Dubai Marina",
        locationLabel: "1203, Aurora Tower, Dubai Marina",
        propertySize: "2BR",
        propertyType: "Apartment",
        unitNumber: "1203",
      },
      scheduledDate: "2026-06-15",
      scheduledStartTime: "09:00",
      services: ["Photography", "Videography"],
      status: "CONFIRMED",
      totalAmount: 525,
      workflowStatus: "FILES_UPLOADED",
    });
    expect(response.pagination.hasMore).toBe(true);
    expect(typeof response.pagination.nextCursor).toBe("string");
  });

  it("serializes invoice metadata with a safe dashboard link only", () => {
    expect(
      serializeInvoiceDto({
        id: 55,
        invoiceNumber: "MW-2026-0629-003",
        status: "success",
        amount: "425.50",
        invoiceUrl: "https://bucket.example.com/invoices/file.pdf",
        createdAt: "2026-06-29T12:00:00.000Z",
        paidAt: "2026-06-29T12:05:00.000Z",
        bookings: [{ bookingCode: "MWB-1001" }, { bookingCode: "MWB-1002" }],
      }),
    ).toEqual({
      amount: 425.5,
      bookingCodes: ["MWB-1001", "MWB-1002"],
      createdAt: "2026-06-29T12:00:00.000Z",
      currency: "AED",
      invoiceNumber: "MW-2026-0629-003",
      paidAt: "2026-06-29T12:05:00.000Z",
      status: "success",
      websiteUrl: "/dashboard/invoices?invoiceNumber=MW-2026-0629-003",
    });
  });

  it("serializes delivery-file metadata without direct storage URLs", () => {
    expect(
      serializeDeliveryFileDto({
        id: 18,
        label: "Exterior photo set",
        type: "Photography",
        status: "UNDER_REVIEW",
        revisionCount: 1,
        reviewDeadlineAt: "2026-07-01T08:00:00.000Z",
        booking: {
          bookingCode: "MWB-1008",
        },
        currentVersion: {
          originalFilename: "front-elevation.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1048576,
          uploadedAt: "2026-06-29T09:00:00.000Z",
          url: "https://bucket.example.com/private/front-elevation.jpg",
        },
      }),
    ).toEqual({
      bookingCode: "MWB-1008",
      fileId: 18,
      fileName: "front-elevation.jpg",
      label: "Exterior photo set",
      mimeType: "image/jpeg",
      reviewDeadlineAt: "2026-07-01T08:00:00.000Z",
      revisionCount: 1,
      sizeBytes: 1048576,
      status: "UNDER_REVIEW",
      type: "Photography",
      uploadedAt: "2026-06-29T09:00:00.000Z",
      websiteUrl: "/dashboard/files",
    });
  });

  it("accepts only the generic dashboard files URL for delivery metadata", () => {
    const file = {
      bookingCode: "MWB-1008",
      fileId: 18,
      fileName: "front-elevation.jpg",
      label: "Exterior photo set",
      mimeType: "image/jpeg",
      reviewDeadlineAt: null,
      revisionCount: 0,
      sizeBytes: 1024,
      status: "UNDER_REVIEW",
      type: "Photography",
      uploadedAt: null,
    };

    expect(
      gptDeliveryFileDtoSchema.safeParse({
        ...file,
        websiteUrl: "/dashboard/files",
      }).success,
    ).toBe(true);
    expect(
      gptDeliveryFileDtoSchema.safeParse({
        ...file,
        websiteUrl: "/dashboard/files?fileId=18",
      }).success,
    ).toBe(false);
  });

  it("builds invoice and file list envelopes with validated pagination", () => {
    const invoiceResponse = buildInvoicesListResponse(
      [
        {
          id: 77,
          invoiceNumber: "MW-2026-0629-007",
          status: "success",
          amount: "300.00",
          createdAt: "2026-06-29T10:00:00.000Z",
          bookings: [{ bookingCode: "MWB-1100" }],
        },
      ],
      20,
      (invoice) => ({
        id: invoice.id,
        sortValue: invoice.createdAt,
      }),
    );

    const fileResponse = buildDeliveryFilesListResponse(
      [
        {
          id: 8,
          label: "Walkthrough video",
          type: "Videography",
          status: "ACCEPTED",
          revisionCount: 0,
          booking: { bookingCode: "MWB-1200" },
          currentVersion: {
            originalFilename: "walkthrough.mp4",
            mimeType: "video/mp4",
            sizeBytes: 5000,
            uploadedAt: "2026-06-29T11:00:00.000Z",
          },
          createdAt: "2026-06-29T11:00:00.000Z",
        },
      ],
      20,
      (file) => ({
        id: file.id,
        sortValue: file.createdAt,
      }),
    );

    expect(invoiceResponse.pagination).toEqual({
      hasMore: false,
      nextCursor: null,
    });
    expect(fileResponse.pagination).toEqual({
      hasMore: false,
      nextCursor: null,
    });
  });
});
