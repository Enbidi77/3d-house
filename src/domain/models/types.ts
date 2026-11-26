export type Vector2Tuple = [number, number];
export type Vector3Tuple = [number, number, number];

export type OpeningType = 'door' | 'window';
export type DoorStyle = 'single' | 'double' | 'sliding' | 'french' | 'garage';
export type WindowStyle = 'fixed' | 'casement' | 'sliding' | 'picture' | 'skylight';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  style?: DoorStyle | WindowStyle;
  /** Distance in meters from wall.start to the center of the opening. */
  offset: number;
  width: number;
  height: number;
  /** Height from floor level to the bottom of the opening (0 for doors). */
  sillHeight: number;
  hingeSide?: 'left' | 'right';
  /** Normalized open state (0 = closed, 1 = fully open). */
  openAmount?: number;
}

export interface Wall {
  id: string;
  floorId: string;
  start: Vector2Tuple;
  end: Vector2Tuple;
  thickness: number;
  height: number;
  exteriorMaterialId: string;
  interiorMaterialId: string;
  isExterior?: boolean;
  isRailing?: boolean;
}

export type RoomType =
  | 'living'
  | 'kitchen'
  | 'dining'
  | 'bedroom'
  | 'bathroom'
  | 'hallway'
  | 'loft'
  | 'patio'
  | 'balcony'
  | 'garden'
  | 'pool'
  | 'garage'
  | 'office'
  | 'other';

export interface Room {
  id: string;
  floorId: string;
  name: string;
  type: RoomType;
  /** Ordered 2D polygon vertices [x, z] in meters. */
  polygon: Vector2Tuple[];
  floorMaterialId: string;
  ceilingMaterialId?: string;
  hasCeiling?: boolean;
  elevationOffset?: number;
  labelPosition?: Vector2Tuple;
}

export type FurnitureCategory =
  | 'seating'
  | 'table'
  | 'bed'
  | 'storage'
  | 'kitchen'
  | 'bathroom'
  | 'lighting'
  | 'decor'
  | 'outdoor'
  | 'stairs';

export interface FurnitureItem {
  id: string;
  floorId: string;
  catalogId: string;
  name: string;
  category: FurnitureCategory;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
  /** Base [width, height, depth] in meters at scale [1, 1, 1]. */
  dimensions: Vector3Tuple;
  materialId?: string;
  colorOverride?: string;
  locked?: boolean;
}

export type MaterialCategory =
  | 'concrete'
  | 'wood'
  | 'glass'
  | 'metal'
  | 'stone'
  | 'fabric'
  | 'plaster'
  | 'tile'
  | 'water'
  | 'foliage';

export interface MaterialDef {
  id: string;
  name: string;
  category: MaterialCategory;
  color: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  textureScale?: Vector2Tuple;
}

export type LightType = 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';

export interface LightConfig {
  id: string;
  floorId?: string;
  name: string;
  type: LightType;
  position: Vector3Tuple;
  target?: Vector3Tuple;
  color: string;
  intensity: number;
  castShadow?: boolean;
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  enabled: boolean;
}

export interface CameraPreset {
  id: string;
  name: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov?: number;
  floorId?: string;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  elevation: number;
  height: number;
  slabThickness: number;
  visible: boolean;
}

export type WeatherPreset = 'clear' | 'overcast' | 'sunset' | 'night';

export interface EnvironmentSettings {
  /** Hour of day in [0, 24). */
  timeOfDay: number;
  sunAzimuth: number;
  sunElevation: number;
  exposure: number;
  weather: WeatherPreset;
}

export type SimulationMode = 'edit' | 'walk' | 'orbit' | 'floorplan';

export interface SimulationState {
  mode: SimulationMode;
  timeOfDay: number;
  sunAzimuth: number;
  sunElevation: number;
  weather: WeatherPreset;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  ambientOcclusionEnabled: boolean;
  bloomEnabled: boolean;
  showGrid: boolean;
  showDimensions: boolean;
  showRoomLabels: boolean;
  activeFloorId: string | null;
  isolateActiveFloor: boolean;
  cutawayEnabled: boolean;
}

export interface Project {
  version: 1;
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  unit: 'metric' | 'imperial';
  gridSize: number;
  floors: Floor[];
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  materials: MaterialDef[];
  lights: LightConfig[];
  cameraPresets: CameraPreset[];
  environment: EnvironmentSettings;
}
