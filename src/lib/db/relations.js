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

models.OAuthAuthorizationCode.belongsTo(models.OAuthClient, {
  foreignKey: "clientId",
  as: "client",
});
models.OAuthAuthorizationCode.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

models.OAuthAccessToken.belongsTo(models.OAuthClient, {
  foreignKey: "clientId",
  as: "client",
});
models.OAuthAccessToken.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

models.OAuthRefreshToken.belongsTo(models.OAuthClient, {
  foreignKey: "clientId",
  as: "client",
});
models.OAuthRefreshToken.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});
models.OAuthRefreshToken.belongsTo(models.OAuthRefreshToken, {
  foreignKey: "parentTokenId",
  as: "parentToken",
});
models.OAuthRefreshToken.hasMany(models.OAuthRefreshToken, {
  foreignKey: "parentTokenId",
  as: "childTokens",
});

models.OAuthConsent.belongsTo(models.OAuthClient, {
  foreignKey: "clientId",
  as: "client",
});
models.OAuthConsent.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

models.OAuthAuditEvent.belongsTo(models.OAuthClient, {
  foreignKey: "clientId",
  as: "client",
});
models.OAuthAuditEvent.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
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
models.User.hasMany(models.OAuthAuthorizationCode, {
  foreignKey: "userId",
  as: "oauthAuthorizationCodes",
});
models.User.hasMany(models.OAuthAccessToken, {
  foreignKey: "userId",
  as: "oauthAccessTokens",
});
models.User.hasMany(models.OAuthRefreshToken, {
  foreignKey: "userId",
  as: "oauthRefreshTokens",
});
models.User.hasMany(models.OAuthConsent, {
  foreignKey: "userId",
  as: "oauthConsents",
});
models.User.hasMany(models.OAuthAuditEvent, {
  foreignKey: "userId",
  as: "oauthAuditEvents",
});

models.OAuthClient.hasMany(models.OAuthAuthorizationCode, {
  foreignKey: "clientId",
  as: "authorizationCodes",
});
models.OAuthClient.hasMany(models.OAuthAccessToken, {
  foreignKey: "clientId",
  as: "accessTokens",
});
models.OAuthClient.hasMany(models.OAuthRefreshToken, {
  foreignKey: "clientId",
  as: "refreshTokens",
});
models.OAuthClient.hasMany(models.OAuthConsent, {
  foreignKey: "clientId",
  as: "consents",
});
models.OAuthClient.hasMany(models.OAuthAuditEvent, {
  foreignKey: "clientId",
  as: "auditEvents",
});

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
