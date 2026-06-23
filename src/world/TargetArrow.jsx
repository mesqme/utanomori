import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { getGroundY } from './utils/groundHeight.js'
import arrowModelUrl from '../assets/models/arrow.glb'

const smoothstep = THREE.MathUtils.smoothstep
const _frontEuler = new THREE.Euler()
const _overheadEuler = new THREE.Euler()
const _frontQuat = new THREE.Quaternion()
const _overheadQuat = new THREE.Quaternion()
const _frontPos = new THREE.Vector3()
const _overheadPos = new THREE.Vector3()

// A single arrow (arrow.glb, forward = local -X, origin behind it). It floats in front of the
// hero pointing at the hidden companion at ANY distance; once close it travels high above the
// companion, points down and spins. It fades (scales) in/out on spawn, collection, relocation
// and during the mini-game rather than popping or teleporting between targets.
export default function TargetArrow() {
    const groupRef = useRef(null)
    const spinRef = useRef(null)
    const spinAngleRef = useRef(0)
    const presenceRef = useRef(0) // 0..1 fade weight (drives scale) for spawn / collect / relocate / mini-game
    const displayRef = useRef(null) // { key, x, z } the arrow currently points at; only swapped while faded out
    const arrow = useStore((state) => state.arrowParameters)

    const { nodes } = useGLTF(arrowModelUrl)
    // Render last / on top: transparent pass + no depth test/write so the grass (also
    // transparent, drawn after the opaque pass) never paints over the arrow.
    const material = useMemo(
        () =>
            new THREE.MeshBasicMaterial({
                color: '#ffffff',
                toneMapped: false,
                side: THREE.DoubleSide,
                transparent: true,
                depthTest: false,
                depthWrite: false,
            }),
        []
    )
    useEffect(() => () => material.dispose(), [material])
    // Colour is static (and Leva-tunable) — set it on change instead of re-parsing every frame.
    useEffect(() => {
        material.color.set(arrow.color)
    }, [material, arrow.color])

    useFrame((state, delta) => {
        const group = groupRef.current
        const spin = spinRef.current
        if (!group || !spin) return

        const dt = Math.min(delta, 0.1)

        // Which companion (if any) the arrow should be guiding to right now. A lost target,
        // the mini-game, or leaving the gameplay phase all mean "fade away".
        const target = useCompanions.getState().target
        const live = usePhases.getState().phase === PHASES.start && !!target && !useSongGame.getState().active
        const desired = live ? target : null

        // Crossfade, not pop/teleport: only adopt a new target (spawn / relocate / collect) once
        // the arrow has faded out, so every change plays as fade-out → fade-in in place instead of
        // popping into existence or sliding across the world to the new companion.
        const cur = displayRef.current
        const changed = desired ? !cur || cur.key !== desired.key || cur.x !== desired.x || cur.z !== desired.z : !!cur
        let presenceTo = 1
        if (!cur) {
            if (desired) displayRef.current = { key: desired.key, x: desired.x, z: desired.z }
            else presenceTo = 0
        } else if (changed) {
            presenceTo = 0
            if (presenceRef.current < 0.02) displayRef.current = desired ? { key: desired.key, x: desired.x, z: desired.z } : null
        }
        presenceRef.current = THREE.MathUtils.damp(presenceRef.current, presenceTo, 10, dt)

        // No companion to point at (faded fully out / between targets) — hide and reset.
        const display = displayRef.current
        if (!display) {
            group.visible = false
            spinAngleRef.current = 0 // reset the roll so the next companion's arrow appears level
            return
        }
        group.visible = true

        const hero = useStore.getState().ballPosition
        let dx = display.x - hero.x
        let dz = display.z - hero.z
        const distance = Math.hypot(dx, dz) || 1
        dx /= distance
        dz /= distance

        // Overhead blend: 0 = far (in front of the hero) → 1 = above the companion.
        const closeInner = arrow.closeRadius - arrow.closeBand
        const b = 1 - smoothstep(distance, closeInner, arrow.closeRadius)

        const heading = Math.atan2(dx, dz) + THREE.MathUtils.degToRad(arrow.modelYaw)

        // Far state: floating in front of the hero, flat, pointing at the target.
        const fx = hero.x + dx * arrow.distance
        const fz = hero.z + dz * arrow.distance
        _frontPos.set(fx, getGroundY(fx, fz) + arrow.yOffset, fz)
        _frontEuler.set(0, heading, 0)
        _frontQuat.setFromEuler(_frontEuler)

        // Overhead state: high above the companion, tipped to point straight down (-X → -Y).
        // The spin is NOT baked in here — it's a separate child rotation about the arrow's own
        // long axis (below). Keeping the same heading yaw makes the front→overhead blend a pure
        // tilt, so the off-origin geometry doesn't swing around the origin during the transition.
        _overheadPos.set(display.x, getGroundY(display.x, display.z) + arrow.overheadHeight, display.z)
        _overheadEuler.set(0, heading, Math.PI / 2)
        _overheadQuat.setFromEuler(_overheadEuler)

        // Blend front → overhead aim + position + a bob (a touch more once overhead).
        _frontPos.lerp(_overheadPos, b)
        _frontPos.y += Math.sin(state.clock.elapsedTime * arrow.floatSpeed) * arrow.floatAmount * (0.35 + 0.65 * b)
        group.position.copy(_frontPos)
        group.quaternion.copy(_frontQuat.slerp(_overheadQuat, b))

        // Spin about the arrow's own long axis (local X — the shaft the geometry is modelled
        // along), on the inner group so the off-origin geometry spins IN PLACE at every tilt,
        // not only when fully overhead. Ramp the rate in with the overhead blend `b` so it
        // starts slow on approach and reaches full speed above the companion. Decoupling the
        // spin from the aim quaternion also kills the once-per-revolution slerp flip.
        spinAngleRef.current += dt * arrow.spinSpeed * b
        // Back in the far/flat state the spin releases: ease the roll to the nearest full turn
        // (settles by ≤ half a turn instead of unwinding) so the arrow lands level — roll 0,
        // parallel to the ground. The settle fades out toward overhead so it never fights the spin.
        const level = Math.round(spinAngleRef.current / (Math.PI * 2)) * (Math.PI * 2)
        spinAngleRef.current = THREE.MathUtils.damp(spinAngleRef.current, level, 6 * (1 - b), dt)
        spin.rotation.x = spinAngleRef.current

        // Fade weight drives scale (spawn / collect / relocate / mini-game all faded above).
        group.scale.setScalar(arrow.scale * presenceRef.current)
    })

    return (
        <group ref={groupRef}>
            {/* Inner group spins about the arrow's local X (the shaft) so the off-origin
                geometry rotates in place; the outer group only positions + aims it. */}
            <group ref={spinRef}>
                <mesh geometry={nodes.arrow?.geometry} material={material} renderOrder={1000} frustumCulled={false} />
            </group>
        </group>
    )
}

useGLTF.preload(arrowModelUrl)
