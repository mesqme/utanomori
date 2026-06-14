import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Placeholder secondary character — a single squashed sphere. The body colour and a
 * per-creature blink seed are baked as geometry attributes; the eyes (white circles
 * + animated black pupils) are drawn entirely in the material via a front projection
 * (see CompanionEyeMaterial). No geometry but the sphere. Swap for a Blender GLB later.
 */
function hashToUnit(text) {
    let hash = 2166136261
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }
    return ((hash >>> 0) % 10000) / 10000
}

function buildCreatureGeometry(definition) {
    const geometry = new THREE.SphereGeometry(0.5, 28, 20)
    geometry.scale(1, 0.92, 1)

    const color = new THREE.Color(definition.bodyColor)
    const seed = hashToUnit(definition.id ?? 'companion')
    const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3)
    const seeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
        seeds[i] = seed
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return geometry
}

// Sphere is 0.5 radius scaled to 0.92 on Y → 0.46 half-height. Lift the mesh by that
// (× scale) so the blob sits on the ground instead of sinking into it. The geometry
// stays centred at the origin so the front-projected eyes stay put.
const BODY_HALF_HEIGHT = 0.46

export default function CompanionCreature({ definition, material }) {
    const geometry = useMemo(() => buildCreatureGeometry(definition), [definition])
    const scale = definition.scale ?? 0.5

    useEffect(() => () => geometry.dispose(), [geometry])

    return <mesh geometry={geometry} material={material} scale={scale} position-y={BODY_HALF_HEIGHT * scale} />
}
