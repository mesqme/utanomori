import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { getGroundY } from './utils/groundHeight.js'

// A thin quad (in the XZ plane, y = 0) from a→b with the given width.
function pushQuad(arr, ax, az, bx, bz, width) {
    const dx = bx - ax
    const dz = bz - az
    const len = Math.hypot(dx, dz) || 1
    const px = (dz / len) * (width / 2)
    const pz = (-dx / len) * (width / 2)
    arr.push(ax + px, 0, az + pz, ax - px, 0, az - pz, bx - px, 0, bz - pz)
    arr.push(ax + px, 0, az + pz, bx - px, 0, bz - pz, bx + px, 0, bz + pz)
}

// Two-line chevron lying flat on the ground, tip at the local origin pointing +Z.
function buildArrowGeometry(size, width) {
    const angle = 0.62 // half-angle of the chevron
    const sx = Math.sin(angle) * size
    const sz = Math.cos(angle) * size
    const positions = []
    pushQuad(positions, 0, 0, -sx, -sz, width)
    pushQuad(positions, 0, 0, sx, -sz, width)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
}

// Ground pointer toward the current hidden companion: a flat 2-line white arrow that
// sits just in front of the hero, aligned to the surface, fading with distance.
export default function TargetArrow() {
    const meshRef = useRef(null)
    const arrow = useStore((state) => state.arrowParameters)

    const geometry = useMemo(() => buildArrowGeometry(arrow.size, arrow.width), [arrow.size, arrow.width])
    const material = useMemo(
        () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
        []
    )

    useEffect(() => () => geometry.dispose(), [geometry])
    useEffect(() => () => material.dispose(), [material])

    useFrame(() => {
        const mesh = meshRef.current
        if (!mesh) return

        const companions = useCompanions.getState()
        const target = companions.target
        const visible = usePhases.getState().phase === PHASES.start && !!target && !companions.targetInRange
        mesh.visible = visible
        if (!visible) return

        const hero = useStore.getState().ballPosition
        let dx = target.x - hero.x
        let dz = target.z - hero.z
        const distance = Math.hypot(dx, dz) || 1
        dx /= distance
        dz /= distance

        const px = hero.x + dx * arrow.distance
        const pz = hero.z + dz * arrow.distance
        mesh.position.set(px, getGroundY(px, pz) + arrow.yOffset, pz)
        mesh.rotation.y = Math.atan2(dx, dz) // local +Z faces the target

        const t = THREE.MathUtils.clamp((arrow.fadeFar - distance) / Math.max(arrow.fadeFar - arrow.fadeNear, 0.001), 0, 1)
        material.opacity = THREE.MathUtils.lerp(arrow.minOpacity, arrow.maxOpacity, t)
        material.color.set(arrow.color)
    })

    return <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={3} frustumCulled={false} />
}
