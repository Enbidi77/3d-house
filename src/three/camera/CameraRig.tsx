'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { distancePointToSegment, getFurnitureAABB } from '@/domain';
import { useCameraStore, useProjectStore, useSimulationStore } from '@/stores';

interface CameraRigProps {
  isGizmoDragging: boolean;
}

export function CameraRig({ isGizmoDragging }: CameraRigProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { gl } = useThree();

  const mode = useSimulationStore((s) => s.mode);
  const activeFloorId = useSimulationStore((s) => s.activeFloorId);
  const project = useProjectStore((s) => s.project);

  const targetPose = useCameraStore((s) => s.position);
  const targetLookAt = useCameraStore((s) => s.target);
  const targetFov = useCameraStore((s) => s.fov);
  const transitionNonce = useCameraStore((s) => s.transitionNonce);

  const isTransitioning = useRef(false);
  const desiredPos = useRef(new THREE.Vector3(...targetPose));
  const desiredTarget = useRef(new THREE.Vector3(...targetLookAt));
  const pendingFovRef = useRef<number | null>(null);
  const pendingWalkInitRef = useRef(false);

  // First-person state
  const keysPressed = useRef(new Set<string>());
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isPointerLooking = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // Trigger smooth transition when camera store updates
  useEffect(() => {
    if (mode === 'floorplan') {
      desiredPos.current.set(0, 24, 0.01);
      desiredTarget.current.set(0, 0, 0);
    } else {
      desiredPos.current.set(...targetPose);
      desiredTarget.current.set(...targetLookAt);
    }
    isTransitioning.current = true;
    pendingFovRef.current = targetFov;
  }, [targetPose, targetLookAt, targetFov, transitionNonce, mode]);

  // Flag walk-mode initialization on next frame
  useEffect(() => {
    if (mode === 'walk') {
      pendingWalkInitRef.current = true;
    }
  }, [mode]);

  // Keyboard & pointer-drag-look listeners for First-Person walk mode
  useEffect(() => {
    if (mode !== 'walk') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysPressed.current.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    const dom = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2) {
        isPointerLooking.current = true;
        lastPointer.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === dom) {
        yawRef.current -= e.movementX * 0.0022;
        pitchRef.current = THREE.MathUtils.clamp(
          pitchRef.current - e.movementY * 0.0022,
          -1.35,
          1.35,
        );
        return;
      }
      if (!isPointerLooking.current || !lastPointer.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      yawRef.current -= dx * 0.004;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - dy * 0.004, -1.35, 1.35);
    };
    const onPointerUp = () => {
      isPointerLooking.current = false;
      lastPointer.current = null;
    };

    const keysSet = keysPressed.current;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      keysSet.clear();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [mode, gl]);

  useFrame((state, delta) => {
    const cam = state.camera;
    const dt = Math.min(delta, 0.05);

    if (
      pendingFovRef.current !== null &&
      cam instanceof THREE.PerspectiveCamera &&
      Math.abs(cam.fov - pendingFovRef.current) > 0.1
    ) {
      cam.fov = pendingFovRef.current;
      cam.updateProjectionMatrix();
      pendingFovRef.current = null;
    }

    if (mode === 'walk') {
      if (pendingWalkInitRef.current) {
        const euler = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
        yawRef.current = euler.y;
        pitchRef.current = THREE.MathUtils.clamp(euler.x, -1.2, 1.2);
        const activeFloor = project.floors.find((f) => f.id === activeFloorId) ?? project.floors[0];
        if (activeFloor) {
          cam.position.y = activeFloor.elevation + 1.65;
        }
        pendingWalkInitRef.current = false;
      }

      cam.quaternion.setFromEuler(new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ'));

      const keys = keysPressed.current;
      const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);

      const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 5.2 : 2.8;
      const isCrouching = keys.has('KeyC') || keys.has('ControlLeft');
      const activeFloor = project.floors.find((f) => f.id === activeFloorId) ?? project.floors[0];
      const targetEyeY = (activeFloor?.elevation ?? 0) + (isCrouching ? 1.1 : 1.65);
      cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetEyeY, Math.min(1, dt * 10));

      if (forward !== 0 || strafe !== 0) {
        const dirForward = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current));
        const dirRight = new THREE.Vector3(Math.cos(yawRef.current), 0, -Math.sin(yawRef.current));
        const move = new THREE.Vector3()
          .addScaledVector(dirForward, forward)
          .addScaledVector(dirRight, strafe)
          .normalize()
          .multiplyScalar(speed * dt);

        const nextX = cam.position.x + move.x;
        const nextZ = cam.position.z + move.z;
        const playerRadius = 0.28;

        let blocked = false;
        const floorWalls = project.walls.filter((w) => w.floorId === activeFloor?.id);
        for (const wall of floorWalls) {
          const dist = distancePointToSegment([nextX, nextZ], wall.start, wall.end);
          if (dist.distance < wall.thickness / 2 + playerRadius) {
            // Allow passing through open doors
            const wallOpenings = project.openings.filter(
              (o) => o.wallId === wall.id && o.type === 'door' && (o.openAmount ?? 0) > 0.35,
            );
            const wallLen = Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
            const u = dist.t * wallLen;
            const inOpenDoor = wallOpenings.some(
              (op) => Math.abs(u - op.offset) < op.width * 0.45,
            );
            if (!inOpenDoor) {
              blocked = true;
              break;
            }
          }
        }

        if (!blocked) {
          const floorFurn = project.furniture.filter(
            (f) => f.floorId === activeFloor?.id && f.category !== 'stairs',
          );
          for (const item of floorFurn) {
            const box = getFurnitureAABB(item);
            if (
              nextX > box.min[0] - playerRadius &&
              nextX < box.max[0] + playerRadius &&
              nextZ > box.min[2] - playerRadius &&
              nextZ < box.max[2] + playerRadius
            ) {
              blocked = true;
              break;
            }
          }
        }

        if (!blocked) {
          cam.position.x = nextX;
          cam.position.z = nextZ;
        }
      }
      return;
    }

    // Smooth camera transitions for Orbit / Floorplan / Edit
    if (isTransitioning.current && controlsRef.current) {
      const alpha = Math.min(1, dt * 6);
      cam.position.lerp(desiredPos.current, alpha);
      controlsRef.current.target.lerp(desiredTarget.current, alpha);
      controlsRef.current.update();

      if (
        cam.position.distanceTo(desiredPos.current) < 0.03 &&
        controlsRef.current.target.distanceTo(desiredTarget.current) < 0.03
      ) {
        isTransitioning.current = false;
      }
    }
  });

  if (mode === 'walk') {
    return null;
  }

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isGizmoDragging}
      enableDamping
      dampingFactor={0.08}
      enableRotate={mode !== 'floorplan'}
      maxPolarAngle={mode === 'floorplan' ? 0 : Math.PI * 0.485}
      minDistance={2}
      maxDistance={55}
      onStart={() => {
        isTransitioning.current = false;
      }}
    />
  );
}
