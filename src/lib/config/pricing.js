export const PROPERTY_TYPES = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  TOWNHOUSE: 'Townhouse/Penthouse',
  COMMERCIAL: 'Commercial'
};

export const SERVICES = {
  PHOTOGRAPHY: 'Photography',
  VIDEOGRAPHY: 'Videography',
  TOUR_360: '360° Tour'
};

export const PRICING_CONFIG = {
  [PROPERTY_TYPES.APARTMENT]: {
    sizes: [
      { label: 'Studio', prices: { [SERVICES.PHOTOGRAPHY]: 350, [SERVICES.VIDEOGRAPHY]: 400, [SERVICES.TOUR_360]: 450 } },
      { label: '1 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 450, [SERVICES.VIDEOGRAPHY]: 500, [SERVICES.TOUR_360]: 550 } },
      { label: '2 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 550, [SERVICES.VIDEOGRAPHY]: 600, [SERVICES.TOUR_360]: 650 } },
      { label: '3 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 650, [SERVICES.VIDEOGRAPHY]: 700, [SERVICES.TOUR_360]: 750 } },
      { label: '4 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 750, [SERVICES.VIDEOGRAPHY]: 800, [SERVICES.TOUR_360]: 850 } },
    ]
  },
  [PROPERTY_TYPES.VILLA]: {
    sizes: [
      { label: '3 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 800, [SERVICES.VIDEOGRAPHY]: 900, [SERVICES.TOUR_360]: 950 } },
      { label: '4 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 900, [SERVICES.VIDEOGRAPHY]: 1000, [SERVICES.TOUR_360]: 1050 } },
      { label: '5 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 1000, [SERVICES.VIDEOGRAPHY]: 1100, [SERVICES.TOUR_360]: 1150 } },
      { label: '6 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 1100, [SERVICES.VIDEOGRAPHY]: 1200, [SERVICES.TOUR_360]: 1250 } },
      { label: '7 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 1200, [SERVICES.VIDEOGRAPHY]: 1300, [SERVICES.TOUR_360]: 1350 } },
    ]
  },
  [PROPERTY_TYPES.TOWNHOUSE]: {
    sizes: [
      { label: '2 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 700, [SERVICES.VIDEOGRAPHY]: 750, [SERVICES.TOUR_360]: 800 } },
      { label: '3 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 800, [SERVICES.VIDEOGRAPHY]: 850, [SERVICES.TOUR_360]: 900 } },
      { label: '4 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 900, [SERVICES.VIDEOGRAPHY]: 950, [SERVICES.TOUR_360]: 1000 } },
      { label: '5 Bed', prices: { [SERVICES.PHOTOGRAPHY]: 1000, [SERVICES.VIDEOGRAPHY]: 1050, [SERVICES.TOUR_360]: 1100 } },
    ]
  },
  [PROPERTY_TYPES.COMMERCIAL]: {
    sizes: [
      { label: 'Under 500 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 500, [SERVICES.VIDEOGRAPHY]: 550, [SERVICES.TOUR_360]: 600 } },
      { label: '500 - 1,000 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 600, [SERVICES.VIDEOGRAPHY]: 650, [SERVICES.TOUR_360]: 700 } },
      { label: '1,000 - 2,000 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 700, [SERVICES.VIDEOGRAPHY]: 750, [SERVICES.TOUR_360]: 800 } },
      { label: '2,000 - 3,000 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 800, [SERVICES.VIDEOGRAPHY]: 850, [SERVICES.TOUR_360]: 900 } },
      { label: '3,000 - 5,000 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 900, [SERVICES.VIDEOGRAPHY]: 950, [SERVICES.TOUR_360]: 1000 } },
      { label: '5,000 - 7,500 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 1000, [SERVICES.VIDEOGRAPHY]: 1050, [SERVICES.TOUR_360]: 1100 } },
      { label: '7,500 - 10,000 sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 1100, [SERVICES.VIDEOGRAPHY]: 1150, [SERVICES.TOUR_360]: 1200 } },
      { label: '10,000+ sq. ft.', prices: { [SERVICES.PHOTOGRAPHY]: 1200, [SERVICES.VIDEOGRAPHY]: 1250, [SERVICES.TOUR_360]: 1300 } },
    ]
  }
};
