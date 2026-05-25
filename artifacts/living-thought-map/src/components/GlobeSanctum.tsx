import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Viewport } from 'reactflow';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, Line, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useThoughtStore } from '../store';
import type { ThoughtNode } from '../types';

interface GlobeSanctumProps {
  style?: React.CSSProperties;
  viewport: Viewport;
}

type GlobeNode = {
  id: string;
  title: string;
  surfacePosition: THREE.Vector3;
  pinPosition: THREE.Vector3;
  normal: THREE.Vector3;
  lat: number;
  lon: number;
};
type SphericalNodePosition = {
  nodeId: string;
  lat: number;
  lon: number;
  radius: number;
  cartesian: [number, number, number];
};

const GLOBE_RADIUS = 2.3;
const PIN_SURFACE_OFFSET = 0;
const PIN_STEM_LENGTH = 0.14;
const PIN_HEAD_OFFSET = 0.02;
const PIN_OFFSET = PIN_STEM_LENGTH + PIN_HEAD_OFFSET;

export function latLongToCartesian(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function deriveSphericalLayout(nodes: ThoughtNode[]): SphericalNodePosition[] {
  if (nodes.length === 0) return [];
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const maxAbsX = Math.max(1, ...sorted.map((n) => Math.abs(n.x)));
  const maxAbsY = Math.max(1, ...sorted.map((n) => Math.abs(n.y)));
  return sorted.map((node, index) => {
    const seed = `${node.id}|${node.type}|${node.realms.join(',')}|${node.content.length}`;
    const hash = hashString(seed);
    const jitterLat = ((hash % 2400) / 2400 - 0.5) * 18;
    const jitterLon = ((((hash >>> 8) % 3600) / 3600) - 0.5) * 40;
    const goldenLon = ((index * 137.50776405) % 360) - 180;
    const xyLon = (node.x / maxAbsX) * 120;
    const xyLat = (node.y / maxAbsY) * 60;
    const lat = THREE.MathUtils.clamp(0.65 * (72 - (index / Math.max(1, sorted.length - 1)) * 144) - xyLat * 0.25 + jitterLat, -78, 78);
    const lon = THREE.MathUtils.euclideanModulo(goldenLon + xyLon + jitterLon + 180, 360) - 180;
    return { nodeId: node.id, lat, lon, radius: GLOBE_RADIUS + PIN_SURFACE_OFFSET, cartesian: latLongToCartesian(lat, lon, GLOBE_RADIUS + PIN_SURFACE_OFFSET) };
  });
}

function mapNodesToGlobe(rawNodes: ThoughtNode[]): GlobeNode[] {
  const sphericalPositions = deriveSphericalLayout(rawNodes);
  const byId = new Map(sphericalPositions.map((p) => [p.nodeId, p]));
  if (rawNodes.length === 0) {
    return [];
  }
  return rawNodes.flatMap((n) => {
    const spherical = byId.get(n.id);
    if (!spherical) return [];
    const surfacePosition = new THREE.Vector3(...spherical.cartesian);
    const normal = surfacePosition.clone().normalize();
    const pinPosition = normal.clone().multiplyScalar(GLOBE_RADIUS + PIN_OFFSET);
    return [{ id: n.id, title: n.title, surfacePosition, pinPosition, normal, lat: spherical.lat, lon: spherical.lon }];
  });
}

function computeArcPoints(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
  const arcOffset = 0.01;
  const arcLift = 0.22;
  const startPos = start.clone().normalize().multiplyScalar(GLOBE_RADIUS + arcOffset);
  const endPos = end.clone().normalize().multiplyScalar(GLOBE_RADIUS + arcOffset);
  const mid = startPos.clone().add(endPos).normalize().multiplyScalar(GLOBE_RADIUS + arcLift);
  const curve = new THREE.QuadraticBezierCurve3(startPos, mid, endPos);
  return curve.getPoints(24);
}

function getFacing(cameraPosition: THREE.Vector3, nodePosition: THREE.Vector3): number {
  const cameraDir = cameraPosition.clone().normalize();
  const nodeDir = nodePosition.clone().normalize();
  return cameraDir.dot(nodeDir);
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
        const arcPoints = computeArcPoints(source.pinPosition, target.pinPosition);
        return (
          <Line
            key={edge.id}
            points={arcPoints.map((p) => p.toArray())}
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
  const focusNode = useThoughtStore((s) => s.focusNode);
  const { camera } = useThree();
  return (
    <group>
      {nodes.map((node) => {
        const stemMid = node.surfacePosition.clone().add(node.normal.clone().multiplyScalar(PIN_STEM_LENGTH * 0.5));
        const labelPos = node.pinPosition.clone().add(node.normal.clone().multiplyScalar(0.08));
        const isFocused = node.id === focusedNodeId;
        const facing = getFacing(camera.position, node.pinPosition);
        const visibleAlpha = THREE.MathUtils.clamp((facing + 0.2) / 1.2, 0.04, 1);
        const showLabel = facing > 0.1 || isFocused;

        return (
          <group key={node.id} onClick={(event) => { event.stopPropagation(); focusNode(node.id); }}>
            <mesh position={node.pinPosition.toArray()}>
              <sphereGeometry args={[isFocused ? 0.04 : 0.03, 14, 14]} />
              <meshStandardMaterial color={isFocused ? '#9ad9df' : '#6aa5ae'} emissive="#17333a" emissiveIntensity={(isFocused ? 0.9 : 0.45) * visibleAlpha} transparent opacity={visibleAlpha} />
            </mesh>

            <mesh
              position={stemMid.toArray()}
              quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), node.normal)}
            >
              <cylinderGeometry args={[0.006, 0.006, PIN_STEM_LENGTH, 8]} />
              <meshStandardMaterial color={isFocused ? '#99c8d0' : '#5a7982'} roughness={0.35} metalness={0.2} transparent opacity={visibleAlpha} />
            </mesh>

            {showLabel ? (
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
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function GlobeWorld({ nodes, viewport, focusedNodeId }: { nodes: GlobeNode[]; viewport: Viewport; focusedNodeId: string | null }) {
  const edges = useThoughtStore((s) => s.edges);
  const [debugState, setDebugState] = useState({ frontCount: 0, backCount: 0 });
  const { camera } = useThree();
  const sanctumScale = 1 + (viewport.zoom - 1) * 0.12;
  const lastLogRef = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    let frontCount = 0;
    let backCount = 0;
    nodes.forEach((node) => {
      if (getFacing(camera.position, node.pinPosition) > 0) frontCount += 1;
      else backCount += 1;
    });
    setDebugState({ frontCount, backCount });
    if (now - lastLogRef.current > 2.5) {
      lastLogRef.current = now;
      // eslint-disable-next-line no-console
      console.log('Globe debug', {
        spherical: nodes.map((n) => ({ id: n.id, lat: Number(n.lat.toFixed(2)), lon: Number(n.lon.toFixed(2)), cartesian: n.pinPosition.toArray().map((v: number) => Number(v.toFixed(3))) })),
        edgeArcCount: Math.min(220, edges.length),
        frontCount,
        backCount,
      });
    }
  });

  return (
    <group scale={sanctumScale}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[4.8, 3, 4]} intensity={0.6} color="#8caab8" />
      <directionalLight position={[-4, -1.5, -3]} intensity={0.18} color="#27424b" />

      <PlanetarySphere />
      <PlanetaryConnections nodes={nodes} focusedNodeId={focusedNodeId} />
      <PlanetaryNodePins nodes={nodes} focusedNodeId={focusedNodeId} />
      <Html position={[-3.1, 2.8, 0]} transform distanceFactor={10}>
        <div style={{ pointerEvents: 'none', fontSize: '11px', lineHeight: 1.35, color: '#93bac4', background: 'rgba(3,9,14,0.6)', border: '1px solid rgba(126,182,191,0.3)', borderRadius: 8, padding: '8px 10px', minWidth: 180 }}>
          <div>Globe Mode</div>
          <div>{nodes.length} total nodes</div>
          <div>{nodes.length} spherical pins</div>
          <div>{nodes.length} rendered pins</div>
          <div>{Math.min(220, edges.length)} arcs rendered</div>
          <div>focusedNode: {focusedNodeId ?? 'none'}</div>
          <div>front/back: {debugState.frontCount}/{debugState.backCount}</div>
        </div>
      </Html>
    </group>
  );
}

function GlobeSanctum({ style, viewport }: GlobeSanctumProps) {
  const nodes = useThoughtStore((s) => s.nodes);
  const focusedNodeId = useThoughtStore((s) => s.focusedNodeId);

  const globeNodes = useMemo(
    () => mapNodesToGlobe(nodes),
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
