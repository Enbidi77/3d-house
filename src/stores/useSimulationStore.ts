import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SimulationMode, SimulationState, WeatherPreset } from '@/domain';

interface SimulationStore extends SimulationState {
  setMode: (mode: SimulationMode) => void;
  setTimeOfDay: (hour: number) => void;
  setSunAngles: (azimuth: number, elevation: number) => void;
  setWeather: (weather: WeatherPreset) => void;
  setShadowsEnabled: (enabled: boolean) => void;
  setPostProcessingEnabled: (enabled: boolean) => void;
  setAmbientOcclusionEnabled: (enabled: boolean) => void;
  setBloomEnabled: (enabled: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  setShowRoomLabels: (show: boolean) => void;
  setActiveFloorId: (floorId: string | null) => void;
  setIsolateActiveFloor: (isolate: boolean) => void;
  setCutawayEnabled: (enabled: boolean) => void;
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      mode: 'orbit',
      timeOfDay: 15.5,
      sunAzimuth: 145,
      sunElevation: 42,
      weather: 'clear',
      shadowsEnabled: true,
      postProcessingEnabled: true,
      ambientOcclusionEnabled: true,
      bloomEnabled: true,
      showGrid: true,
      showDimensions: true,
      showRoomLabels: true,
      activeFloorId: 'floor-ground',
      isolateActiveFloor: false,
      cutawayEnabled: false,
      setMode: (mode) => set({ mode }),
      setTimeOfDay: (timeOfDay) => set({ timeOfDay: Math.max(0, Math.min(24, timeOfDay)) }),
      setSunAngles: (sunAzimuth, sunElevation) => set({ sunAzimuth, sunElevation }),
      setWeather: (weather) => set({ weather }),
      setShadowsEnabled: (shadowsEnabled) => set({ shadowsEnabled }),
      setPostProcessingEnabled: (postProcessingEnabled) => set({ postProcessingEnabled }),
      setAmbientOcclusionEnabled: (ambientOcclusionEnabled) => set({ ambientOcclusionEnabled }),
      setBloomEnabled: (bloomEnabled) => set({ bloomEnabled }),
      setShowGrid: (showGrid) => set({ showGrid }),
      setShowDimensions: (showDimensions) => set({ showDimensions }),
      setShowRoomLabels: (showRoomLabels) => set({ showRoomLabels }),
      setActiveFloorId: (activeFloorId) => set({ activeFloorId }),
      setIsolateActiveFloor: (isolateActiveFloor: boolean) => set({ isolateActiveFloor }),
      setCutawayEnabled: (cutawayEnabled) => set({ cutawayEnabled }),
    }),
    {
      name: '3d-house-sim-prefs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        shadowsEnabled: state.shadowsEnabled,
        postProcessingEnabled: state.postProcessingEnabled,
        ambientOcclusionEnabled: state.ambientOcclusionEnabled,
        bloomEnabled: state.bloomEnabled,
        showGrid: state.showGrid,
        showDimensions: state.showDimensions,
        showRoomLabels: state.showRoomLabels,
      }),
    },
  ),
);
