import models from "./models/index.js";

// Define associations
models.Transaction.belongsTo(models.User, { foreignKey: "userId", as: "user" });
models.Transaction.belongsTo(models.Coupon, {
  foreignKey: "couponId",
  as: "coupon",
});
models.Transaction.belongsTo(models.Promotion, {
  foreignKey: "promotionId",
  as: "promotion",
});
models.Transaction.belongsTo(models.PromotionRedemption, {
  foreignKey: "promotionRedemptionId",
  as: "promotionRedemption",
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
models.Booking.hasMany(models.PromotionRedemption, {
  foreignKey: "bookingId",
  as: "promotionRedemptions",
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
models.CalendarEvent.belongsTo(models.User, {
  foreignKey: "createdByUserId",
  as: "createdByUser",
});
models.CalendarEvent.belongsTo(models.User, {
  foreignKey: "updatedByUserId",
  as: "updatedByUser",
});
models.CalendarEvent.belongsTo(models.User, {
  foreignKey: "cancelledByUserId",
  as: "cancelledByUser",
});

models.Expense.belongsTo(models.User, {
  foreignKey: "createdByUserId",
  as: "createdByUser",
});
models.Expense.belongsTo(models.User, {
  foreignKey: "updatedByUserId",
  as: "updatedByUser",
});
models.Expense.belongsTo(models.User, {
  foreignKey: "deletedByUserId",
  as: "deletedByUser",
});
models.Expense.hasMany(models.ExpenseAuditEvent, {
  foreignKey: "expenseId",
  as: "auditEvents",
});
models.ExpenseAuditEvent.belongsTo(models.Expense, {
  foreignKey: "expenseId",
  as: "expense",
});
models.ExpenseAuditEvent.belongsTo(models.User, {
  foreignKey: "actorUserId",
  as: "actorUser",
});

models.Promotion.belongsTo(models.User, {
  foreignKey: "createdByUserId",
  as: "createdByUser",
});
models.Promotion.belongsTo(models.User, {
  foreignKey: "updatedByUserId",
  as: "updatedByUser",
});
models.Promotion.hasMany(models.PromotionAssignment, {
  foreignKey: "promotionId",
  as: "assignments",
});
models.Promotion.hasMany(models.PromotionRedemption, {
  foreignKey: "promotionId",
  as: "redemptions",
});
models.Promotion.hasMany(models.PromotionAuditEvent, {
  foreignKey: "promotionId",
  as: "auditEvents",
});
models.Promotion.hasMany(models.Transaction, {
  foreignKey: "promotionId",
  as: "transactions",
});

models.PromotionAssignment.belongsTo(models.Promotion, {
  foreignKey: "promotionId",
  as: "promotion",
});
models.PromotionAssignment.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});
models.PromotionAssignment.belongsTo(models.User, {
  foreignKey: "assignedByUserId",
  as: "assignedByUser",
});
models.PromotionAssignment.belongsTo(models.User, {
  foreignKey: "unassignedByUserId",
  as: "unassignedByUser",
});
models.PromotionAssignment.hasMany(models.PromotionAuditEvent, {
  foreignKey: "promotionAssignmentId",
  as: "auditEvents",
});

models.PromotionRedemption.belongsTo(models.Promotion, {
  foreignKey: "promotionId",
  as: "promotion",
});
models.PromotionRedemption.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});
models.PromotionRedemption.belongsTo(models.Transaction, {
  foreignKey: "transactionId",
  as: "transaction",
});
models.PromotionRedemption.belongsTo(models.Booking, {
  foreignKey: "bookingId",
  as: "booking",
});

models.PromotionAuditEvent.belongsTo(models.Promotion, {
  foreignKey: "promotionId",
  as: "promotion",
});
models.PromotionAuditEvent.belongsTo(models.PromotionAssignment, {
  foreignKey: "promotionAssignmentId",
  as: "promotionAssignment",
});
models.PromotionAuditEvent.belongsTo(models.User, {
  foreignKey: "actorUserId",
  as: "actorUser",
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

models.PropertyShareLink.belongsTo(models.User, {
  foreignKey: "ownerUserId",
  as: "owner",
});
models.PropertyShareLink.belongsTo(models.Booking, {
  foreignKey: "singleBookingId",
  as: "singleBooking",
});
models.PropertyShareLink.hasMany(models.PropertyShareProperty, {
  foreignKey: "shareLinkId",
  as: "properties",
});
models.PropertyShareLink.hasMany(models.PropertyShareDailyView, {
  foreignKey: "shareLinkId",
  as: "dailyViews",
});
models.PropertyShareProperty.belongsTo(models.PropertyShareLink, {
  foreignKey: "shareLinkId",
  as: "shareLink",
});
models.PropertyShareProperty.belongsTo(models.Booking, {
  foreignKey: "bookingId",
  as: "booking",
});
models.PropertyShareProperty.hasMany(models.PropertyShareFile, {
  foreignKey: "sharePropertyId",
  as: "files",
});
models.PropertyShareFile.belongsTo(models.PropertyShareProperty, {
  foreignKey: "sharePropertyId",
  as: "property",
});
models.PropertyShareFile.belongsTo(models.BookingDeliveryFile, {
  foreignKey: "deliveryFileId",
  as: "deliveryFile",
});
models.PropertyShareFile.belongsTo(models.BookingDeliveryFileVersion, {
  foreignKey: "deliveryFileVersionId",
  as: "deliveryFileVersion",
});

models.PropertyShareDailyView.belongsTo(models.PropertyShareLink, {
  foreignKey: "shareLinkId",
  as: "shareLink",
});
models.PropertyShareListing.belongsTo(models.User, {
  foreignKey: "ownerUserId",
  as: "owner",
});
models.PropertyShareListing.belongsTo(models.Booking, {
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
models.User.hasMany(models.CalendarEvent, {
  foreignKey: "createdByUserId",
  as: "createdCalendarEvents",
});
models.User.hasMany(models.CalendarEvent, {
  foreignKey: "updatedByUserId",
  as: "updatedCalendarEvents",
});
models.User.hasMany(models.CalendarEvent, {
  foreignKey: "cancelledByUserId",
  as: "cancelledCalendarEvents",
});
models.User.hasMany(models.Expense, {
  foreignKey: "createdByUserId",
  as: "createdExpenses",
});
models.User.hasMany(models.Expense, {
  foreignKey: "updatedByUserId",
  as: "updatedExpenses",
});
models.User.hasMany(models.Expense, {
  foreignKey: "deletedByUserId",
  as: "deletedExpenses",
});
models.User.hasMany(models.ExpenseAuditEvent, {
  foreignKey: "actorUserId",
  as: "expenseAuditEvents",
});
models.User.hasMany(models.Promotion, {
  foreignKey: "createdByUserId",
  as: "createdPromotions",
});
models.User.hasMany(models.Promotion, {
  foreignKey: "updatedByUserId",
  as: "updatedPromotions",
});
models.User.hasMany(models.PromotionAssignment, {
  foreignKey: "userId",
  as: "promotionAssignments",
});
models.User.hasMany(models.PromotionAssignment, {
  foreignKey: "assignedByUserId",
  as: "assignedPromotionAssignments",
});
models.User.hasMany(models.PromotionAssignment, {
  foreignKey: "unassignedByUserId",
  as: "unassignedPromotionAssignments",
});
models.User.hasMany(models.PromotionRedemption, {
  foreignKey: "userId",
  as: "promotionRedemptions",
});
models.User.hasMany(models.PromotionAuditEvent, {
  foreignKey: "actorUserId",
  as: "promotionAuditEvents",
});
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
models.User.hasMany(models.PropertyShareLink, {
  foreignKey: "ownerUserId",
  as: "propertyShareLinks",
});
models.User.hasMany(models.PropertyShareListing, {
  foreignKey: "ownerUserId",
  as: "propertyShareListings",
});

models.Booking.hasMany(models.PropertyShareProperty, {
  foreignKey: "bookingId",
  as: "propertyShareMemberships",
});
models.Booking.hasOne(models.PropertyShareListing, {
  foreignKey: "bookingId",
  as: "propertyShareListing",
});
models.Booking.hasMany(models.PropertyShareLink, {
  foreignKey: "singleBookingId",
  as: "singlePropertyShareLinks",
});
models.BookingDeliveryFile.hasMany(models.PropertyShareFile, {
  foreignKey: "deliveryFileId",
  as: "propertyShareMemberships",
});
models.BookingDeliveryFileVersion.hasMany(models.PropertyShareFile, {
  foreignKey: "deliveryFileVersionId",
  as: "propertyShareMemberships",
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
models.Transaction.hasMany(models.PromotionRedemption, {
  foreignKey: "transactionId",
  as: "promotionRedemptions",
});

// Coupon has many transactions
models.Coupon.hasMany(models.Transaction, {
  foreignKey: "couponId",
  as: "transactions",
});
