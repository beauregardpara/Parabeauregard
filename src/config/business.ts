export const BUSINESS = {
  name: "Para BeauRegard",
  phoneDisplay: "06 63 48 82 87",
  phoneInternational: "+212663488287",
  email: "parabeauregard@gmail.com",
  city: "Casablanca",
  country: "Maroc",
  locationLabel: "Casablanca, Maroc",
  latitude: 33.6025816,
  longitude: -7.4822215,
} as const;

export const BUSINESS_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${BUSINESS.latitude},${BUSINESS.longitude}`;
