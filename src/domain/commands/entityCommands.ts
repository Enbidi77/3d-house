import type {
  Floor,
  FurnitureItem,
  LightConfig,
  MaterialDef,
  Opening,
  Project,
  Room,
  Wall,
} from '../models';
import type { Command } from './types';

type CollectionKey =
  | 'floors'
  | 'rooms'
  | 'walls'
  | 'openings'
  | 'furniture'
  | 'materials'
  | 'lights';

type EntityOf<K extends CollectionKey> = Project[K][number];

let cmdCounter = 0;
function nextCmdId(prefix: string): string {
  cmdCounter += 1;
  return `${prefix}-${cmdCounter}`;
}

function touchProject(project: Project): string {
  return new Date().toISOString();
}

function createAddCommand<K extends CollectionKey>(
  key: K,
  entity: EntityOf<K>,
  label: string,
): Command {
  const id = nextCmdId(`add-${key}`);
  return {
    id,
    label,
    execute(project) {
      const list = project[key] as EntityOf<K>[];
      if (list.some((item) => item.id === entity.id)) {
        return project;
      }
      return {
        ...project,
        updatedAt: touchProject(project),
        [key]: [...list, entity],
      };
    },
    undo(project) {
      const list = project[key] as EntityOf<K>[];
      return {
        ...project,
        updatedAt: touchProject(project),
        [key]: list.filter((item) => item.id !== entity.id),
      };
    },
  };
}

function createUpdateCommand<K extends CollectionKey>(
  key: K,
  entityId: string,
  prevPatch: Partial<EntityOf<K>>,
  nextPatch: Partial<EntityOf<K>>,
  label: string,
): Command {
  const id = nextCmdId(`update-${key}`);
  const applyPatch = (project: Project, patch: Partial<EntityOf<K>>): Project => {
    const list = project[key] as EntityOf<K>[];
    return {
      ...project,
      updatedAt: touchProject(project),
      [key]: list.map((item) => (item.id === entityId ? { ...item, ...patch } : item)),
    };
  };

  return {
    id,
    label,
    execute: (project) => applyPatch(project, nextPatch),
    undo: (project) => applyPatch(project, prevPatch),
  };
}

function createDeleteCommand<K extends CollectionKey>(
  key: K,
  entity: EntityOf<K>,
  label: string,
): Command {
  const id = nextCmdId(`delete-${key}`);
  let removedIndex = -1;

  return {
    id,
    label,
    execute(project) {
      const list = project[key] as EntityOf<K>[];
      removedIndex = list.findIndex((item) => item.id === entity.id);
      if (removedIndex === -1) return project;
      return {
        ...project,
        updatedAt: touchProject(project),
        [key]: list.filter((item) => item.id !== entity.id),
      };
    },
    undo(project) {
      const list = project[key] as EntityOf<K>[];
      if (list.some((item) => item.id === entity.id)) return project;
      const nextList = [...list];
      const insertAt = removedIndex >= 0 && removedIndex <= nextList.length ? removedIndex : nextList.length;
      nextList.splice(insertAt, 0, entity);
      return {
        ...project,
        updatedAt: touchProject(project),
        [key]: nextList,
      };
    },
  };
}

// Wall commands (deleteWall also cascades to attached openings)
export const addWallCommand = (wall: Wall, label = 'Add wall'): Command =>
  createAddCommand('walls', wall, label);

export const updateWallCommand = (
  wallId: string,
  prev: Partial<Wall>,
  next: Partial<Wall>,
  label = 'Update wall',
): Command => createUpdateCommand('walls', wallId, prev, next, label);

export function deleteWallCommand(wall: Wall, label = 'Delete wall'): Command {
  const id = nextCmdId('delete-wall');
  let removedOpenings: Opening[] = [];

  return {
    id,
    label,
    execute(project) {
      removedOpenings = project.openings.filter((o) => o.wallId === wall.id);
      return {
        ...project,
        updatedAt: touchProject(project),
        walls: project.walls.filter((w) => w.id !== wall.id),
        openings: project.openings.filter((o) => o.wallId !== wall.id),
      };
    },
    undo(project) {
      const hasWall = project.walls.some((w) => w.id === wall.id);
      const existingOpeningIds = new Set(project.openings.map((o) => o.id));
      return {
        ...project,
        updatedAt: touchProject(project),
        walls: hasWall ? project.walls : [...project.walls, wall],
        openings: [
          ...project.openings,
          ...removedOpenings.filter((o) => !existingOpeningIds.has(o.id)),
        ],
      };
    },
  };
}

// Opening commands
export const addOpeningCommand = (opening: Opening, label = 'Add opening'): Command =>
  createAddCommand('openings', opening, label);

export const updateOpeningCommand = (
  openingId: string,
  prev: Partial<Opening>,
  next: Partial<Opening>,
  label = 'Update opening',
): Command => createUpdateCommand('openings', openingId, prev, next, label);

export const deleteOpeningCommand = (opening: Opening, label = 'Delete opening'): Command =>
  createDeleteCommand('openings', opening, label);

// Room commands
export const addRoomCommand = (room: Room, label = 'Add room'): Command =>
  createAddCommand('rooms', room, label);

export const updateRoomCommand = (
  roomId: string,
  prev: Partial<Room>,
  next: Partial<Room>,
  label = 'Update room',
): Command => createUpdateCommand('rooms', roomId, prev, next, label);

export const deleteRoomCommand = (room: Room, label = 'Delete room'): Command =>
  createDeleteCommand('rooms', room, label);

// Furniture commands
export const addFurnitureCommand = (item: FurnitureItem, label = 'Add furniture'): Command =>
  createAddCommand('furniture', item, label);

export const updateFurnitureCommand = (
  itemId: string,
  prev: Partial<FurnitureItem>,
  next: Partial<FurnitureItem>,
  label = 'Update furniture',
): Command => createUpdateCommand('furniture', itemId, prev, next, label);

export const deleteFurnitureCommand = (item: FurnitureItem, label = 'Delete furniture'): Command =>
  createDeleteCommand('furniture', item, label);

// Material commands
export const addMaterialCommand = (material: MaterialDef, label = 'Add material'): Command =>
  createAddCommand('materials', material, label);

export const updateMaterialCommand = (
  materialId: string,
  prev: Partial<MaterialDef>,
  next: Partial<MaterialDef>,
  label = 'Update material',
): Command => createUpdateCommand('materials', materialId, prev, next, label);

export const deleteMaterialCommand = (material: MaterialDef, label = 'Delete material'): Command =>
  createDeleteCommand('materials', material, label);

// Light commands
export const addLightCommand = (light: LightConfig, label = 'Add light'): Command =>
  createAddCommand('lights', light, label);

export const updateLightCommand = (
  lightId: string,
  prev: Partial<LightConfig>,
  next: Partial<LightConfig>,
  label = 'Update light',
): Command => createUpdateCommand('lights', lightId, prev, next, label);

export const deleteLightCommand = (light: LightConfig, label = 'Delete light'): Command =>
  createDeleteCommand('lights', light, label);

// Floor commands (deleteFloor cascades to floor entities and restores them on undo)
export const addFloorCommand = (floor: Floor, label = 'Add floor'): Command =>
  createAddCommand('floors', floor, label);

export const updateFloorCommand = (
  floorId: string,
  prev: Partial<Floor>,
  next: Partial<Floor>,
  label = 'Update floor',
): Command => createUpdateCommand('floors', floorId, prev, next, label);

export function deleteFloorCommand(floor: Floor, label = 'Delete floor'): Command {
  const id = nextCmdId('delete-floor');
  let removedRooms: Room[] = [];
  let removedWalls: Wall[] = [];
  let removedOpenings: Opening[] = [];
  let removedFurniture: FurnitureItem[] = [];
  let removedLights: LightConfig[] = [];

  return {
    id,
    label,
    execute(project) {
      removedRooms = project.rooms.filter((r) => r.floorId === floor.id);
      removedWalls = project.walls.filter((w) => w.floorId === floor.id);
      const removedWallIds = new Set(removedWalls.map((w) => w.id));
      removedOpenings = project.openings.filter((o) => removedWallIds.has(o.wallId));
      removedFurniture = project.furniture.filter((f) => f.floorId === floor.id);
      removedLights = project.lights.filter((l) => l.floorId === floor.id);

      return {
        ...project,
        updatedAt: touchProject(project),
        floors: project.floors.filter((f) => f.id !== floor.id),
        rooms: project.rooms.filter((r) => r.floorId !== floor.id),
        walls: project.walls.filter((w) => w.floorId !== floor.id),
        openings: project.openings.filter((o) => !removedWallIds.has(o.wallId)),
        furniture: project.furniture.filter((f) => f.floorId !== floor.id),
        lights: project.lights.filter((l) => l.floorId !== floor.id),
      };
    },
    undo(project) {
      return {
        ...project,
        updatedAt: touchProject(project),
        floors: project.floors.some((f) => f.id === floor.id)
          ? project.floors
          : [...project.floors, floor],
        rooms: [...project.rooms, ...removedRooms],
        walls: [...project.walls, ...removedWalls],
        openings: [...project.openings, ...removedOpenings],
        furniture: [...project.furniture, ...removedFurniture],
        lights: [...project.lights, ...removedLights],
      };
    },
  };
}

/**
 * Groups multiple commands into a single atomic undoable step.
 */
export function batchCommand(commands: Command[], label = 'Batch edit'): Command {
  const id = nextCmdId('batch');
  return {
    id,
    label,
    execute(project) {
      return commands.reduce((acc, cmd) => cmd.execute(acc), project);
    },
    undo(project) {
      return [...commands].reverse().reduce((acc, cmd) => cmd.undo(acc), project);
    },
  };
}
