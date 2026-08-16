import { Building, Building2, Camera, Globe, Home, Video } from "lucide-react";

export const TIER_PACKAGE_DETAILS = {
  Basic: {
    photos: "Up to 15",
    reel: "30\u201345s",
    walkthrough: "Not included",
    tour: "Not included",
  },
  Essential: {
    photos: "Up to 20",
    reel: "45\u201360s",
    walkthrough: "3\u20135 mins",
    tour: "8\u201310 hotspots",
  },
  Premium: {
    photos: "Up to 30",
    reel: "60\u201375s",
    walkthrough: "5\u201310 mins",
    tour: "Up to 15 hotspots",
  },
  Elite: {
    photos: "Up to 40",
    reel: "60\u201390s",
    walkthrough: "8\u201315 mins",
    tour: "Up to 20 hotspots",
  },
};

export const SERVICE_ICONS = {
  Photography: Camera,
  Videography: Video,
  "360\u00B0 Tour": Globe,
};

export const PROPERTY_TYPE_ICONS = {
  Apartment: Building2,
  Villa: Home,
  "Townhouse/Penthouse": Home,
  "Villa/Townhouse": Home,
  Commercial: Building,
};

export const PROPERTY_TYPE_META = {
  Apartment: {
    label: "Apartment",
    mobileLabel: "Apartment",
    description: "Apartments & studios",
  },
  "Villa/Townhouse": {
    label: "Villa / Townhouse",
    mobileLabel: "Villa/TH",
    description: "Villas, townhouses & penthouses",
  },
  Villa: {
    label: "Villa",
    mobileLabel: "Villa",
    description: "Standalone villas",
  },
  "Townhouse/Penthouse": {
    label: "Townhouse / Penthouse",
    mobileLabel: "TH / Penthouse",
    description: "Townhouses & penthouses",
  },
  Commercial: {
    label: "Commercial",
    mobileLabel: "Commercial",
    description: "Offices, retail & warehouses",
  },
};

export const SERVICE_SUBTITLES = {
  Videography: "Choose Options Below",
};

export const SERVICE_ESTIMATES = {
  Photography: "24h",
  Videography: "24-48h",
  "360\u00B0 Tour": "48-72h",
};

export const VIDEOGRAPHY_OPTION_META = {
  shortForm: {
    title: "Short Form",
    subtitle: "Social Media Reels",
    delivery: "24-48h",
  },
  longForm: {
    title: "Long Form",
    subtitle: "YouTube Walkthrough",
    delivery: "48-72h",
  },
};

export const LIGHTING_OPTION_ICONS = {
  Daylight: "\u2600",
  "Night Light": "\u263E",
  "Daylight + Night": "\u25CC",
};

export const COMMERCIAL_SERVICE_AVAILABILITY = {
  Basic: ["Photography", "Videography"],
  Essential: ["Photography", "Videography", "360\u00B0 Tour"],
  Premium: ["Photography", "Videography", "360\u00B0 Tour"],
  Elite: ["Photography", "Videography", "360\u00B0 Tour"],
};
