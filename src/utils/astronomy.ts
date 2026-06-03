import SunCalc from 'suncalc';
import { LocationPreset, PrayerTime, SunDetails, AdhanConvention, AdhanConventionDetails } from '../types';

// Let's define the precise Adhan conventions
export const CONVENTIONS: AdhanConventionDetails[] = [
  {
    id: 'Morocco',
    name: 'Morocco (Ministry of Habous)',
    fajrAngle: 19.0, // Fajr is at -19° altitude
    ishaAngle: 17.0, // Isha is at -17° altitude
    description: 'Ministry of Habous and Islamic Affairs of Morocco standard calculations (highly accurate for Casablanca, Rabat, Marrakech).'
  },
  {
    id: 'MWL',
    name: 'Muslim World League',
    fajrAngle: 18.0,
    ishaAngle: 17.0,
    description: 'Standard convention used globally in Europe, Far East, and parts of America.'
  },
  {
    id: 'ISNA',
    name: 'ISNA (North America)',
    fajrAngle: 15.0,
    ishaAngle: 15.0,
    description: 'Islamic Society of North America. Often used in USA and Canada.'
  },
  {
    id: 'Egypt',
    name: 'Egyptian General Authority',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    description: 'Egyptian General Authority of Survey. Used in Egypt, parts of Africa & Middle East.'
  },
  {
    id: 'UmmAlQura',
    name: 'Umm Al-Qura (Mecca)',
    fajrAngle: 18.5,
    ishaAngle: 90, // Meaning "90 minutes after Maghrib"
    description: 'Umm Al-Qura University, Makkah. Used in Saudi Arabia. Isha is fixed at 90 min after Maghrib.'
  }
];

// Presets for locations around the globe with a focus on Morocco and educational variety
export const LOCATION_PRESETS: LocationPreset[] = [
  {
    name: 'Casablanca (Dar al-Beida)',
    country: 'Morocco',
    latitude: 33.5731,
    longitude: -7.5898,
    timezone: 'UTC+1',
    utcOffset: 1,
    description: 'Economic capital of Morocco. Target for precise Adhan timing requests.'
  },
  {
    name: 'Rabat',
    country: 'Morocco',
    latitude: 34.0209,
    longitude: -6.8416,
    timezone: 'UTC+1',
    utcOffset: 1,
    description: 'Capital of Morocco. Known for the Hassan Tower and ancient ruins.'
  },
  {
    name: 'Marrakech',
    country: 'Morocco',
    latitude: 31.6295,
    longitude: -7.9811,
    timezone: 'UTC+1',
    utcOffset: 1,
    description: 'The Red City, lying near the foothills of the snow-capped Atlas Mountains.'
  },
  {
    name: 'Mecca (Makkah)',
    country: 'Saudi Arabia',
    latitude: 21.3891,
    longitude: 39.8579,
    timezone: 'UTC+3',
    utcOffset: 3,
    description: 'The holiest city in Islam. Center-point for Qibla and Umm Al-Qura calculations.'
  },
  {
    name: 'Cairo',
    country: 'Egypt',
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'UTC+3',
    utcOffset: 3,
    description: 'Capital of Egypt. Used for the Egyptian General Authority algorithm.'
  },
  {
    name: 'Quito',
    country: 'Ecuador',
    latitude: -0.1807,
    longitude: -78.4678,
    timezone: 'UTC-5',
    utcOffset: -5,
    description: 'Exactly on the equator. High-altitude sun path goes straight overhead!'
  },
  {
    name: 'London',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'UTC+1',
    utcOffset: 1,
    description: 'High-latitude European city showing dramatic seasonal shifts in sun path.'
  },
  {
    name: 'Reykjavik',
    country: 'Iceland',
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: 'UTC+0',
    utcOffset: 0,
    description: 'Sub-arctic city with midnight sun in June and perpetual dark winters.'
  },
  {
    name: 'Tromsø',
    country: 'Norway',
    latitude: 69.6492,
    longitude: 18.9553,
    timezone: 'UTC+2',
    utcOffset: 2,
    description: 'Located inside the Arctic Circle. Undergoes total polar night.'
  },
  {
    name: 'New York',
    country: 'United States',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'UTC-4',
    utcOffset: -4,
    description: 'Mid-latitude East coast city with classic seasonal solstices.'
  },
  {
    name: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'UTC+9',
    utcOffset: 9,
    description: 'Land of the Rising Sun. High eastern longitude experiences sunrise early.'
  },
  {
    name: 'Sydney',
    country: 'Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: 'UTC+10',
    utcOffset: 10,
    description: 'Southern hemisphere. Seasons are perfectly inverted (Summer in December).'
  }
];

/**
 * High-Precision J2000 Solar Coordinates calculations
 * Returns declination (degrees), right ascension (hours), and obliquity (degrees)
 */
export function getSolarCoordinates(date: Date) {
  const msInDay = 86400000;
  const julianDate = (date.getTime() / msInDay) + 2440587.5;
  const d = julianDate - 2451545.0; // Days since J2000.0
  
  // Mean anomaly of the Sun (radians)
  const g = (357.529 + 0.98560028 * d) * Math.PI / 180;
  // Mean longitude of the Sun (radians)
  const q = (280.459 + 0.98564736 * d) * Math.PI / 180;
  // Ecliptic longitude of the Sun (radians)
  const L = (280.47 + 0.98565 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI / 180;
  
  // Obliquity of the ecliptic (radians)
  const e = (23.439 - 0.00000036 * d) * Math.PI / 180;
  
  // Right ascension in radians
  let RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  if (RA < 0) RA += 2 * Math.PI;
  
  // Declination in radians
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  
  return {
    declination: dec * 180 / Math.PI, // degrees
    rightAscension: (RA * 180 / Math.PI) / 15, // hours
    obliquity: e * 180 / Math.PI
  };
}

/**
 * Calculates transit (noon) and hour angle to find precise time when Sun is at a specific altitude.
 * targetAltitudeDeg is positive above the horizon, negative below.
 */
export function getTimeForSolarAltitude(
  date: Date,
  lat: number,
  lng: number,
  targetAltitudeDeg: number,
  isMorning: boolean
): Date | null {
  try {
    // 1. Get solar noon for this date and location using SunCalc
    const times = SunCalc.getTimes(date, lat, lng);
    const noonTime = times.solarNoon;
    if (!noonTime || isNaN(noonTime.getTime())) return null;
    
    // 2. Get solar coordinates at noon
    const { declination } = getSolarCoordinates(noonTime);
    
    // 3. Convert degrees to radians
    const alpha = targetAltitudeDeg * Math.PI / 180;
    const phi = lat * Math.PI / 180;
    const delta = declination * Math.PI / 180;
    
    // 4. Calculate cos(HourAngle) using fundamental spherical trigonometry:
    // sin(alpha) = sin(phi)*sin(delta) + cos(phi)*cos(delta)*cos(H)
    // cos(H) = (sin(alpha) - sin(phi)*sin(delta)) / (cos(phi)*cos(delta))
    const numerator = Math.sin(alpha) - Math.sin(phi) * Math.sin(delta);
    const denominator = Math.cos(phi) * Math.cos(delta);
    
    if (Math.abs(denominator) < 1e-9) {
      return null; // Polar conditions
    }
    
    const cosH = numerator / denominator;
    
    if (cosH < -1.0) {
      // The sun never goes below this altitude on this day (midnight sun/perpetual light)
      return null;
    }
    if (cosH > 1.0) {
      // The sun never goes above this altitude on this day (polar night/perpetual dark)
      return null;
    }
    
    const H = Math.acos(cosH) * 180 / Math.PI; // in degrees
    const diffHours = H / 15.0; // 15 degrees per hour of Earth's spin
    
    const diffMs = diffHours * 60 * 60 * 1000;
    
    if (isMorning) {
      return new Date(noonTime.getTime() - diffMs);
    } else {
      return new Date(noonTime.getTime() + diffMs);
    }
  } catch (error) {
    console.error("Error in getTimeForSolarAltitude", error);
    return null;
  }
}

/**
 * Calculates Asr Solar Altitude based on standard or Hanafi shadow rules.
 * Standard (Maliki/Shafi/Hanbali): Shadow of an object is equal to its length + shadow at solar noon.
 * Hanafi: Shadow of an object is equal to twice its length + shadow at solar noon.
 */
export function getAsrAltitudeDeg(lat: number, declinationDeg: number, isHanafi: boolean = false): number {
  const phi = lat * Math.PI / 180;
  const delta = declinationDeg * Math.PI / 180;
  
  // Solar noon altitude: alphaNoon = PI/2 - abs(phi - delta)
  const alphaNoon = Math.PI / 2 - Math.abs(phi - delta);
  
  // If solar noon altitude is 0 or less, shadow length is infinite
  if (alphaNoon <= 0) return 0;
  
  // Shadow length at noon: shadowNoon = cot(alphaNoon)
  const shadowNoon = 1.0 / Math.tan(alphaNoon);
  
  // Target shadow at Asr
  const shadowAsr = (isHanafi ? 2.0 : 1.0) + shadowNoon;
  
  // Target solar altitude at Asr: alphaAsr = arccot(shadowAsr)
  const alphaAsr = Math.atan(1.0 / shadowAsr);
  
  return alphaAsr * 180 / Math.PI; // in degrees
}

/**
 * Formats a Date object specifically shifted by standard timezone offset
 * to bypass any local browser timezone conversion discrepancies.
 */
export function formatTimeInTimezone(utcDate: Date | null, utcOffsetHours: number): string {
  if (!utcDate || isNaN(utcDate.getTime())) return '--:--';
  const shifted = new Date(utcDate.getTime() + utcOffsetHours * 60 * 60 * 1000);
  const hrs = shifted.getUTCHours().toString().padStart(2, '0');
  const mins = shifted.getUTCMinutes().toString().padStart(2, '0');
  return `${hrs}:${mins}`;
}

/**
 * Returns complete prayer times list with associated solar altitudes and metadata
 */
export function calculatePrayerTimes(
  date: Date,
  lat: number,
  lng: number,
  conventionId: AdhanConvention,
  utcOffset: number,
  isHanafi: boolean = false
): PrayerTime[] {
  const convention = CONVENTIONS.find(c => c.id === conventionId) || CONVENTIONS[0];
  const results: PrayerTime[] = [];
  
  // 1. Solar Noon (Dhuhr)
  const times = SunCalc.getTimes(date, lat, lng);
  const dhuhrTime = times.solarNoon;
  const dhuhrPosition = SunCalc.getPosition(dhuhrTime || date, lat, lng);
  const dhuhrAltitude = dhuhrPosition.altitude * 180 / Math.PI;
  
  // 2. Fajr (Dawn)
  const fajrTime = getTimeForSolarAltitude(date, lat, lng, -convention.fajrAngle, true);
  
  // 3. Shorooq (Sunrise)
  // Astronomical definition of sunrise: sun centers at -0.833°
  const shorooqTime = getTimeForSolarAltitude(date, lat, lng, -0.833, true) || times.sunrise;
  
  // 4. Asr (Afternoon)
  const { declination } = getSolarCoordinates(dhuhrTime || date);
  const asrAltitude = getAsrAltitudeDeg(lat, declination, isHanafi);
  const asrTime = getTimeForSolarAltitude(date, lat, lng, asrAltitude, false);
  
  // 5. Maghrib (Sunset)
  const maghribTime = getTimeForSolarAltitude(date, lat, lng, -0.833, false) || times.sunset;
  
  // 6. Isha (Night)
  let ishaTime: Date | null = null;
  if (convention.id === 'UmmAlQura') {
    // Isha is strictly 90 minutes after Maghrib
    if (maghribTime) {
      ishaTime = new Date(maghribTime.getTime() + 90 * 60 * 1000);
    }
  } else {
    ishaTime = getTimeForSolarAltitude(date, lat, lng, -convention.ishaAngle, false);
  }
  
  const formattedTime = (d: Date | null) => {
    return formatTimeInTimezone(d, utcOffset);
  };
  
  // Default fallback safe values (avoid mutating selected base date)
  const getFallbackTime = (hours: number, minutes: number) => {
    const fallback = new Date(date.getTime());
    fallback.setUTCHours(hours - utcOffset, minutes, 0, 0);
    return fallback;
  };

  // Push in chronological order: Fajr -> Shorooq -> Dhuhr -> Asr -> Maghrib -> Isha
  results.push({
    id: 'fajr',
    name: 'Fajr',
    arabicName: 'الفجر',
    time: formattedTime(fajrTime),
    timestamp: fajrTime || getFallbackTime(5, 0),
    sunAltitude: -convention.fajrAngle,
    definition: `Sun is exactly ${convention.fajrAngle}° below horizon at dawn.`
  });
  
  results.push({
    id: 'shorooq',
    name: 'Sunrise',
    arabicName: 'الشروق',
    time: formattedTime(shorooqTime),
    timestamp: shorooqTime || getFallbackTime(6, 30),
    sunAltitude: -0.833,
    definition: 'Upper limb of the Sun touches the eastern horizon ($\theta = -0.833^\circ$).'
  });
  
  results.push({
    id: 'dhuhr',
    name: 'Dhuhr',
    arabicName: 'الظهر',
    time: formattedTime(dhuhrTime),
    timestamp: dhuhrTime || getFallbackTime(12, 30),
    sunAltitude: dhuhrAltitude,
    definition: 'Sun reaches its transit point (meridian crossing) at highest daily altitude.'
  });
  
  results.push({
    id: 'asr',
    name: 'Asr',
    arabicName: 'العصر',
    time: formattedTime(asrTime),
    timestamp: asrTime || getFallbackTime(15, 45),
    sunAltitude: asrAltitude,
    definition: `Shadow length is object height + ${isHanafi ? '2x' : '1x'} noon shadow (θ ≈ ${asrAltitude.toFixed(1)}°).`
  });
  
  results.push({
    id: 'maghrib',
    name: 'Maghrib',
    arabicName: 'المغرب',
    time: formattedTime(maghribTime),
    timestamp: maghribTime || getFallbackTime(19, 0),
    sunAltitude: -0.833,
    definition: 'Upper limb of the Sun sinks below the western horizon ($\theta = -0.833^\circ$).'
  });
  
  const ishaAltitude = convention.id === 'UmmAlQura' 
    ? (ishaTime ? (SunCalc.getPosition(ishaTime, lat, lng).altitude * 180 / Math.PI) : -18.5)
    : -convention.ishaAngle;
    
  results.push({
    id: 'isha',
    name: 'Isha',
    arabicName: 'العشاء',
    time: formattedTime(ishaTime),
    timestamp: ishaTime || getFallbackTime(20, 30),
    sunAltitude: ishaAltitude,
    definition: convention.id === 'UmmAlQura'
      ? 'Fixed at 90 minutes after Maghrib (Sunset).'
      : `Sun is exactly ${convention.ishaAngle}° below horizon at dusk.`
  });
  
  return results;
}

/**
 * Formats SunCalc's raw getPosition data to high accuracy SunDetails structure
 */
export function getSunDetailsForTime(date: Date, lat: number, lng: number): SunDetails {
  const sunPos = SunCalc.getPosition(date, lat, lng);
  const { declination, rightAscension } = getSolarCoordinates(date);
  
  // Convert azimuth from SunCalc format (0 at South, increases Westwards)
  // to Standard Meteorlogical Format (0 at North, 90 East, 180 South, 270 West)
  let azDeg = (sunPos.azimuth * 180 / Math.PI) + 180;
  azDeg = (azDeg + 360) % 360;
  
  // Calculate approximate distance to Sun in Astronomical Units (AU)
  // Earth-Sun distance varies between 0.983 AU and 1.017 AU over the year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const day = diff / (1000 * 60 * 60 * 24);
  // Gregorian winter solstice is around Dec 21, perihelion is early January (around day ~3)
  const angle = (2 * Math.PI / 365) * (day - 3);
  const distance = 1.00014 - 0.01671 * Math.cos(angle); // Simple Keplerian approximation
  
  return {
    altitude: sunPos.altitude * 180 / Math.PI,
    azimuth: azDeg,
    declination,
    rightAscension,
    distance
  };
}

/**
 * Gets daylight duration for a given date and location
 */
export function getDaylightHours(date: Date, lat: number, lng: number): { hours: number; minutes: number; totalHours: number } {
  const times = SunCalc.getTimes(date, lat, lng);
  if (!times.sunrise || !times.sunset || isNaN(times.sunrise.getTime()) || isNaN(times.sunset.getTime())) {
    // Check if polar day or polar night
    const noonPos = SunCalc.getPosition(times.solarNoon || date, lat, lng);
    if (noonPos.altitude > 0) {
      return { hours: 24, minutes: 0, totalHours: 24 }; // Midnight Sun
    } else {
      return { hours: 0, minutes: 0, totalHours: 0 }; // Polar Night
    }
  }
  
  const diffMs = times.sunset.getTime() - times.sunrise.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);
  
  return { hours, minutes, totalHours };
}

/**
 * Returns the season based on date and hemisphere
 */
export function getSeason(date: Date, isSouthernHemisphere: boolean): string {
  const month = date.getMonth(); // 0 is Jan, 11 is Dec
  const day = date.getDate();
  
  // Standard astronomical seasons
  // Spring Equinox: Mar 20, Summer Solstice: Jun 21, Autumn Equinox: Sep 22, Winter Solstice: Dec 21
  let seasonIndex = 0; // 0: Spring, 1: Summer, 2: Autumn, 3: Winter
  
  const dayVal = month * 100 + day; // e.g. Mar 20 is 220
  if (dayVal < 220 || dayVal >= 1121) {
    seasonIndex = 3; // Winter
  } else if (dayVal >= 220 && dayVal < 521) {
    seasonIndex = 0; // Spring
  } else if (dayVal >= 521 && dayVal < 822) {
    seasonIndex = 1; // Summer
  } else {
    seasonIndex = 2; // Autumn
  }
  
  if (isSouthernHemisphere) {
    // Invert season for Southern Hemisphere
    seasonIndex = (seasonIndex + 2) % 4;
  }
  
  const seasons = ['Spring (الربيع)', 'Summer (الصيف)', 'Autumn (الخريف)', 'Winter (الشتاء)'];
  return seasons[seasonIndex];
}

export interface AltitudeSolution {
  targetAltitude: number;
  highestToday: number;
  lowestToday: number;
  isReachable: boolean;
  morningTime: Date | null;
  afternoonTime: Date | null;
  explanation: string;
}

export function solveAltitudeTimes(
  date: Date,
  lat: number,
  lng: number,
  targetAltitudeDeg: number
): AltitudeSolution {
  const times = SunCalc.getTimes(date, lat, lng);
  const noonTime = times.solarNoon || date;
  
  const midnightTime = new Date(noonTime.getTime() + 12 * 60 * 60 * 1000);
  
  const noonPos = SunCalc.getPosition(noonTime, lat, lng);
  const midnightPos = SunCalc.getPosition(midnightTime, lat, lng);
  
  const highestToday = noonPos.altitude * 180 / Math.PI;
  const lowestToday = midnightPos.altitude * 180 / Math.PI;
  
  const isReachable = targetAltitudeDeg >= lowestToday && targetAltitudeDeg <= highestToday;
  
  let morningTime: Date | null = null;
  let afternoonTime: Date | null = null;
  
  if (isReachable) {
    morningTime = getTimeForSolarAltitude(date, lat, lng, targetAltitudeDeg, true);
    afternoonTime = getTimeForSolarAltitude(date, lat, lng, targetAltitudeDeg, false);
  }
  
  let explanation = "Arbitrary solar elevation path point.";
  
  if (Math.abs(targetAltitudeDeg - (-19.0)) < 0.1) {
    explanation = "Moroccan Ministry of Habous Fajr (Dawn) threshold.";
  } else if (Math.abs(targetAltitudeDeg - (-18.0)) < 0.1) {
    explanation = "Muslim World League Fajr / US standard Fajr threshold.";
  } else if (Math.abs(targetAltitudeDeg - (-15.0)) < 0.1) {
    explanation = "ISNA Fajr (Dawn) / Isha (Night) threshold.";
  } else if (Math.abs(targetAltitudeDeg - (-12.0)) < 0.1) {
    explanation = "Nautical Twilight: horizon is indistinguishable; sea navigation limits.";
  } else if (Math.abs(targetAltitudeDeg - (-6.0)) < 0.1) {
    explanation = "Civil Twilight: bright enough for outdoor activities without artificial light.";
  } else if (Math.abs(targetAltitudeDeg - (-0.833)) < 0.1) {
    explanation = "Refracted Sunrise/Sunset limit: upper limb of the Sun touches the horizon.";
  } else if (Math.abs(targetAltitudeDeg - 0.0) < 0.1) {
    explanation = "Geometric Horizon line: center of Sun sphere aligns with the horizon.";
  } else if (targetAltitudeDeg > 0 && Math.abs(targetAltitudeDeg - highestToday) < 0.5) {
    explanation = "Solar Noon Zenith limit: highest elevation reached by the Sun today.";
  } else if (targetAltitudeDeg < 0 && Math.abs(targetAltitudeDeg - lowestToday) < 0.5) {
    explanation = "Nadir Midnight limit: lowest depth reached by the Sun today.";
  }
  
  return {
    targetAltitude: targetAltitudeDeg,
    highestToday,
    lowestToday,
    isReachable,
    morningTime,
    afternoonTime,
    explanation
  };
}
