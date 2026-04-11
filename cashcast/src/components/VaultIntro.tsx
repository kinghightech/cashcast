import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'

type VaultPhase = 'dark' | 'reveal' | 'unlocking' | 'opening' | 'done'

type VaultIntroProps = {
  onComplete: () => void
}

type VaultSceneProps = {
  phase: VaultPhase
  progress: number
}

const PHASE_TIMELINE: Array<{ phase: VaultPhase; start: number; end: number; copy: string }> = [
  { phase: 'dark', start: 0, end: 0.17, copy: 'Initializing secure chamber' },
  { phase: 'reveal', start: 0.17, end: 0.42, copy: 'Rendering city vault shell' },
  { phase: 'unlocking', start: 0.42, end: 0.72, copy: 'Verifying urban signal keys' },
  { phase: 'opening', start: 0.72, end: 0.96, copy: 'Opening predictive channel' },
  { phase: 'done', start: 0.96, end: 1, copy: 'Access granted' },
]

function getPhase(progress: number): VaultPhase {
  return PHASE_TIMELINE.find((segment) => progress >= segment.start && progress < segment.end)?.phase ?? 'done'
}

function phaseCopy(progress: number): string {
  return PHASE_TIMELINE.find((segment) => progress >= segment.start && progress < segment.end)?.copy ?? 'Access granted'
}

function VaultScene({ phase, progress }: VaultSceneProps) {
  const rootRef = useRef<Group>(null)
  const doorRef = useRef<Group>(null)
  const wheelRef = useRef<Mesh>(null)
  const barRefs = useRef<Mesh[]>([])

  const revealIntensity = Math.min(Math.max((progress - 0.12) / 0.25, 0), 1)
  const unlockProgress = Math.min(Math.max((progress - 0.42) / 0.3, 0), 1)
  const openProgress = Math.min(Math.max((progress - 0.72) / 0.24, 0), 1)

  useFrame((state, delta) => {
    if (!rootRef.current || !doorRef.current || !wheelRef.current) return

    const t = state.clock.getElapsedTime()
    rootRef.current.rotation.y = Math.sin(t * 0.22) * 0.08

    wheelRef.current.rotation.z += delta * (phase === 'unlocking' ? 2.2 : 0.35)
    doorRef.current.rotation.y = -openProgress * 1.45

    barRefs.current.forEach((bar, index) => {
      const lift = unlockProgress * 1.18
      bar.position.z = 0.45 + lift
      bar.rotation.z = unlockProgress * (index % 2 === 0 ? 0.22 : -0.22)
    })

    const cameraDepth = 7.2 - revealIntensity * 1.15 - openProgress * 0.9
    state.camera.position.z += (cameraDepth - state.camera.position.z) * Math.min(delta * 3, 1)
    state.camera.position.y += (1.1 - state.camera.position.y) * Math.min(delta * 3, 1)
    state.camera.lookAt(0, 0.1, 0)
  })

  return (
    <group ref={rootRef}>
      <ambientLight intensity={0.34 + revealIntensity * 0.35} />
      <directionalLight position={[3.6, 4.5, 4]} intensity={1.2 + revealIntensity * 0.4} color="#f7d0d0" />
      <pointLight position={[-3, -1.5, 2.4]} intensity={0.6} color="#6f0f1c" />

      <mesh position={[0, 0, -0.2]}>
        <cylinderGeometry args={[2.78, 2.78, 0.95, 56]} />
        <meshStandardMaterial color="#0f1b2f" metalness={0.62} roughness={0.34} />
      </mesh>

      <group ref={doorRef} position={[0, 0, 0.3]}>
        <mesh>
          <cylinderGeometry args={[2.2, 2.2, 0.52, 56]} />
          <meshStandardMaterial color="#aeb6bf" metalness={0.92} roughness={0.26} />
        </mesh>

        <mesh position={[0, 0, 0.27]}>
          <torusGeometry args={[1.45, 0.08, 16, 80]} />
          <meshStandardMaterial color="#8b101f" metalness={0.75} roughness={0.36} emissive="#39060d" />
        </mesh>

        <mesh ref={wheelRef} position={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.54, 0.54, 0.14, 42]} />
          <meshStandardMaterial color="#d6dadf" metalness={0.95} roughness={0.19} />
        </mesh>

        {Array.from({ length: 6 }).map((_, index) => {
          const angle = (index / 6) * Math.PI * 2
          const x = Math.cos(angle) * 0.82
          const y = Math.sin(angle) * 0.82

          return (
            <mesh
              key={`spoke-${index}`}
              position={[x, y, 0.31]}
              rotation={[0, 0, angle]}
              scale={[0.6, 0.08, 0.1]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#cfd4dc" metalness={0.88} roughness={0.22} />
            </mesh>
          )
        })}

        {Array.from({ length: 4 }).map((_, index) => {
          const angle = (index / 4) * Math.PI * 2
          const x = Math.cos(angle) * 1.54
          const y = Math.sin(angle) * 1.54

          return (
            <mesh
              key={`lock-bar-${index}`}
              ref={(node) => {
                if (node) barRefs.current[index] = node
              }}
              position={[x, y, 0.45]}
              rotation={[0, 0, angle]}
              scale={[0.78, 0.22, 0.14]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#8f0d1e" metalness={0.79} roughness={0.31} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export default function VaultIntro({ onComplete }: VaultIntroProps) {
  const [progress, setProgress] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const durationMs = 9700
    const started = performance.now()
    let frame = 0

    const tick = (time: number) => {
      const ratio = Math.min((time - started) / durationMs, 1)
      setProgress(ratio)

      if (ratio >= 1 && !doneRef.current) {
        doneRef.current = true
        window.setTimeout(onComplete, 500)
        return
      }

      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [onComplete])

  const phase = useMemo(() => getPhase(progress), [progress])

  return (
    <section className="vault-intro">
      <div className="vault-topline">
        <p className="mono-kicker">SECURE BOOT SEQUENCE</p>
        <button type="button" className="vault-skip" onClick={onComplete}>
          Skip intro
        </button>
      </div>

      <div className="vault-canvas-wrap">
        <Canvas dpr={[1, 2]} camera={{ position: [0, 1.2, 7.2], fov: 45 }}>
          <color attach="background" args={[phase === 'dark' ? '#020409' : '#070b14']} />
          <fog attach="fog" args={['#050913', 6, 16]} />
          <VaultScene phase={phase} progress={progress} />
        </Canvas>

        <div className="vault-overlay">
          <h1 className="text-gradient-crimson">CASHCAST VAULT</h1>
          <p>{phaseCopy(progress)}</p>
          <div className="vault-progress">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="vault-phase-pill">Phase: {phase.toUpperCase()}</div>
        </div>
      </div>
    </section>
  )
}
