import React, { useEffect, useMemo, useState } from 'react';
import type { Viewport } from 'reactflow';
import { Canvas } from '@react-three/fiber';
import { Billboard, Line, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThoughtStore } from '../store';

interface GlobeSanctumProps {
  style?: React.CSSProperties;
  viewport: Viewport;
}

type GlobeNode = {
  id: string;
  title: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  lat: number;
  lon: number;
};

const GLOBE_RADIUS = 2.3;
const PIN_SURFACE_OFFSET = 0.03;
const PIN_STEM_LENGTH = 0.14;
const PIN_HEAD_OFFSET = 0.02;

function latLongToCartesian(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const x = radius * Math.cos(lat) * Math.sin(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.cos(lon);
  return new THREE.Vector3(x, y, z);
}

function mapNodesToGlobe(rawNodes: Array<{ id: string; title: string; x: number; y: number }>): GlobeNode[] {
  if (rawNodes.length === 0) {
    const seedNodes = [
      { id: 'seed-a', title: 'Archive One', lat: 35, lon: -20 },
      { id: 'seed-b', title: 'Archive Two', lat: -10, lon: 70 },
      { id: 'seed-c', title: 'Archive Three', lat: 5, lon: -120 },
      { id: 'seed-d', title: 'Archive Four', lat: -40, lon: 150 },
    ];

    return seedNodes.map((seed) => {
      const surface = latLongToCartesian(seed.lat, seed.lon, GLOBE_RADIUS + PIN_SURFACE_OFFSET);
      const normal = surface.clone().normalize();
      return { ...seed, position: surface, normal };
    });
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
    const lat = 72 - ((n.y - minY) / spanY) * 144;
    const position = latLongToCartesian(lat, lon, GLOBE_RADIUS + PIN_SURFACE_OFFSET);
    const normal = position.clone().normalize();
    return { id: n.id, title: n.title, position, normal, lat, lon };
  });
}

function PlanetarySphere() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 72, 72]} />
        <meshStandardMaterial color="#0d1b24" roughness={0.94} metalness={0.05} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.015, 36, 36]} />
        <meshBasicMaterial color="#365c62" wireframe transparent opacity={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS + 0.07, 48, 48]} />
        <meshBasicMaterial color="#2d7d84" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function PlanetaryConnections({ nodes, focusedNodeId }: { nodes: GlobeNode[]; focusedNodeId: string | null }) {
  const idMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const edges = useThoughtStore((s) => s.edges);

  return (
    <group>
      {edges.slice(0, 220).map((edge) => {
        const source = idMap.get(edge.source);
        const target = idMap.get(edge.target);
        if (!source || !target) return null;
        const isActive = focusedNodeId === edge.source || focusedNodeId === edge.target;
        return (
          <Line
            key={edge.id}
            points={[source.position.toArray(), target.position.toArray()]}
            color={isActive ? '#7eb6bf' : '#37505a'}
            transparent
            opacity={isActive ? 0.7 : 0.25}
            lineWidth={isActive ? 1.1 : 0.6}
          />
        );
      })}
    </group>
  );
}

function PlanetaryNodePins({ nodes, focusedNodeId }: { nodes: GlobeNode[]; focusedNodeId: string | null }) {
  return (
    <group>
      {nodes.map((node) => {
        const stemMid = node.position.clone().add(node.normal.clone().multiplyScalar(PIN_STEM_LENGTH * 0.5));
        const labelPos = node.position.clone().add(node.normal.clone().multiplyScalar(PIN_STEM_LENGTH + PIN_HEAD_OFFSET + 0.08));
        const isFocused = node.id === focusedNodeId;

        return (
          <group key={node.id}>
            <mesh position={node.position.toArray()}>
              <sphereGeometry args={[isFocused ? 0.04 : 0.03, 14, 14]} />
              <meshStandardMaterial color={isFocused ? '#9ad9df' : '#6aa5ae'} emissive="#17333a" emissiveIntensity={isFocused ? 0.9 : 0.45} />
            </mesh>

            <mesh
              position={stemMid.toArray()}
              quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.normal)}
            >
              <cylinderGeometry args={[0.006, 0.006, PIN_STEM_LENGTH, 8]} />
              <meshStandardMaterial color={isFocused ? '#99c8d0' : '#5a7982'} roughness={0.35} metalness={0.2} />
            </mesh>

            <Billboard position={labelPos.toArray()}>
              <Text
                fontSize={0.095}
                color={isFocused ? '#b8e4ea' : '#7ea4ad'}
                anchorX="center"
                anchorY="middle"
                maxWidth={1.5}
                outlineWidth={0.004}
                outlineColor="#03090d"
              >
                {node.title.slice(0, 24)}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}

function GlobeWorld({ nodes, viewport, focusedNodeId }: { nodes: GlobeNode[]; viewport: Viewport; focusedNodeId: string | null }) {
  const sanctumScale = 1 + (viewport.zoom - 1) * 0.12;

  return (
    <group scale={sanctumScale}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[4.8, 3, 4]} intensity={0.6} color="#8caab8" />
      <directionalLight position={[-4, -1.5, -3]} intensity={0.18} color="#27424b" />

      <PlanetarySphere />
      <PlanetaryConnections nodes={nodes} focusedNodeId={focusedNodeId} />
      <PlanetaryNodePins nodes={nodes} focusedNodeId={focusedNodeId} />
    </group>
  );
}

function GlobeSanctum({ style, viewport }: GlobeSanctumProps) {
  const nodes = useThoughtStore((s) => s.nodes);
  const focusedNodeId = useThoughtStore((s) => s.focusedNodeId);

  const globeNodes = useMemo(
    () => mapNodesToGlobe(nodes.map((n) => ({ id: n.id, title: n.title, x: n.x, y: n.y }))),
    [nodes],
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
      <Canvas camera={{ position: [0, 0, 6.8], fov: 38 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.8]}>
        <color attach="background" args={['#02050a']} />
        <fog attach="fog" args={['#02050a', 8.2, 14]} />
        <GlobeWorld nodes={globeNodes} viewport={viewport} focusedNodeId={focusedNodeId} />
        <OrbitControls
          enablePan={false}
          minDistance={4.4}
          maxDistance={9.8}
          rotateSpeed={0.52}
          enableDamping
          dampingFactor={0.06}
          autoRotate
          autoRotateSpeed={0.2}
        />
      </Canvas>
    </div>
  );
}

export default React.memo(GlobeSanctum);
