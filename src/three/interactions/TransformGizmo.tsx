'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { updateFurnitureCommand, type FurnitureItem, type Vector3Tuple } from '@/domain';
import { useHistoryStore, useProjectStore, useToolStore } from '@/stores';

interface TransformGizmoProps {
  targetObject: THREE.Group | null;
  item: FurnitureItem | null;
  mode?: 'translate' | 'rotate' | 'scale';
  onDragChange: (dragging: boolean) => void;
}

export function TransformGizmo({
  targetObject,
  item,
  mode = 'translate',
  onDragChange,
}: TransformGizmoProps) {
  const snapToGrid = useToolStore((s) => s.snapToGrid);
  const snapToAngle = useToolStore((s) => s.snapToAngle);
  const angleStepDeg = useToolStore((s) => s.angleStepDeg);
  const activeTool = useToolStore((s) => s.activeTool);
  const gridSize = useProjectStore((s) => s.project.gridSize);
  const execute = useHistoryStore((s) => s.execute);

  const prevStateRef = useRef<{
    position: Vector3Tuple;
    rotation: Vector3Tuple;
    scale: Vector3Tuple;
  } | null>(null);

  if (!targetObject || !item || item.locked || activeTool !== 'select') {
    return null;
  }

  return (
    <TransformControls
      object={targetObject}
      mode={mode}
      size={0.75}
      translationSnap={snapToGrid ? gridSize : null}
      rotationSnap={snapToAngle ? THREE.MathUtils.degToRad(angleStepDeg) : null}
      scaleSnap={0.05}
      onMouseDown={() => {
        prevStateRef.current = {
          position: [...item.position] as Vector3Tuple,
          rotation: [...item.rotation] as Vector3Tuple,
          scale: [...item.scale] as Vector3Tuple,
        };
        onDragChange(true);
      }}
      onMouseUp={() => {
        onDragChange(false);
        const prev = prevStateRef.current;
        if (!prev) return;
        const next: {
          position: Vector3Tuple;
          rotation: Vector3Tuple;
          scale: Vector3Tuple;
        } = {
          position: [
            Number(targetObject.position.x.toFixed(3)),
            Number(targetObject.position.y.toFixed(3)),
            Number(targetObject.position.z.toFixed(3)),
          ],
          rotation: [
            Number(targetObject.rotation.x.toFixed(4)),
            Number(targetObject.rotation.y.toFixed(4)),
            Number(targetObject.rotation.z.toFixed(4)),
          ],
          scale: [
            Number(targetObject.scale.x.toFixed(3)),
            Number(targetObject.scale.y.toFixed(3)),
            Number(targetObject.scale.z.toFixed(3)),
          ],
        };

        const changed =
          prev.position.some((v, i) => Math.abs(v - next.position[i]) > 0.001) ||
          prev.rotation.some((v, i) => Math.abs(v - next.rotation[i]) > 0.001) ||
          prev.scale.some((v, i) => Math.abs(v - next.scale[i]) > 0.001);

        if (changed) {
          execute(updateFurnitureCommand(item.id, prev, next, `Move ${item.name}`));
        }
        prevStateRef.current = null;
      }}
    />
  );
}
