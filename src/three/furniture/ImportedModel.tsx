'use client';

import React, { Component, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Vector3Tuple } from '@/domain';

interface ImportedModelProps {
  url: string;
  dimensions: Vector3Tuple;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function GltfContent({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const cloned = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <primitive object={cloned} castShadow receiveShadow />;
}

function LoadingFallback({ dimensions, isError = false }: { dimensions: Vector3Tuple; isError?: boolean }) {
  const [w, h, d] = dimensions;
  return (
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={isError ? '#ef4444' : '#94a3b8'}
        roughness={0.7}
        transparent
        opacity={0.55}
        wireframe={!isError}
      />
    </mesh>
  );
}

/**
 * Loads an external or blob GLB/GLTF model with Suspense + ErrorBoundary fallback.
 */
export function ImportedModel({ url, dimensions }: ImportedModelProps) {
  return (
    <ModelErrorBoundary fallback={<LoadingFallback dimensions={dimensions} isError />}>
      <Suspense fallback={<LoadingFallback dimensions={dimensions} />}>
        <GltfContent url={url} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
