/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("bookings", "delivery_finished_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn(
      "bookings",
      "delivery_notification_metadata",
      {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    );

    await queryInterface.createTable("booking_delivery_files", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "bookings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.STRING, allowNull: false },
      label: { type: Sequelize.STRING, allowNull: false },
      delivery_mode: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "download",
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "UNDER_REVIEW",
      },
      revision_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      review_deadline_at: { type: Sequelize.DATE, allowNull: true },
      current_version_id: { type: Sequelize.INTEGER, allowNull: true },
      accepted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("booking_delivery_file_versions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      delivery_file_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "booking_delivery_files", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      version_number: { type: Sequelize.INTEGER, allowNull: false },
      url: { type: Sequelize.TEXT, allowNull: false },
      original_filename: { type: Sequelize.STRING, allowNull: true },
      mime_type: { type: Sequelize.STRING, allowNull: true },
      size_bytes: { type: Sequelize.BIGINT, allowNull: true },
      uploaded_at: { type: Sequelize.DATE, allowNull: false },
      superseded_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("booking_file_revisions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      delivery_file_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "booking_delivery_files", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      version_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "booking_delivery_file_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      request_number: { type: Sequelize.INTEGER, allowNull: false },
      note: { type: Sequelize.TEXT, allowNull: false },
      requested_at: { type: Sequelize.DATE, allowNull: false },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      replacement_version_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "booking_delivery_file_versions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addConstraint("booking_delivery_files", {
      fields: ["current_version_id"],
      type: "foreign key",
      name: "booking_delivery_files_current_version_fk",
      references: {
        table: "booking_delivery_file_versions",
        field: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addConstraint("booking_delivery_file_versions", {
      fields: ["delivery_file_id", "version_number"],
      type: "unique",
      name: "booking_delivery_file_versions_number_unique",
    });
    await queryInterface.addIndex("booking_delivery_files", [
      "booking_id",
      "status",
    ]);
    await queryInterface.addIndex("booking_delivery_files", [
      "review_deadline_at",
    ]);
    await queryInterface.addIndex("booking_file_revisions", [
      "delivery_file_id",
      "resolved_at",
    ]);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX booking_file_revisions_request_unique
      ON booking_file_revisions (delivery_file_id, request_number)
      WHERE request_number > 0
    `);

    const bookings = await queryInterface.sequelize.query(
      `SELECT id, workflow_status, completed_at, files_uploaded_at,
              review_deadline_at, revision_count, files_url
       FROM bookings
       WHERE files_url IS NOT NULL AND BTRIM(files_url) <> ''`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const activeLegacyRevisions = await queryInterface.sequelize.query(
      `SELECT DISTINCT ON (booking_id) booking_id, note, requested_at
       FROM booking_revisions
       WHERE resolved_at IS NULL
       ORDER BY booking_id, requested_at DESC`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    const legacyRevisionByBooking = new Map(
      activeLegacyRevisions.map((item) => [Number(item.booking_id), item]),
    );

    const normalizeItems = (value) => {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.deliverables)) return parsed.deliverables;
        if (parsed && typeof parsed === "object") return [];
        return [{ type: "Files", label: "Files", url: String(parsed) }];
      } catch {
        return [{ type: "Files", label: "Files", url: value }];
      }
    };
    const getArchivedItems = (value) => {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed?.archivedDeliverables)
          ? parsed.archivedDeliverables
          : [];
      } catch {
        return [];
      }
    };
    const itemUrls = (item) =>
      Array.isArray(item?.urls) && item.urls.length > 0
        ? item.urls.filter(Boolean)
        : item?.url
          ? [item.url]
          : [];
    const filenameFromUrl = (url) => {
      try {
        return decodeURIComponent(
          new URL(url).pathname.split("/").filter(Boolean).pop() || "",
        );
      } catch {
        return null;
      }
    };

    for (const booking of bookings) {
      const activeLegacy = legacyRevisionByBooking.get(Number(booking.id));
      const currentItems = normalizeItems(booking.files_url);
      const archivedItems = getArchivedItems(booking.files_url);
      const sourceItems =
        activeLegacy && currentItems.flatMap(itemUrls).length === 0
          ? archivedItems
          : currentItems;
      const isCompleted =
        booking.workflow_status === "PROJECT_COMPLETED" ||
        Boolean(booking.completed_at);
      const isUnderReview = booking.workflow_status === "FILES_UPLOADED";
      const isActiveLegacyRevision = Boolean(activeLegacy);
      const now = new Date();

      if (isUnderReview || isCompleted) {
        await queryInterface.sequelize.query(
          `UPDATE bookings
           SET delivery_finished_at = COALESCE(completed_at, files_uploaded_at, updated_at)
           WHERE id = :bookingId`,
          { replacements: { bookingId: booking.id } },
        );
      }

      const currentUrls = new Set();
      for (const item of sourceItems) {
        for (const url of itemUrls(item)) {
          currentUrls.add(url);
          const status = isCompleted
            ? "ACCEPTED"
            : isActiveLegacyRevision
              ? "CHANGES_REQUESTED"
              : isUnderReview
                ? "UNDER_REVIEW"
                : "PRIVATE";
          const [fileRows] = await queryInterface.sequelize.query(
            `INSERT INTO booking_delivery_files
              (booking_id, type, label, delivery_mode, status, revision_count,
               review_deadline_at, accepted_at, created_at, updated_at)
             VALUES
              (:bookingId, :type, :label, :deliveryMode, :status, 0,
               :deadline, :acceptedAt, :createdAt, :createdAt)
             RETURNING id`,
            {
              replacements: {
                bookingId: booking.id,
                type: String(item?.type || item?.label || "Files"),
                label: String(item?.label || item?.type || "Files"),
                deliveryMode: item?.deliveryMode || "download",
                status,
                deadline:
                  status === "UNDER_REVIEW" ? booking.review_deadline_at : null,
                acceptedAt: status === "ACCEPTED" ? booking.completed_at : null,
                createdAt:
                  item?.uploadedAt ||
                  booking.files_uploaded_at ||
                  booking.completed_at ||
                  now,
              },
            },
          );
          const deliveryFileId = fileRows[0].id;
          const [versionRows] = await queryInterface.sequelize.query(
            `INSERT INTO booking_delivery_file_versions
              (delivery_file_id, version_number, url, original_filename,
               uploaded_at, created_at, updated_at)
             VALUES
              (:deliveryFileId, 1, :url, :filename, :uploadedAt, :uploadedAt, :uploadedAt)
             RETURNING id`,
            {
              replacements: {
                deliveryFileId,
                url,
                filename: filenameFromUrl(url),
                uploadedAt:
                  item?.uploadedAt ||
                  booking.files_uploaded_at ||
                  booking.completed_at ||
                  now,
              },
            },
          );
          const versionId = versionRows[0].id;
          await queryInterface.sequelize.query(
            `UPDATE booking_delivery_files
             SET current_version_id = :versionId
             WHERE id = :deliveryFileId`,
            { replacements: { versionId, deliveryFileId } },
          );
          if (isActiveLegacyRevision) {
            await queryInterface.sequelize.query(
              `INSERT INTO booking_file_revisions
                (delivery_file_id, version_id, request_number, note,
                 requested_at, created_at, updated_at)
               VALUES
                (:deliveryFileId, :versionId, 0, :note,
                 :requestedAt, :requestedAt, :requestedAt)`,
              {
                replacements: {
                  deliveryFileId,
                  versionId,
                  note: activeLegacy.note,
                  requestedAt: activeLegacy.requested_at || now,
                },
              },
            );
          }
        }
      }

      for (const item of archivedItems) {
        for (const url of itemUrls(item)) {
          if (currentUrls.has(url)) continue;
          const [fileRows] = await queryInterface.sequelize.query(
            `INSERT INTO booking_delivery_files
              (booking_id, type, label, delivery_mode, status, revision_count,
               deleted_at, created_at, updated_at)
             VALUES
              (:bookingId, :type, :label, :deliveryMode, 'PRIVATE', 0,
               :now, :now, :now)
             RETURNING id`,
            {
              replacements: {
                bookingId: booking.id,
                type: String(item?.type || item?.label || "Files"),
                label: String(item?.label || item?.type || "Files"),
                deliveryMode: item?.deliveryMode || "download",
                now,
              },
            },
          );
          const deliveryFileId = fileRows[0].id;
          const [versionRows] = await queryInterface.sequelize.query(
            `INSERT INTO booking_delivery_file_versions
              (delivery_file_id, version_number, url, original_filename,
               uploaded_at, superseded_at, created_at, updated_at)
             VALUES
              (:deliveryFileId, 1, :url, :filename, :now, :now, :now, :now)
             RETURNING id`,
            {
              replacements: {
                deliveryFileId,
                url,
                filename: filenameFromUrl(url),
                now,
              },
            },
          );
          await queryInterface.sequelize.query(
            `UPDATE booking_delivery_files
             SET current_version_id = :versionId
             WHERE id = :deliveryFileId`,
            {
              replacements: {
                versionId: versionRows[0].id,
                deliveryFileId,
              },
            },
          );
        }
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("booking_file_revisions");
    await queryInterface.removeConstraint(
      "booking_delivery_files",
      "booking_delivery_files_current_version_fk",
    );
    await queryInterface.dropTable("booking_delivery_file_versions");
    await queryInterface.dropTable("booking_delivery_files");
    await queryInterface.removeColumn(
      "bookings",
      "delivery_notification_metadata",
    );
    await queryInterface.removeColumn("bookings", "delivery_finished_at");
  },
};
