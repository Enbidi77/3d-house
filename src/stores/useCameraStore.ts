import { create } from 'zustand';
import type { CameraPreset, Vector3Tuple } from '@/domain';

interface CameraState {
  activePresetId: string | null;
  position: Vector3Tuple;
  target: Vector3Tuple;
  fov: number;
  transitionNonce: number;
  setCameraPose: (position: Vector3Tuple, target: Vector3Tuple, fov?: number) => void;
  applyPreset: (preset: CameraPreset) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  activePresetId: 'cam-exterior-hero',
  position: [13, 8.5, 16],
  target: [0, 2.2, 1],
  fov: 45,
  transitionNonce: 0,
  setCameraPose: (position, target, fov) =>
    set((state) => ({
      activePresetId: null,
      position,
      target,
      fov: fov ?? state.fov,
      transitionNonce: state.transitionNonce + 1,
    })),
  applyPreset: (preset) =>
    set((state) => ({
      activePresetId: preset.id,
      position: preset.position,
      target: preset.target,
      fov: preset.fov ?? 45,
      transitionNonce: state.transitionNonce + 1,
    })),
}));
