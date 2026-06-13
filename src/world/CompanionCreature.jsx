import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Placeholder secondary-character mesh — a rounded blob body with big readable
 * eyes and optional ears, matching the concept art. All sub-shapes are baked into
 * ONE merged geometry with vertex colours, so each creature is a single draw call.
 * Replace with a Blender GLB later (keyed by `definition.id`).
 *
 * The parent group owns position / rotation; this only describes the visual,
 * scaled by `definition.scale` and standing on the local ground plane.
 */
function colored(geometry, hex) {
    const color = new THREE.Color(hex)
    const count = geometry.attributes.position.count
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
}

function buildCreatureGeometry({ bodyColor, accentColor, pupilColor, ears = 'none' }) {
    const parts = []

    // Body
    parts.push(colored(new THREE.SphereGeometry(0.5, 18, 16).scale(1, 0.9, 1).translate(0, 0.45, 0), bodyColor))
    // Belly highlight
    parts.push(colored(new THREE.SphereGeometry(0.5, 14, 12).scale(0.6, 0.5, 0.4).translate(0, 0.33, 0.34), accentColor))

    // Eyes (sclera + pupil) on both sides
    for (const x of [-0.18, 0.18]) {
        parts.push(colored(new THREE.SphereGeometry(0.13, 14, 12).translate(x, 0.55, 0.4), '#fff8ff'))
        parts.push(colored(new THREE.SphereGeometry(0.06, 12, 10).translate(x, 0.55, 0.5), pupilColor))
    }

    // Ears
    if (ears === 'round') {
        for (const x of [-0.24, 0.24]) {
            parts.push(colored(new THREE.SphereGeometry(0.17, 12, 10).scale(0.8, 1, 0.8).translate(x, 0.92, 0), bodyColor))
        }
    } else if (ears === 'cat') {
        for (const x of [-0.24, 0.24]) {
            parts.push(colored(new THREE.ConeGeometry(0.14, 0.32, 4).rotateZ(x > 0 ? -0.2 : 0.2).translate(x, 0.95, 0), bodyColor))
        }
    }

    const merged = mergeGeometries(parts, false)
    parts.forEach((part) => part.dispose())
    return merged
}

export default function CompanionCreature({ definition }) {
    const geometry = useMemo(() => buildCreatureGeometry(definition), [definition])
    const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }), [])

    useEffect(() => () => geometry.dispose(), [geometry])
    useEffect(() => () => material.dispose(), [material])

    return <mesh geometry={geometry} material={material} scale={definition.scale ?? 0.5} castShadow />
}
