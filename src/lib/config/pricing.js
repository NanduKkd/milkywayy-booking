export const PROPERTY_TYPES = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  TOWNHOUSE: "Townhouse/Penthouse",
  COMMERCIAL: "Commercial",
};

export const SERVICES = {
  PHOTOGRAPHY: "Photography",
  VIDEOGRAPHY: "Videography",
  TOUR_360: "360° Tour",
};

export const PROPERTY_TYPE_ORDER = [
  PROPERTY_TYPES.APARTMENT,
  PROPERTY_TYPES.VILLA,
  PROPERTY_TYPES.TOWNHOUSE,
  PROPERTY_TYPES.COMMERCIAL,
];

export const SERVICE_ORDER = [
  SERVICES.PHOTOGRAPHY,
  SERVICES.VIDEOGRAPHY,
  SERVICES.TOUR_360,
];

export const PRICING_CONFIG = {
  [PROPERTY_TYPES.APARTMENT]: {
    sizes: [
      {
        label: "Studio",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 350, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 400, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 450,
        },
      },
      {
        label: "1 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 450, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 500, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 550,
        },
      },
      {
        label: "2 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 550, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 600, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 650,
        },
      },
      {
        label: "3 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 650, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 700, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 750,
        },
      },
      {
        label: "4 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 750, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 800, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 850,
        },
      },
    ],
  },
  [PROPERTY_TYPES.VILLA]: {
    sizes: [
      {
        label: "3 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 800, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 900, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 950,
        },
      },
      {
        label: "4 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 900, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1000,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1050,
        },
      },
      {
        label: "5 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1000,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1100,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1150,
        },
      },
      {
        label: "6 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1100,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1200,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1250,
        },
      },
      {
        label: "7 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1200,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1300,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1350,
        },
      },
    ],
  },
  [PROPERTY_TYPES.TOWNHOUSE]: {
    sizes: [
      {
        label: "2 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 700, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 750, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 800,
        },
      },
      {
        label: "3 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 800, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 850, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 900,
        },
      },
      {
        label: "4 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 900, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 950, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 1000,
        },
      },
      {
        label: "5 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1000,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1050,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1100,
        },
      },
    ],
  },
  [PROPERTY_TYPES.COMMERCIAL]: {
    sizes: [
      {
        label: "Under 500 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 500, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 550, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 600,
        },
      },
      {
        label: "500 - 1,000 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 600, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 650, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 700,
        },
      },
      {
        label: "1,000 - 2,000 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 700, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 750, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 800,
        },
      },
      {
        label: "2,000 - 3,000 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 800, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 850, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 900,
        },
      },
      {
        label: "3,000 - 5,000 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 900, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: { price: 950, slots: 1, allowEvening: false },
          [SERVICES.TOUR_360]: 1000,
        },
      },
      {
        label: "5,000 - 7,500 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1000,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1050,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1100,
        },
      },
      {
        label: "7,500 - 10,000 sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1100,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1150,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1200,
        },
      },
      {
        label: "10,000+ sq. ft.",
        prices: {
          [SERVICES.PHOTOGRAPHY]: {
            price: 1200,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.VIDEOGRAPHY]: {
            price: 1250,
            slots: 1,
            allowEvening: false,
          },
          [SERVICES.TOUR_360]: 1300,
        },
      },
    ],
  },
};
