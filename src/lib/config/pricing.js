export const PROPERTY_TYPES = {
  APARTMENT: "Apartment",
  VILLA: "Villa/Townhouse",
  TOWNHOUSE: "Townhouse/Penthouse",
  COMMERCIAL: "Commercial",
};

export const SERVICES = {
  PHOTOGRAPHY: "Photography",
  VIDEOGRAPHY: "Videography",
  TOUR_360: "360° Tour",
};

export const VIDEOGRAPHY_SUB_SERVICES = {
  SHORT_FORM: "Short Form",
  LONG_FORM: "Long Form",
};

export const VIDEOGRAPHY_SUB_CATEGORIES = {
  LONG_FORM: {
    DAYLIGHT: "Daylight",
    NIGHT_LIGHT: "Night Light", 
    DAYLIGHT_NIGHT: "Daylight + Night",
  },
  [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
    DAYLIGHT: "Daylight",
    NIGHT_LIGHT: "Night Light",
    DAYLIGHT_NIGHT: "Daylight + Night",
  },
};

export const PROPERTY_TYPE_ORDER = [
  PROPERTY_TYPES.APARTMENT,
  PROPERTY_TYPES.VILLA,
  // PROPERTY_TYPES.TOWNHOUSE,
  PROPERTY_TYPES.COMMERCIAL,
];

export const SERVICE_ORDER = [
  SERVICES.PHOTOGRAPHY,
  SERVICES.VIDEOGRAPHY,
  SERVICES.TOUR_360,
];

export const VIDEOGRAPHY_SUB_SERVICE_ORDER = [
  VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
];

export const PRICING_CONFIG = {
  [PROPERTY_TYPES.APARTMENT]: {
    sizes: [
      {
        label: "Studio",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 350, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 400, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 600, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 800, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 1000, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 450,
        },
      },
      {
        label: "1 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 450, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 500, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 750, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1000, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 1250, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 550,
        },
      },
      {
        label: "2 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 550, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 600, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 900, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1200, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 1500, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 650,
        },
      },
      {
        label: "3 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 650, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 700, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1050, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1400, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 1750, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 750,
        },
      },
      {
        label: "4 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 750, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 800, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1200, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1600, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 2000, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 850,
        },
      },
      {
        label: "5 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 850, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 900, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1350, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1800, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 2250, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 950,
        },
      },
    ],
  },
  [PROPERTY_TYPES.VILLA]: {
    sizes: [
      {
        label: "2 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 700, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 800, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1200, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1600, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 2000, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 850,
        },
      },
      {
        label: "3 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 800, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 900, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1350, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 1800, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 2250, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 950,
        },
      },
      {
        label: "4 Bed",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 900, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1000, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1500, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 2000, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 2500, slots: 3, allowEvening: true },
            },
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
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1100, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1650, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 2200, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 2750, slots: 3, allowEvening: true },
            },
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
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1200, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1800, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 2400, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 3000, slots: 3, allowEvening: true },
            },
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
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1300, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT]: { price: 1950, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT]: { price: 2600, slots: 2, allowEvening: true },
              [VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT]: { price: 3250, slots: 3, allowEvening: true },
            },
          },
          [SERVICES.TOUR_360]: 1350,
        },
      },
    ],
  },
  [PROPERTY_TYPES.COMMERCIAL]: {
    sizes: [
      {
        label: "Basic",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 1800, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1100, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: { price: 2000, slots: 1, allowEvening: true },
          },
          [SERVICES.TOUR_360]: 1800,
        },
      },
      {
        label: "Essential",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 2200, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1500, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: { price: 2500, slots: 1, allowEvening: true },
          },
          [SERVICES.TOUR_360]: 2200,
        },
      },
      {
        label: "Premium",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 2600, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 1900, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: { price: 3000, slots: 1, allowEvening: true },
          },
          [SERVICES.TOUR_360]: 2600,
        },
      },
      {
        label: "Elite",
        prices: {
          [SERVICES.PHOTOGRAPHY]: { price: 3000, slots: 1, allowEvening: false },
          [SERVICES.VIDEOGRAPHY]: {
            [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: { price: 2300, slots: 1, allowEvening: false },
            [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: { price: 3500, slots: 1, allowEvening: true },
          },
          [SERVICES.TOUR_360]: 3000,
        },
      },
    ],
  },
};
