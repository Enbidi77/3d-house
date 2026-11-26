import { beforeEach, describe, expect, it } from 'vitest';
import {
  STARTER_HOUSE_PROJECT,
  addFurnitureCommand,
  addWallCommand,
  batchCommand,
  createHistoryStack,
  deleteFloorCommand,
  deleteWallCommand,
  executeOnHistory,
  redoOnHistory,
  undoOnHistory,
  updateWallCommand,
  type FurnitureItem,
  type Wall,
} from '@/domain';
import { useHistoryStore, useProjectStore } from '@/stores';

describe('command-pattern undo/redo engine', () => {
  it('executes, undoes, and redoes wall add/update/delete with cascading openings', () => {
    let project = STARTER_HOUSE_PROJECT;
    let history = createHistoryStack(50);

    const newWall: Wall = {
      id: 'wall-test-1',
      floorId: 'floor-ground',
      start: [0, 0],
      end: [3, 0],
      thickness: 0.15,
      height: 3.0,
      exteriorMaterialId: 'mat-plaster-white',
      interiorMaterialId: 'mat-plaster-white',
    };

    ({ project, history } = executeOnHistory(project, history, addWallCommand(newWall)));
    expect(project.walls.some((w) => w.id === 'wall-test-1')).toBe(true);

    ({ project, history } = executeOnHistory(
      project,
      history,
      updateWallCommand('wall-test-1', { height: 3.0 }, { height: 3.5 }),
    ));
    expect(project.walls.find((w) => w.id === 'wall-test-1')?.height).toBe(3.5);

    const undidUpdate = undoOnHistory(project, history);
    project = undidUpdate.project;
    history = undidUpdate.history;
    expect(project.walls.find((w) => w.id === 'wall-test-1')?.height).toBe(3.0);

    const redidUpdate = redoOnHistory(project, history);
    project = redidUpdate.project;
    history = redidUpdate.history;
    expect(project.walls.find((w) => w.id === 'wall-test-1')?.height).toBe(3.5);

    // Delete an existing wall that has attached openings and verify undo restores both
    const northWall = project.walls.find((w) => w.id === 'wall-g-north')!;
    const attachedCount = project.openings.filter((o) => o.wallId === northWall.id).length;
    expect(attachedCount).toBeGreaterThan(0);

    ({ project, history } = executeOnHistory(project, history, deleteWallCommand(northWall)));
    expect(project.walls.some((w) => w.id === northWall.id)).toBe(false);
    expect(project.openings.some((o) => o.wallId === northWall.id)).toBe(false);

    const undidDelete = undoOnHistory(project, history);
    project = undidDelete.project;
    expect(project.walls.some((w) => w.id === northWall.id)).toBe(true);
    expect(project.openings.filter((o) => o.wallId === northWall.id)).toHaveLength(attachedCount);
  });

  it('supports batch commands and cascading floor deletion', () => {
    let project = STARTER_HOUSE_PROJECT;
    let history = createHistoryStack(50);

    const chair: FurnitureItem = {
      id: 'furn-chair-test',
      floorId: 'floor-ground',
      catalogId: 'chair-accent',
      name: 'Accent Chair',
      category: 'seating',
      position: [-1, 0, 1],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      dimensions: [0.8, 0.8, 0.8],
    };

    const secondFloor = project.floors.find((f) => f.id === 'floor-second')!;
    const secondFloorWalls = project.walls.filter((w) => w.floorId === 'floor-second').length;

    ({ project, history } = executeOnHistory(
      project,
      history,
      batchCommand([addFurnitureCommand(chair), deleteFloorCommand(secondFloor)], 'Add chair & remove 2F'),
    ));

    expect(project.furniture.some((f) => f.id === 'furn-chair-test')).toBe(true);
    expect(project.floors.some((f) => f.id === 'floor-second')).toBe(false);
    expect(project.walls.filter((w) => w.floorId === 'floor-second')).toHaveLength(0);

    const undid = undoOnHistory(project, history);
    project = undid.project;
    expect(project.furniture.some((f) => f.id === 'furn-chair-test')).toBe(false);
    expect(project.floors.some((f) => f.id === 'floor-second')).toBe(true);
    expect(project.walls.filter((w) => w.floorId === 'floor-second')).toHaveLength(secondFloorWalls);
  });

  describe('Zustand project + history store integration', () => {
    beforeEach(() => {
      useProjectStore.getState().resetToStarter();
      useHistoryStore.getState().clear();
    });

    it('executes, undoes, and redoes via useHistoryStore', () => {
      const initialWallCount = useProjectStore.getState().project.walls.length;
      const wall: Wall = {
        id: 'wall-store-test',
        floorId: 'floor-ground',
        start: [1, 1],
        end: [4, 1],
        thickness: 0.14,
        height: 3.0,
        exteriorMaterialId: 'mat-plaster-white',
        interiorMaterialId: 'mat-plaster-white',
      };

      useHistoryStore.getState().execute(addWallCommand(wall));
      expect(useProjectStore.getState().project.walls).toHaveLength(initialWallCount + 1);
      expect(useHistoryStore.getState().canUndo()).toBe(true);

      useHistoryStore.getState().undo();
      expect(useProjectStore.getState().project.walls).toHaveLength(initialWallCount);
      expect(useHistoryStore.getState().canRedo()).toBe(true);

      useHistoryStore.getState().redo();
      expect(useProjectStore.getState().project.walls).toHaveLength(initialWallCount + 1);
    });
  });
});
