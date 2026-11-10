'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/** A length of silk that ripples in the wind and follows the pointer. */
function Silk() {
  const mesh = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(3.4, 4.6, 64, 84), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const wave = Math.sin(x * 1.6 + t * 0.9) * 0.18 + Math.sin(y * 1.2 + t * 0.6) * 0.22 + Math.sin((x + y) * 2.4 + t * 1.3) * 0.05;
      pos.setZ(i, wave * (0.6 + (y + 2.3) / 4.6));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    if (mesh.current) {
      mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, -0.35 + pointer.x * 0.25, 0.04);
      mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, -0.08 + pointer.y * 0.12, 0.04);
    }
  });

  return (
    <mesh ref={mesh} geometry={geo} rotation={[-0.08, -0.35, 0.12]}>
      <meshPhysicalMaterial color="#1767C2" roughness={0.32} metalness={0.25} sheen={1} sheenColor="#DCEBFF" sheenRoughness={0.4} clearcoat={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** A golden thread looping around the silk. */
function Thread() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.15;
  });
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={ref} position={[0.2, 0, 0.6]}>
        <torusKnotGeometry args={[1.55, 0.012, 320, 12, 2, 5]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#0051A1" emissiveIntensity={0.5} metalness={0.9} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export default function Hero3D() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} aria-hidden="true">
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#FFF4DE" />
      <pointLight position={[-4, -2, 3]} intensity={18} color="#8CC4FF" />
      <Silk />
      <Thread />
      <Sparkles count={60} scale={[6, 6, 3]} size={2.2} speed={0.35} color="#DCEBFF" />
    </Canvas>
  );
}
