import models from "./models/index.js";

// Define associations
models.Transaction.belongsTo(models.User, { foreignKey: "userId", as: "user" });
models.Transaction.belongsTo(models.Coupon, {
  foreignKey: "couponId",
  as: "coupon",
});

models.WalletTransaction.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

models.Booking.belongsTo(models.User, { foreignKey: "userId", as: "user" });
models.Booking.belongsTo(models.Transaction, {
  foreignKey: "transactionId",
  as: "transaction",
});
models.Booking.hasMany(models.BookingRevision, {
  foreignKey: "bookingId",
  as: "revisions",
});
models.Booking.hasMany(models.BookingDeliveryFile, {
  foreignKey: "bookingId",
  as: "deliveryFiles",
});
models.Booking.hasMany(models.BookingDeliveryUpload, {
  foreignKey: "bookingId",
  as: "deliveryUploads",
});
models.BookingDeliveryUpload.belongsTo(models.Booking, {
  foreignKey: "bookingId",
  as: "booking",
});
models.BookingDeliveryFile.belongsTo(models.Booking, {
  foreignKey: "bookingId",
  as: "booking",
});
models.BookingDeliveryFile.hasMany(models.BookingDeliveryFileVersion, {
  foreignKey: "deliveryFileId",
  as: "versions",
});
models.BookingDeliveryFileVersion.belongsTo(models.BookingDeliveryFile, {
  foreignKey: "deliveryFileId",
  as: "deliveryFile",
});
models.BookingDeliveryFile.belongsTo(models.BookingDeliveryFileVersion, {
  foreignKey: "currentVersionId",
  as: "currentVersion",
  constraints: false,
});
models.BookingDeliveryFile.hasMany(models.BookingFileRevision, {
  foreignKey: "deliveryFileId",
  as: "fileRevisions",
});
models.BookingFileRevision.belongsTo(models.BookingDeliveryFile, {
  foreignKey: "deliveryFileId",
  as: "deliveryFile",
});
models.BookingFileRevision.belongsTo(models.BookingDeliveryFileVersion, {
  foreignKey: "versionId",
  as: "version",
});
models.BookingFileRevision.belongsTo(models.BookingDeliveryFileVersion, {
  foreignKey: "replacementVersionId",
  as: "replacementVersion",
});
models.BookingRevision.belongsTo(models.Booking, {
  foreignKey: "bookingId",
  as: "booking",
});

// User has many transactions, wallet transactions, and bookings
models.User.hasMany(models.Transaction, {
  foreignKey: "userId",
  as: "transactions",
});
models.User.hasMany(models.WalletTransaction, {
  foreignKey: "userId",
  as: "walletTransactions",
});
models.User.hasMany(models.Booking, { foreignKey: "userId", as: "bookings" });

// Transaction has many bookings
models.Transaction.hasMany(models.Booking, {
  foreignKey: "transactionId",
  as: "bookings",
});

// Coupon has many transactions
models.Coupon.hasMany(models.Transaction, {
  foreignKey: "couponId",
  as: "transactions",
});
