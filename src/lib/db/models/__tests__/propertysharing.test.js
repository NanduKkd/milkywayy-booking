/** @jest-environment node */

import "../../relations";
import Booking from "../booking";
import BookingDeliveryFileVersion from "../bookingdeliveryfileversion";
import PropertyShareContact from "../propertysharecontact";
import PropertyShareDailyView from "../propertysharedailyview";
import PropertyShareFile from "../propertysharefile";
import PropertyShareLink from "../propertysharelink";
import PropertyShareProperty from "../propertyshareproperty";
import User from "../user";

describe("property sharing models", () => {
  it("maps hash-only share, snapshot, aggregate, and contact fields", () => {
    expect(PropertyShareLink.tableName).toBe("property_share_links");
    expect(PropertyShareLink.rawAttributes.tokenDigest.field).toBe(
      "token_digest",
    );
    expect(PropertyShareLink.rawAttributes.token).toBeUndefined();
    expect(PropertyShareLink.rawAttributes.credentialVersion.field).toBe(
      "credential_version",
    );
    expect(PropertyShareProperty.tableName).toBe("property_share_properties");
    expect(PropertyShareFile.rawAttributes.deliveryFileVersionId.field).toBe(
      "delivery_file_version_id",
    );
    expect(PropertyShareDailyView.rawAttributes.requestViews.field).toBe(
      "request_views",
    );
    expect(PropertyShareContact.rawAttributes.expiresAt.field).toBe(
      "expires_at",
    );
    expect(PropertyShareContact.rawAttributes.email).toBeUndefined();
    expect(PropertyShareContact.rawAttributes.ipAddress).toBeUndefined();
  });

  it("registers owner, booking, file-version, analytics, and contact relations", () => {
    expect(User.associations.propertyShareLinks.target).toBe(PropertyShareLink);
    expect(PropertyShareLink.associations.properties.target).toBe(
      PropertyShareProperty,
    );
    expect(PropertyShareLink.associations.dailyViews.target).toBe(
      PropertyShareDailyView,
    );
    expect(PropertyShareProperty.associations.files.target).toBe(
      PropertyShareFile,
    );
    expect(PropertyShareProperty.associations.booking.target).toBe(Booking);
    expect(PropertyShareFile.associations.deliveryFileVersion.target).toBe(
      BookingDeliveryFileVersion,
    );
    expect(PropertyShareContact.associations.shareLink.target).toBe(
      PropertyShareLink,
    );
  });
});
