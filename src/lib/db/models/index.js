import { sequelize } from "../db.js";
import Booking from "./booking.js";
import BookingDeliveryFile from "./bookingdeliveryfile.js";
import BookingDeliveryFileVersion from "./bookingdeliveryfileversion.js";
import BookingDeliveryUpload from "./bookingdeliveryupload.js";
import BookingFileRevision from "./bookingfilerevision.js";
import BookingRevision from "./bookingrevision.js";
import CalendarEvent from "./calendarevent.js";
import Coupon from "./coupon.js";
import DynamicConfig from "./dynamicconfig.js";
import Expense from "./expense.js";
import ExpenseAuditEvent from "./expenseauditevent.js";
import OAuthAccessToken from "./oauthaccesstoken.js";
import OAuthAuditEvent from "./oauthauditevent.js";
import OAuthAuthorizationCode from "./oauthauthorizationcode.js";
import OAuthClient from "./oauthclient.js";
import OAuthConsent from "./oauthconsent.js";
import OAuthRateLimit from "./oauthratelimit.js";
import OAuthRefreshToken from "./oauthrefreshtoken.js";
import OurWork from "./ourwork.js";
import Promotion from "./promotion.js";
import PromotionAssignment from "./promotionassignment.js";
import PromotionAuditEvent from "./promotionauditevent.js";
import PromotionRedemption from "./promotionredemption.js";
import PropertyShareLink from "./propertysharelink.js";
import PropertyShareListing from "./propertysharelisting.js";
import PropertyShareMedia from "./propertysharemedia.js";
import PropertyShareProperty from "./propertyshareproperty.js";
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
  CalendarEvent,
  Transaction,
  Coupon,
  WalletTransaction,
  DynamicConfig,
  Expense,
  ExpenseAuditEvent,
  Promotion,
  PromotionAssignment,
  PromotionRedemption,
  PromotionAuditEvent,
  PropertyShareLink,
  PropertyShareMedia,
  PropertyShareProperty,
  PropertyShareListing,
  OAuthClient,
  OAuthAuthorizationCode,
  OAuthAccessToken,
  OAuthRefreshToken,
  OAuthConsent,
  OAuthAuditEvent,
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
  CalendarEvent,
  Transaction,
  Coupon,
  WalletTransaction,
  DynamicConfig,
  Expense,
  ExpenseAuditEvent,
  Promotion,
  PromotionAssignment,
  PromotionRedemption,
  PromotionAuditEvent,
  PropertyShareLink,
  PropertyShareMedia,
  PropertyShareProperty,
  PropertyShareListing,
  OAuthClient,
  OAuthAuthorizationCode,
  OAuthAccessToken,
  OAuthRefreshToken,
  OAuthConsent,
  OAuthAuditEvent,
  OAuthRateLimit,
  OurWork,
  Review,
  sequelize,
};

export default models;
