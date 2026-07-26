import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareListing = sequelize.define(
  "PropertyShareListing",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "owner_user_id",
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "booking_id",
    },
    listingTitle: {
      type: DataTypes.STRING(160),
      allowNull: false,
      field: "listing_title",
    },
    priceAed: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      field: "price_aed",
    },
    listingType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: "listing_type",
    },
    propertyType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "APARTMENT",
      field: "property_type",
    },
    bathrooms: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: true,
    },
    maidRoom: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "maid_room",
    },
    sizeSqft: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "size_sqft",
    },
    builtUpAreaSqft: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "built_up_area_sqft",
    },
    plotAreaSqft: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "plot_area_sqft",
    },
    furnishing: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    highlights: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    contactName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "contact_name",
    },
    contactPhone: {
      type: DataTypes.STRING(16),
      allowNull: false,
      field: "contact_phone",
    },
  },
  {
    tableName: "property_share_listings",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareListing;
