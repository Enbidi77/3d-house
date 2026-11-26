import type { WeatherPreset } from '@/domain';

export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  timeOfDay: number;
  sunAzimuth: number;
  sunElevation: number;
  exposure: number;
  weather: WeatherPreset;
  interiorIntensityMultiplier: number;
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'bright-morning',
    name: 'Bright Morning',
    description: 'Crisp east sun with cool morning sky',
    timeOfDay: 8.5,
    sunAzimuth: 95,
    sunElevation: 32,
    exposure: 1.08,
    weather: 'clear',
    interiorIntensityMultiplier: 0.4,
  },
  {
    id: 'midday',
    name: 'Midday',
    description: 'High overhead sun and sharp architectural shadows',
    timeOfDay: 12.5,
    sunAzimuth: 180,
    sunElevation: 68,
    exposure: 1.0,
    weather: 'clear',
    interiorIntensityMultiplier: 0.25,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm low-angle afternoon sunlight',
    timeOfDay: 17.25,
    sunAzimuth: 245,
    sunElevation: 18,
    exposure: 1.12,
    weather: 'clear',
    interiorIntensityMultiplier: 0.65,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Deep amber horizon glow with interior warmth',
    timeOfDay: 19.0,
    sunAzimuth: 270,
    sunElevation: 5,
    exposure: 1.05,
    weather: 'sunset',
    interiorIntensityMultiplier: 1.0,
  },
  {
    id: 'nighttime',
    name: 'Nighttime',
    description: 'Moonlit exterior with illuminated interior rooms',
    timeOfDay: 22.0,
    sunAzimuth: 300,
    sunElevation: -12,
    exposure: 0.95,
    weather: 'night',
    interiorIntensityMultiplier: 1.35,
  },
  {
    id: 'warm-interior',
    name: 'Warm Interior',
    description: 'Soft overcast daylight balanced with 2700K fixtures',
    timeOfDay: 16.0,
    sunAzimuth: 210,
    sunElevation: 28,
    exposure: 1.15,
    weather: 'overcast',
    interiorIntensityMultiplier: 1.2,
  },
  {
    id: 'cool-interior',
    name: 'Cool Interior',
    description: 'Bright diffused studio daylight for material inspection',
    timeOfDay: 14.0,
    sunAzimuth: 165,
    sunElevation: 52,
    exposure: 1.1,
    weather: 'overcast',
    interiorIntensityMultiplier: 0.85,
  },
];

export type QualityPresetId = 'low' | 'medium' | 'high' | 'ultra';

export const QUALITY_PRESETS: Array<{
  id: QualityPresetId;
  label: string;
  shadows: boolean;
  postProcessing: boolean;
  ambientOcclusion: boolean;
  bloom: boolean;
}> = [
  {
    id: 'low',
    label: 'Low',
    shadows: false,
    postProcessing: false,
    ambientOcclusion: false,
    bloom: false,
  },
  {
    id: 'medium',
    label: 'Medium',
    shadows: true,
    postProcessing: false,
    ambientOcclusion: false,
    bloom: false,
  },
  {
    id: 'high',
    label: 'High',
    shadows: true,
    postProcessing: true,
    ambientOcclusion: false,
    bloom: true,
  },
  {
    id: 'ultra',
    label: 'Ultra',
    shadows: true,
    postProcessing: true,
    ambientOcclusion: true,
    bloom: true,
  },
];

export function formatTimeOfDay(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
