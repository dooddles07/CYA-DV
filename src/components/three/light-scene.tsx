"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { Suspense, useRef } from "react";
import type { Group, Mesh } from "three";
import { useMediaQuery } from "@/lib/hooks";

/**
 * A slowly rotating glass cross with a light core behind it.
 * The cross is built from two rounded boxes so it reads as a symbol,
 * not a literal crucifix — calm, abstract, brand-forward.
 */
function GlassCross({ still }: { still: boolean }) {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.18;
    // gentle breathing tilt
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
  });

  // Frosted, self-lit glass. Deliberately avoids an HDRI environment map so
  // the scene never depends on a network fetch to look right.
  const material = (
    <meshPhysicalMaterial
      color="#cfe9ff"
      transparent
      opacity={0.62}
      roughness={0.18}
      metalness={0.05}
      clearcoat={1}
      clearcoatRoughness={0.12}
      emissive="#0095ff"
      emissiveIntensity={0.28}
    />
  );

  return (
    <group ref={group} scale={1.05}>
      {/* vertical beam */}
      <mesh castShadow={false}>
        <boxGeometry args={[0.52, 2.5, 0.52]} />
        {material}
      </mesh>
      {/* horizontal beam */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.7, 0.52, 0.52]} />
        {material}
      </mesh>
    </group>
  );
}

/** Warm core that pulses behind the cross like sunrise light. */
function LightCore({ still }: { still: boolean }) {
  const mesh = useRef<Mesh>(null);
  useFrame((state) => {
    if (still || !mesh.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 0.9) * 0.06;
    mesh.current.scale.setScalar(s);
  });
  return (
    <mesh ref={mesh} position={[0, 0.1, -1.6]}>
      <sphereGeometry args={[1.15, 32, 32]} />
      <meshBasicMaterial color="#66d4ff" transparent opacity={0.34} />
    </mesh>
  );
}

/** Orbiting motes — depth cue, very cheap. */
function Motes({ still }: { still: boolean }) {
  return (
    <Sparkles
      count={38}
      scale={[6, 4, 3]}
      size={2.4}
      speed={still ? 0 : 0.32}
      opacity={0.55}
      color="#9fd8ff"
    />
  );
}

function Scene({ still }: { still: boolean }) {
  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} />
      <directionalLight position={[-4, -2, -3]} intensity={0.7} color="#66d4ff" />
      <LightCore still={still} />
      <Float speed={still ? 0 : 1.1} rotationIntensity={still ? 0 : 0.25} floatIntensity={still ? 0 : 0.6}>
        <GlassCross still={still} />
      </Float>
      <Motes still={still} />
    </>
  );
}

/**
 * Hero 3D layer.
 * - Decorative only: aria-hidden, never holds content or controls.
 * - Under prefers-reduced-motion the scene renders one static frame.
 * - Skipped entirely on small screens / low-core devices to protect the
 *   main-thread budget on phones.
 */
export function LightScene({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const wide = useMediaQuery("(min-width: 1024px)");
  const enoughCores =
    typeof navigator === "undefined" || (navigator.hardwareConcurrency ?? 4) >= 4;
  const dpr: [number, number] = [1, 1.6];

  if (!wide || !enoughCores) return null;

  return (
    <div aria-hidden className={className}>
      <Canvas
        dpr={dpr}
        frameloop={reduce ? "demand" : "always"}
        camera={{ position: [0, 0, 6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene still={!!reduce} />
        </Suspense>
      </Canvas>
    </div>
  );
}
