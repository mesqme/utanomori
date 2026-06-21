import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { getGroundY } from './utils/groundHeight.js'

// A single chevron band lying flat on the ground (XZ plane), pointing +Z. It's stroked
// as one mitered "V": the two arms meet at a sharp outer tip (ahead) and an inner tip
// (behind), so the geometry never overlaps itself — the alpha no longer doubles up where
// the two lines used to cross.
function buildArrowGeometry(size, width) {
    const angle = 0.62 // half-angle of the chevron
    const half = width / 2
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const sx = s * size
    const sz = c * size

    const outerTip = [0, half / s] // sharp point ahead (+z)
    const innerTip = [0, -half / s] // point behind the joint
    const lOut = [-sx - c * half, -sz + s * half]
    const lIn = [-sx + c * half, -sz - s * half]
    const rOut = [sx - c * half, -sz - s * half]
    const rIn = [sx + c * half, -sz + s * half]

    const positions = []
    const quad = (a, b, cc, d) => {
        positions.push(a[0], 0, a[1], b[0], 0, b[1], cc[0], 0, cc[1])
        positions.push(a[0], 0, a[1], cc[0], 0, cc[1], d[0], 0, d[1])
    }
    quad(lOut, outerTip, innerTip, lIn) // left arm
    quad(outerTip, rOut, rIn, innerTip) // right arm

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
        const baseVisible = usePhases.getState().phase === PHASES.start && !!target && !companions.targetInRange
        if (!baseVisible) {
            mesh.visible = false
            return
        }

        const hero = useStore.getState().ballPosition
        let dx = target.x - hero.x
        let dz = target.z - hero.z
        const distance = Math.hypot(dx, dz) || 1

        // Only reveal the arrow once you are within range — far away you search yourself.
        if (distance > arrow.revealDistance) {
            mesh.visible = false
            return
        }
        mesh.visible = true

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
