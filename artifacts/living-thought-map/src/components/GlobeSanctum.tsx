import React, { useEffect, useMemo, useState } from 'react';
import type { Viewport } from 'reactflow';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useThoughtStore } from '../store';

interface GlobeSanctumProps {
  style?: React.CSSProperties;
  viewport: Viewport;
}

type GlobeNode = {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
};

const GLOBE_RADIUS = 2.3;

function toSurfacePoint(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const x = radius * Math.cos(lat) * Math.sin(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.cos(lon);
  return new THREE.Vector3(x, y, z);
}

function mapNodesToGlobe(rawNodes: Array<{ id: string; x: number; y: number }>, viewport: Viewport): GlobeNode[] {
  if (rawNodes.length === 0) {
    return [
      { id: 'seed-a', position: toSurfacePoint(35, -20, GLOBE_RADIUS), normal: toSurfacePoint(35, -20, 1).normalize() },
      { id: 'seed-b', position: toSurfacePoint(-10, 70, GLOBE_RADIUS), normal: toSurfacePoint(-10, 70, 1).normalize() },
      { id: 'seed-c', position: toSurfacePoint(5, -120, GLOBE_RADIUS), normal: toSurfacePoint(5, -120, 1).normalize() },
      { id: 'seed-d', position: toSurfacePoint(-40, 150, GLOBE_RADIUS), normal: toSurfacePoint(-40, 150, 1).normalize() },
    ];
  }

  const xs = rawNodes.map((n) => n.x);
  const ys = rawNodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return rawNodes.map((n) => {
    const lon = ((n.x - minX) / spanX) * 360 - 180;
    const lat = 75 - ((n.y - minY) / spanY) * 150;
    const position = toSurfacePoint(lat, lon, GLOBE_RADIUS);
    const normal = position.clone().normalize();
    return { id: n.id, position, normal };
  });
}

function GlobeScene({ nodes, viewport }: { nodes: GlobeNode[]; viewport: Viewport }) {
  const sanctumScale = 1 + (viewport.zoom - 1) * 0.12;

  return (
    <group scale={sanctumScale}>
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 3, 4]} intensity={0.55} color="#9aa7b5" />

      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshStandardMaterial color="#11161f" roughness={0.92} metalness={0.04} />
      </mesh>

      {nodes.map((node) => {
        const markerBase = node.position.clone();
        const pinTop = markerBase.clone().add(node.normal.clone().multiplyScalar(0.16));
        return (
          <group key={node.id}>
            <mesh position={markerBase.toArray()}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color="#9fd0ff" emissive="#1f3552" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={pinTop.toArray()} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.normal)}>
              <cylinderGeometry args={[0.007, 0.007, 0.16, 8]} />
              <meshStandardMaterial color="#d8e6f4" roughness={0.4} metalness={0.15} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function GlobeSanctum({ style, viewport }: GlobeSanctumProps) {
  const nodes = useThoughtStore((s) => s.nodes);

  const globeNodes = useMemo(
    () => mapNodesToGlobe(nodes.map((n) => ({ id: n.id, x: n.x, y: n.y })), viewport),
    [nodes, viewport],
  );

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', ...style }}>
      <Canvas camera={{ position: [0, 0, 6.8], fov: 38 }} gl={{ antialias: true }}>
        <color attach="background" args={['#02040a']} />
        <fog attach="fog" args={['#02040a', 9, 16]} />
        <Stars radius={45} depth={18} count={220} factor={1.2} saturation={0} fade speed={0.15} />
        <GlobeScene nodes={globeNodes} viewport={viewport} />
        <OrbitControls
          enablePan={false}
          minDistance={4.4}
          maxDistance={10}
          rotateSpeed={0.6}
          autoRotate
          autoRotateSpeed={0.35}
        />
      </Canvas>
    </div>
  );
}

export default React.memo(GlobeSanctum);
