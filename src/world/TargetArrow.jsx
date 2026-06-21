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
// companion, points down and spins; when the mini-game starts it scales away.
export default function TargetArrow() {
    const groupRef = useRef(null)
    const interactScaleRef = useRef(1)
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

    useFrame((state, delta) => {
        const group = groupRef.current
        if (!group) return

        const target = useCompanions.getState().target
        if (usePhases.getState().phase !== PHASES.start || !target) {
            group.visible = false
            interactScaleRef.current = 1
            return
        }
        group.visible = true

        const hero = useStore.getState().ballPosition
        let dx = target.x - hero.x
        let dz = target.z - hero.z
        const distance = Math.hypot(dx, dz) || 1
        dx /= distance
        dz /= distance

        // Overhead blend: 0 = far (in front of the hero) → 1 = above the companion.
        const closeInner = arrow.closeRadius - arrow.closeBand
        const b = 1 - smoothstep(distance, closeInner, arrow.closeRadius)

        // Far state: floating in front of the hero, flat, pointing at the target.
        const fx = hero.x + dx * arrow.distance
        const fz = hero.z + dz * arrow.distance
        _frontPos.set(fx, getGroundY(fx, fz) + arrow.yOffset, fz)
        _frontEuler.set(0, Math.atan2(dx, dz) + THREE.MathUtils.degToRad(arrow.modelYaw), 0)
        _frontQuat.setFromEuler(_frontEuler)

        // Overhead state: high above the companion, pointing straight down (-X → -Y), spinning.
        _overheadPos.set(target.x, getGroundY(target.x, target.z) + arrow.overheadHeight, target.z)
        _overheadEuler.set(0, state.clock.elapsedTime * arrow.spinSpeed, Math.PI / 2)
        _overheadQuat.setFromEuler(_overheadEuler)

        // Blend front → overhead + a bob (a touch more once overhead).
        _frontPos.lerp(_overheadPos, b)
        _frontPos.y += Math.sin(state.clock.elapsedTime * arrow.floatSpeed) * arrow.floatAmount * (0.35 + 0.65 * b)
        group.position.copy(_frontPos)
        group.quaternion.copy(_frontQuat.slerp(_overheadQuat, b))

        // Scale away while the mini-game is active.
        const active = useSongGame.getState().active
        interactScaleRef.current = THREE.MathUtils.damp(interactScaleRef.current, active ? 0 : 1, 10, Math.min(delta, 0.1))
        group.scale.setScalar(arrow.scale * interactScaleRef.current)

        material.color.set(arrow.color)
    })

    return (
        <group ref={groupRef}>
            <mesh geometry={nodes.arrow?.geometry} material={material} renderOrder={1000} frustumCulled={false} />
        </group>
    )
}

useGLTF.preload(arrowModelUrl)
