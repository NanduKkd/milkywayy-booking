/** @jest-environment node */

import "../../relations";
import Booking from "../booking";
import PropertyShareLink from "../propertysharelink";
import PropertyShareListing from "../propertysharelisting";
import PropertyShareMedia from "../propertysharemedia";
import PropertyShareProperty from "../propertyshareproperty";
import User from "../user";

describe("property sharing models", () => {
  it("maps stable public links, listing configuration, and selected properties", () => {
    expect(PropertyShareLink.tableName).toBe("property_share_links");
    expect(PropertyShareLink.rawAttributes.publicId.field).toBe("public_id");
    expect(PropertyShareLink.rawAttributes.publicId.type._length).toBe(43);
    expect(PropertyShareLink.rawAttributes.tokenDigest).toBeUndefined();
    expect(PropertyShareLink.rawAttributes.revokedAt).toBeUndefined();
    expect(PropertyShareLink.rawAttributes.lastViewedAt).toBeUndefined();
    expect(PropertyShareProperty.tableName).toBe("property_share_properties");
    expect(PropertyShareMedia.tableName).toBe("property_share_media");
    expect(PropertyShareMedia.rawAttributes.deliveryFileVersionId.field).toBe(
      "delivery_file_version_id",
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

  it("registers owner, booking, property, and listing relations", () => {
    expect(User.associations.propertyShareLinks.target).toBe(PropertyShareLink);
    expect(User.associations.propertyShareListings.target).toBe(
      PropertyShareListing,
    );
    expect(PropertyShareLink.associations.properties.target).toBe(
      PropertyShareProperty,
    );
    expect(PropertyShareProperty.associations.booking.target).toBe(Booking);
    expect(PropertyShareLink.associations.dailyViews).toBeUndefined();
    expect(PropertyShareProperty.associations.files.target).toBe(
      PropertyShareMedia,
    );
    expect(PropertyShareMedia.associations.deliveryFile.target).toBeDefined();
    expect(
      PropertyShareMedia.associations.deliveryFileVersion.target,
    ).toBeDefined();
    expect(Booking.associations.propertyShareListing.target).toBe(
      PropertyShareListing,
    );
  });
});
