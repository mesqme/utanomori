import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import heartUrl from '../assets/models/heart.glb'
import markUrl from '../assets/models/mark.glb'

// Floating reaction above the music character's head during the mini-game (3D models, world-space):
//   • each CORRECT press pops a heart (heart.glb) that floats up + fades
//   • a miss shows the exclamation mark (mark.glb) rocking left/right ("something's wrong")
// Rendered as meshes inside the companion group (Companions.jsx), so they track the head in 3D.
// Scale of each model is tunable (Game ▸ Song Game ▸ heartScale / markScale).

const HEART_LIFE = 1.4 // seconds a heart lives
const HEART_RISE = 0.9 // world units it floats up over its life
const MAX_HEARTS = 6 // pooled heart meshes (cycled)
const MARK_LIFE = 1.1 // seconds the mark rises + fades (one-shot, like a note)
const MARK_RISE = 0.7 // world units it floats up over its life
const MARK_Y_OFFSET = 0.55 // base height of the mark above the head

// The heart / mark GLBs are authored far from the origin and have no material; clone + recenter the
// geometry so it sits at the local origin and can be placed above the head.
function centeredClone(geometry) {
    const g = geometry.clone()
    g.center()
    return g
}

export default function CharacterFeedback({ headY = 1.4 }) {
    const heartGltf = useGLTF(heartUrl)
    const markGltf = useGLTF(markUrl)

    const heartGeom = useMemo(() => centeredClone(heartGltf.nodes.heart.geometry), [heartGltf])
    // The mark keeps its AUTHORED origin (its base) — NOT recentered — so it rocks like a pendulum
    // from the base instead of spinning around its centre of mass.
    const markGeom = useMemo(() => markGltf.nodes.mark.geometry.clone(), [markGltf])

    // Own materials (the GLBs ship none). Independent material per heart slot so they can fade out
    // on their own timelines.
    const heartMaterials = useMemo(
        () => Array.from({ length: MAX_HEARTS }, () => new THREE.MeshBasicMaterial({ color: '#ef5a72', transparent: true, toneMapped: false })),
        []
    )
    const markMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8553a', transparent: true, toneMapped: false }), [])

    useEffect(
        () => () => {
            heartMaterials.forEach((m) => m.dispose())
            markMaterial.dispose()
            heartGeom.dispose()
            markGeom.dispose()
        },
        [heartMaterials, markMaterial, heartGeom, markGeom]
    )

    const heartRefs = useRef([])
    const markRef = useRef(null)
    const slotsRef = useRef(Array.from({ length: MAX_HEARTS }, () => ({ active: false, start: -1 })))
    const nextSlotRef = useRef(0)
    const prevNonceRef = useRef(0)
    const markStartRef = useRef(-1)
    const markActiveRef = useRef(false)

    const lastPress = useSongGame((s) => s.lastPress)
    const stage = useSongGame((s) => s.stage)

    // Pop a heart on each correct press (start time is stamped on the next frame from the clock).
    useEffect(() => {
        if (!lastPress || lastPress.nonce === prevNonceRef.current) return
        prevNonceRef.current = lastPress.nonce
        if (!lastPress.correct) return
        const slot = slotsRef.current[nextSlotRef.current % MAX_HEARTS]
        slot.active = true
        slot.start = -1
        nextSlotRef.current += 1
    }, [lastPress])

    // Pop the mark once on a miss; it rises + fades like a note (start stamped next frame).
    useEffect(() => {
        if (stage === 'fail') {
            markActiveRef.current = true
            markStartRef.current = -1
        }
    }, [stage])

    useFrame((state) => {
        const t = state.clock.elapsedTime
        const params = useStore.getState().songGameParameters
        const heartScale = params?.heartScale ?? 0.15
        const markScale = params?.markScale ?? 0.15

        // Hearts — pop in, float up, fade out.
        for (let i = 0; i < MAX_HEARTS; i++) {
            const mesh = heartRefs.current[i]
            const slot = slotsRef.current[i]
            if (!mesh) continue
            if (!slot.active) {
                if (mesh.visible) mesh.visible = false
                continue
            }
            if (slot.start < 0) slot.start = t
            const age = t - slot.start
            if (age >= HEART_LIFE) {
                slot.active = false
                mesh.visible = false
                continue
            }
            const k = age / HEART_LIFE
            mesh.visible = true
            const pop = Math.min(1, age / 0.18)
            mesh.scale.setScalar(heartScale * pop)
            mesh.position.set(Math.sin(i * 1.7 + age * 3) * 0.12, k * HEART_RISE, 0)
            mesh.rotation.y = t * 0.8 + i
            mesh.material.opacity = pop * (1 - Math.max(0, (k - 0.6) / 0.4)) // hold, then fade after 60% life
        }

        // Mark — pops on a miss, then rises + fades like a note (no rotation).
        const mark = markRef.current
        if (mark) {
            if (markActiveRef.current) {
                if (markStartRef.current < 0) markStartRef.current = t
                const age = t - markStartRef.current
                if (age >= MARK_LIFE) {
                    markActiveRef.current = false
                    mark.visible = false
                } else {
                    const k = age / MARK_LIFE
                    mark.visible = true
                    const pop = Math.min(1, age / 0.16)
                    mark.scale.setScalar(markScale * pop)
                    mark.position.y = MARK_Y_OFFSET + k * MARK_RISE
                    mark.material.opacity = pop * (1 - Math.max(0, (k - 0.5) / 0.5)) // hold, then fade
                }
            } else if (mark.visible) {
                mark.visible = false
            }
        }
    })

    return (
        <group position={[0, headY, 0]}>
            {heartMaterials.map((mat, i) => (
                <mesh key={i} ref={(el) => (heartRefs.current[i] = el)} geometry={heartGeom} material={mat} visible={false} />
            ))}
            <mesh ref={markRef} geometry={markGeom} material={markMaterial} position={[0, MARK_Y_OFFSET, 0]} visible={false} />
        </group>
    )
}

useGLTF.preload(heartUrl)
useGLTF.preload(markUrl)
