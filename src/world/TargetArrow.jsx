import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

import useStore from '../stores/useStore.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

// Floating 3D arrow above the hero that points toward the hidden target.
// Geometry points along +Z so a Y rotation of atan2(dx, dz) aims it at the goal.
export default function TargetArrow() {
    const groupRef = useRef(null)
    const pulseRef = useRef(null)

    useFrame((state) => {
        const group = groupRef.current
        if (!group) return

        const companions = useCompanions.getState()
        const inStart = usePhases.getState().phase === PHASES.start
        const visible = inStart && companions.target && !companions.targetInRange
        group.visible = Boolean(visible)
        if (!visible) return

        const player = useStore.getState().ballPosition
        const target = companions.target
        const dx = target.x - player.x
        const dz = target.z - player.z

        group.position.set(player.x, player.y + 2.3, player.z)
        group.rotation.y = Math.atan2(dx, dz)

        if (pulseRef.current) {
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12
            pulseRef.current.scale.setScalar(pulse)
            pulseRef.current.position.z = 0.1 + Math.sin(state.clock.elapsedTime * 6) * 0.08
        }
    })

    return (
        <group ref={groupRef} visible={false}>
            <group ref={pulseRef}>
                <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.07, 0.07, 0.55, 10]} />
                    <meshStandardMaterial color={soundJourneyPalette.lantern} emissive={soundJourneyPalette.lantern} emissiveIntensity={0.8} roughness={0.5} />
                </mesh>
                <mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.2, 0.4, 14]} />
                    <meshStandardMaterial color={soundJourneyPalette.lantern} emissive={soundJourneyPalette.lantern} emissiveIntensity={0.8} roughness={0.5} />
                </mesh>
            </group>
        </group>
    )
}
