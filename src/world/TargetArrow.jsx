import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { musicStonePointer } from './state/musicStonePointer.js'
import arrowModelUrl from '../assets/models/arrow.glb'

const smoothstep = THREE.MathUtils.smoothstep
const FLASH_GREEN = new THREE.Color('#46e06a')
const FLASH_RED = new THREE.Color('#ff4d4d')
const PRESS_FLASH_TIME = 0.6 // seconds the arrow holds its green/red press tint
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
    const presenceRef = useRef(0) // 0..1 fade weight (drives scale) for spawn / collect / relocate
    const displayRef = useRef(null) // { key, x, z } the arrow currently points at; only swapped while faded out
    const gameWeightRef = useRef(0) // 0 = gameplay aim, 1 = Simon-game orbit pose (smooth blend)
    const prevPressNonceRef = useRef(0)
    const pressFlashRef = useRef(0) // 0..1 green/red tint weight after a press
    const flashColorRef = useMemo(() => new THREE.Color(), [])
    const baseColorRef = useMemo(() => new THREE.Color('#ffffff'), [])
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
    // The frame loop tints it green/red briefly on a press, then back to this base.
    useEffect(() => {
        baseColorRef.set(arrow.color)
        material.color.set(arrow.color)
    }, [material, arrow.color, baseColorRef])

    useFrame((state, delta) => {
        const group = groupRef.current
        const spin = spinRef.current
        if (!group || !spin) return

        const dt = Math.min(delta, 0.1)

        // Blend weight toward the Simon-game orbit pose — the SAME arrow flies from the gameplay
        // aim to the stones and back, never popping/disappearing.
        gameWeightRef.current = THREE.MathUtils.damp(gameWeightRef.current, musicStonePointer.active ? 1 : 0, 8, dt)
        const gw = gameWeightRef.current

        // Which companion (if any) the arrow should be guiding to right now. It stays live during
        // the mini-game too (the companion is still the target) — the game weight handles the pose.
        const target = useCompanions.getState().target
        // Hide the arrow once a song dialogue/mini-game has begun but before the stones start
        // singing (the pointer pose isn't active yet) — it reappears pointing at the notes.
        const inDialogue = useSongGame.getState().active && !musicStonePointer.active
        const live = usePhases.getState().phase === PHASES.start && !!target && !inDialogue
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

        // Visible if there's a gameplay target OR the Simon pose is active / still blending.
        const presence = Math.max(presenceRef.current, gw)
        const display = displayRef.current
        if (!display && gw < 0.02) {
            group.visible = false
            spinAngleRef.current = 0 // reset the roll so the next companion's arrow appears level
            return
        }
        group.visible = true

        if (display) {
            const hero = useStore.getState().heroPosition
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
            _frontPos.set(fx, arrow.yOffset, fz)
            _frontEuler.set(0, heading, 0)
            _frontQuat.setFromEuler(_frontEuler)

            // Overhead state: high above the companion, tipped to point straight down (-X → -Y).
            _overheadPos.set(display.x, arrow.overheadHeight, display.z)
            _overheadEuler.set(0, heading, Math.PI / 2)
            _overheadQuat.setFromEuler(_overheadEuler)

            // Blend front → overhead aim + position + a bob (a touch more once overhead).
            _frontPos.lerp(_overheadPos, b)
            _frontPos.y += Math.sin(state.clock.elapsedTime * arrow.floatSpeed) * arrow.floatAmount * (0.35 + 0.65 * b)
            _frontQuat.slerp(_overheadQuat, b)

            // Spin about the arrow's own long axis — ramps with the overhead blend `b` AND fades
            // out as we move into the game (gw), settling level there.
            spinAngleRef.current += dt * arrow.spinSpeed * b * (1 - gw)
            const level = Math.round(spinAngleRef.current / (Math.PI * 2)) * (Math.PI * 2)
            spinAngleRef.current = THREE.MathUtils.damp(spinAngleRef.current, level, 6 * (1 - b) + 8 * gw, dt)
            spin.rotation.x = spinAngleRef.current

            // Blend the gameplay pose → the Simon-game orbit pose by the game weight.
            group.position.copy(_frontPos).lerp(musicStonePointer.position, gw)
            group.quaternion.copy(_frontQuat).slerp(musicStonePointer.quaternion, gw)
        } else {
            // No gameplay target but the Simon pose is active (or decaying back) — use it directly.
            group.position.copy(musicStonePointer.position)
            group.quaternion.copy(musicStonePointer.quaternion)
            spin.rotation.x = 0
        }

        // Press feedback: tint the arrow green (correct) / red (incorrect), fading back to base.
        const press = useSongGame.getState().lastPress
        if (press && press.nonce !== prevPressNonceRef.current) {
            prevPressNonceRef.current = press.nonce
            flashColorRef.copy(press.correct ? FLASH_GREEN : FLASH_RED)
            pressFlashRef.current = 1
        }
        if (pressFlashRef.current > 0) {
            pressFlashRef.current = Math.max(0, pressFlashRef.current - dt / PRESS_FLASH_TIME)
            material.color.copy(baseColorRef).lerp(flashColorRef, pressFlashRef.current)
        } else {
            material.color.copy(baseColorRef)
        }

        // Fade weight drives scale (full during gameplay target or the game). During the game the
        // appear-fade makes it pop in at each new note instead of sliding there.
        const appear = THREE.MathUtils.lerp(1, musicStonePointer.appear ?? 1, gw)
        group.scale.setScalar(arrow.scale * presence * appear)
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
