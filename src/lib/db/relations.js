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
