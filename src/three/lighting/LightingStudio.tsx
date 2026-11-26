'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { LightConfig, WeatherPreset } from '@/domain';
import { useSimulationStore } from '@/stores';

interface LightingStudioProps {
  lights: LightConfig[];
}

function computeSunState(timeOfDay: number, azimuthDeg: number, weather: WeatherPreset) {
  // Map [6..18] to [0..PI] sun arc above horizon
  const normalized = (timeOfDay - 6) / 12;
  const clampedArc = Math.max(-0.25, Math.min(1.25, normalized));
  const elevationRad = Math.sin(clampedArc * Math.PI) * (Math.PI * 0.42);
  const azimuthRad = THREE.MathUtils.degToRad(azimuthDeg);

  const dist = 28;
  const cosEl = Math.cos(elevationRad);
  const x = Math.sin(azimuthRad) * cosEl * dist;
  const y = Math.max(1.5, Math.sin(elevationRad) * dist);
  const z = Math.cos(azimuthRad) * cosEl * dist;

  const isNight = timeOfDay < 5.5 || timeOfDay > 19.2;
  const isGolden =
    (timeOfDay >= 5.5 && timeOfDay < 8.0) || (timeOfDay >= 16.5 && timeOfDay <= 19.2);

  let skyColor = '#dbeafe';
  let sunColor = '#fff7ed';
  let sunIntensity = 2.4;
  let ambientIntensity = 0.45;

  if (weather === 'night' || isNight) {
    skyColor = '#0b1324';
    sunColor = '#93c5fd';
    sunIntensity = 0.45;
    ambientIntensity = 0.2;
  } else if (weather === 'sunset' || isGolden) {
    skyColor = '#fed7aa';
    sunColor = '#fdba74';
    sunIntensity = 1.85;
    ambientIntensity = 0.38;
  } else if (weather === 'overcast') {
    skyColor = '#cbd5e1';
    sunColor = '#f1f5f9';
    sunIntensity = 1.25;
    ambientIntensity = 0.65;
  }

  return {
    sunPosition: [x, y, z] as [number, number, number],
    skyColor,
    sunColor,
    sunIntensity,
    ambientIntensity,
    isNight: weather === 'night' || isNight,
  };
}

export function LightingStudio({ lights }: LightingStudioProps) {
  const timeOfDay = useSimulationStore((s) => s.timeOfDay);
  const sunAzimuth = useSimulationStore((s) => s.sunAzimuth);
  const weather = useSimulationStore((s) => s.weather);
  const shadowsEnabled = useSimulationStore((s) => s.shadowsEnabled);
  const postProcessingEnabled = useSimulationStore((s) => s.postProcessingEnabled);
  const bloomEnabled = useSimulationStore((s) => s.bloomEnabled);

  const sunState = useMemo(
    () => computeSunState(timeOfDay, sunAzimuth, weather),
    [timeOfDay, sunAzimuth, weather],
  );

  const interiorLights = useMemo(
    () => lights.filter((l) => l.enabled && (l.type === 'point' || l.type === 'spot')),
    [lights],
  );

  return (
    <>
      <color attach="background" args={[sunState.skyColor]} />
      <fog attach="fog" args={[sunState.skyColor, 36, 96]} />

      {/* Offline-safe procedural studio environment reflections */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            form="rect"
            intensity={sunState.isNight ? 0.6 : 2.2}
            color={sunState.sunColor}
            scale={[14, 6, 1]}
            position={[0, 8, -8]}
          />
          <Lightformer
            form="rect"
            intensity={sunState.isNight ? 0.35 : 1.1}
            color="#e0f2fe"
            scale={[16, 4, 1]}
            position={[-8, 4, 6]}
            rotation={[0, Math.PI / 2, 0]}
          />
          <Lightformer
            form="ring"
            intensity={0.7}
            color="#f8fafc"
            scale={6}
            position={[8, 6, 4]}
            rotation={[0, -Math.PI / 2, 0]}
          />
        </group>
      </Environment>

      <ambientLight intensity={sunState.ambientIntensity} color={sunState.isNight ? '#475569' : '#f8fafc'} />

      <hemisphereLight
        args={[
          sunState.isNight ? '#334155' : '#cfe8ff',
          sunState.isNight ? '#0f172a' : '#6b705c',
          sunState.isNight ? 0.28 : 0.6,
        ]}
      />

      <directionalLight
        position={sunState.sunPosition}
        intensity={sunState.sunIntensity}
        color={sunState.sunColor}
        castShadow={shadowsEnabled}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />

      {/* Interior & accent lights */}
      {interiorLights.map((light) => {
        if (light.type === 'spot') {
          return (
            <spotLight
              key={light.id}
              position={light.position}
              color={light.color}
              intensity={light.intensity * 1.4}
              distance={light.distance ?? 10}
              decay={light.decay ?? 2}
              angle={light.angle ?? Math.PI / 4}
              penumbra={light.penumbra ?? 0.5}
              castShadow={Boolean(light.castShadow && shadowsEnabled)}
            />
          );
        }
        return (
          <pointLight
            key={light.id}
            position={light.position}
            color={light.color}
            intensity={light.intensity * 1.5}
            distance={light.distance ?? 9}
            decay={light.decay ?? 2}
          />
        );
      })}

      {/* Subtle selective bloom on High/Ultra post-processing */}
      {postProcessingEnabled && bloomEnabled && (
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.35}
            luminanceThreshold={0.88}
            luminanceSmoothing={0.25}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
}
