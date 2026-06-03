export interface LocationPreset {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string; // Timezone label, e.g. "GMT+1" or "UTC"
  utcOffset: number; // in hours
  description: string;
}

export type ViewMode = 'dome' | 'globe' | 'orbit';

export interface PrayerTime {
  id: string;
  name: string; // Fajr, Shorooq, Dhuhr, Asr, Maghrib, Isha
  time: string; // e.g., "05:12"
  timestamp: Date;
  sunAltitude: number; // in degrees
  definition: string; // Astronomical definition (e.g., "Sun is 18° below horizon")
  arabicName: string;
}

export interface SunDetails {
  altitude: number; // in degrees
  azimuth: number; // in degrees
  declination: number; // in degrees
  rightAscension: number; // in hours
  distance: number; // in AU
}

export type AdhanConvention = 'Morocco' | 'MWL' | 'ISNA' | 'Egypt' | 'UmmAlQura';

export interface AdhanConventionDetails {
  id: AdhanConvention;
  name: string;
  fajrAngle: number; // degrees below horizon, e.g. 18
  ishaAngle: number; // degrees below horizon, e.g. 17 or a custom calculation
  description: string;
}
