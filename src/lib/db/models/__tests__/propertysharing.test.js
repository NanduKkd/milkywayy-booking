/** @jest-environment node */

import "../../relations";
import Booking from "../booking";
import BookingDeliveryFileVersion from "../bookingdeliveryfileversion";
import PropertyShareDailyView from "../propertysharedailyview";
import PropertyShareFile from "../propertysharefile";
import PropertyShareLink from "../propertysharelink";
import PropertyShareListing from "../propertysharelisting";
import PropertyShareProperty from "../propertyshareproperty";
import User from "../user";

describe("property sharing models", () => {
  it("maps hash-only links, listing configuration, snapshots, and aggregates", () => {
    expect(PropertyShareLink.tableName).toBe("property_share_links");
    expect(PropertyShareLink.rawAttributes.tokenDigest.field).toBe(
      "token_digest",
    );
    expect(PropertyShareLink.rawAttributes.token).toBeUndefined();
    expect(PropertyShareProperty.tableName).toBe("property_share_properties");
    expect(PropertyShareFile.rawAttributes.deliveryFileVersionId.field).toBe(
      "delivery_file_version_id",
    );
    expect(PropertyShareDailyView.rawAttributes.requestViews.field).toBe(
      "request_views",
    );
    expect(PropertyShareListing.tableName).toBe("property_share_listings");
    expect(PropertyShareListing.rawAttributes.listingTitle.field).toBe(
      "listing_title",
    );
    expect(PropertyShareListing.rawAttributes.priceAed.field).toBe("price_aed");
    expect(PropertyShareListing.rawAttributes.contactPhone.field).toBe(
      "contact_phone",
    );
    expect(PropertyShareListing.rawAttributes.agentUserId).toBeUndefined();
    expect(PropertyShareListing.rawAttributes.visitorName).toBeUndefined();
  });

  it("registers owner, booking, file-version, listing, and analytics relations", () => {
    expect(User.associations.propertyShareLinks.target).toBe(PropertyShareLink);
    expect(User.associations.propertyShareListings.target).toBe(
      PropertyShareListing,
    );
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
    expect(Booking.associations.propertyShareListing.target).toBe(
      PropertyShareListing,
    );
  });
});
