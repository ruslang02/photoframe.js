const {
  CITY_NAME,
  OWM_KEY,
  NODE_ENV,
  UPDATE_INTERVAL
} = process.env;

if(!CITY_NAME || !OWM_KEY)
  console.warn('Not enough data given for OpenWeatherMap. No weather will be available.');

export const cityName = CITY_NAME;
export const apiKey = OWM_KEY;
export const DEBUG = NODE_ENV === "development";
export const UPDATE_RATE = +UPDATE_INTERVAL || 60000;