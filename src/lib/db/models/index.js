import { sequelize } from "../db.js";
import Booking from "./booking.js";
import BookingDeliveryFile from "./bookingdeliveryfile.js";
import BookingDeliveryFileVersion from "./bookingdeliveryfileversion.js";
import BookingDeliveryUpload from "./bookingdeliveryupload.js";
import BookingFileRevision from "./bookingfilerevision.js";
import BookingRevision from "./bookingrevision.js";
import Coupon from "./coupon.js";
import DynamicConfig from "./dynamicconfig.js";
import OAuthRateLimit from "./oauthratelimit.js";
import OurWork from "./ourwork.js";
import Review from "./review.js";
import Transaction from "./transaction.js";
import User from "./user.js";
import WalletTransaction from "./wallettransaction.js";

const models = {
  User,
  Booking,
  BookingDeliveryFile,
  BookingDeliveryFileVersion,
  BookingDeliveryUpload,
  BookingFileRevision,
  BookingRevision,
  Transaction,
  Coupon,
  WalletTransaction,
  DynamicConfig,
  OAuthRateLimit,
  OurWork,
  Review,
};

export {
  User,
  Booking,
  BookingDeliveryFile,
  BookingDeliveryFileVersion,
  BookingDeliveryUpload,
  BookingFileRevision,
  BookingRevision,
  Transaction,
  Coupon,
  WalletTransaction,
  DynamicConfig,
  OAuthRateLimit,
  OurWork,
  Review,
  sequelize,
};

export default models;
