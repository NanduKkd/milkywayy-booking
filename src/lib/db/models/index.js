import User from "./user.js";
import Booking from "./booking.js";
import Transaction from "./transaction.js";
import Coupon from "./coupon.js";
import WalletTransaction from "./wallettransaction.js";
import DynamicConfig from "./dynamicconfig.js";
import { sequelize } from "../db.js";

const models = {
  User,
  Booking,
  Transaction,
  Coupon,
  WalletTransaction,
  DynamicConfig,
};

export {
  User,
  Booking,
  Transaction,
  Coupon,
  WalletTransaction,
  DynamicConfig,
  sequelize,
};

export default models;
