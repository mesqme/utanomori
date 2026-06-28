import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import notesUrl from '../assets/models/notes.glb'

// The 3 authored note models (notes.glb) — they replaced the CSS glyph placeholders. A small pool
// of meshes is reused: each spawned note picks one of the 3 models, then rises + sways + grows +
// fades above the singing companion's head, billboarded to the camera.
const NOTE_NODES = ['note_01', 'note_02', 'note_03']
const POOL = 8
const AMBIENT_MIN = 0.45 // seconds between idle notes (randomized up to AMBIENT_MAX)
const AMBIENT_MAX = 0.95
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

// Recenter a note to its own origin and normalise to unit radius, so all 3 read the same on-screen
// size (noteScale controls the world size) and each scales / billboards about its centre.
function prepareNote(geometry) {
    const g = geometry.clone()
    g.computeBoundingBox()
    const center = new THREE.Vector3()
    g.boundingBox.getCenter(center)
    g.translate(-center.x, -center.y, -center.z)
    g.computeBoundingSphere()
    const radius = g.boundingSphere?.radius || 1
    g.scale(1 / radius, 1 / radius, 1 / radius)
    return g
}

export default function CompanionNotes({ headY = 1.05, isTarget = false, music = null }) {
    const { nodes } = useGLTF(notesUrl)
    const geometries = useMemo(
        () => NOTE_NODES.map((name) => (nodes[name] ? prepareNote(nodes[name].geometry) : new THREE.IcosahedronGeometry(0.5, 0))),
        [nodes]
    )
    // One material per pool slot so each note carries its own fade opacity.
    const materials = useMemo(
        () =>
            Array.from(
                { length: POOL },
                () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: false })
            ),
        []
    )
    useEffect(
        () => () => {
            geometries.forEach((g) => g?.dispose())
            materials.forEach((m) => m.dispose())
        },
        [geometries, materials]
    )

    const groupRef = useRef(null)
    const meshRefs = useRef([])
    const slots = useRef(Array.from({ length: POOL }, () => ({ active: false, geom: 0, start: 0, rx: 0, rz: 0, spin: 0 })))
    const prevActiveRef = useRef(null)
    const gameKeyRef = useRef(0)
    const lastKeyRef = useRef(null)
    const nextAmbientRef = useRef(0)
    const tmpColor = useMemo(() => new THREE.Color(), [])
    const parentInvQuat = useMemo(() => new THREE.Quaternion(), [])

    const spawn = (index, t, spread) => {
        const slot = slots.current.find((s) => !s.active)
        if (!slot) return
        slot.active = true
        slot.geom = ((index % NOTE_NODES.length) + NOTE_NODES.length) % NOTE_NODES.length
        slot.start = t
        slot.rx = (Math.random() - 0.5) * spread * 2
        slot.rz = (Math.random() - 0.5) * spread
        slot.spin = (Math.random() - 0.5) * 0.6
    }

    useFrame((state) => {
        const songGame = useSongGame.getState()
        const p = useStore.getState().songGameParameters
        const t = state.clock.elapsedTime
        const wobble = p.noteWobbleWorld ?? 0.22

        // --- Spawn timing (unchanged): the target mirrors the demonstrated sequence; otherwise a
        // gentle ambient "is singing" stream; stay quiet while another companion is mid-game. ---
        if (isTarget && songGame.active) {
            const active = songGame.stage === 'playback' ? songGame.activeNote : null
            if (active != null && prevActiveRef.current == null) gameKeyRef.current++
            prevActiveRef.current = active
            const key = active != null ? `g${gameKeyRef.current}` : null
            if (key != null && key !== lastKeyRef.current) {
                lastKeyRef.current = key
                spawn(active, t, wobble)
            } else if (key == null) {
                lastKeyRef.current = null
            }
            nextAmbientRef.current = 0
        } else if (!songGame.active) {
            if (nextAmbientRef.current === 0 || t >= nextAmbientRef.current) {
                if (nextAmbientRef.current !== 0) spawn(Math.floor(Math.random() * NOTE_NODES.length), t, wobble)
                nextAmbientRef.current = t + AMBIENT_MIN + Math.random() * (AMBIENT_MAX - AMBIENT_MIN)
            }
        }

        // --- Animate the active notes ---
        const duration = Math.max(0.2, p.noteDuration ?? 1.5)
        const rise = p.noteRiseWorld ?? 1.1
        const baseScale = p.noteScale ?? 0.22
        const grow = p.noteGrow ?? 1.8
        // Each companion's notes match its body colour (the sheep's `orange` material = char_Body);
        // fall back to the global noteColor if this companion has no music character.
        const bodyColor = music ? useStore.getState().sheepMaterialParameters?.characters?.[music]?.orange?.baseColor : null
        tmpColor.set(bodyColor ?? p.noteColor ?? '#e8ecff')

        // Local billboard quaternion = (parent world rotation)⁻¹ · camera world rotation, so the
        // notes face the camera despite the companion group's yaw.
        if (groupRef.current) {
            groupRef.current.getWorldQuaternion(parentInvQuat)
            parentInvQuat.invert().multiply(state.camera.quaternion)
        }

        for (let i = 0; i < POOL; i++) {
            const slot = slots.current[i]
            const mesh = meshRefs.current[i]
            if (!mesh) continue
            if (!slot.active) {
                mesh.visible = false
                continue
            }
            const age = (t - slot.start) / duration
            if (age >= 1) {
                slot.active = false
                mesh.visible = false
                continue
            }

            mesh.visible = true
            mesh.geometry = geometries[slot.geom]

            const fadeIn = THREE.MathUtils.smoothstep(age, 0, 0.18)
            const fadeOut = 1 - THREE.MathUtils.smoothstep(age, 0.6, 1)
            materials[i].opacity = fadeIn * fadeOut
            materials[i].color.copy(tmpColor)

            const sway = Math.sin(age * Math.PI * 2 + slot.spin * 6) * wobble * (1 - age)
            mesh.position.set(slot.rx + sway, headY + rise * age, slot.rz)
            mesh.scale.setScalar(baseScale * THREE.MathUtils.lerp(0.4, grow, easeOut(age)))
            mesh.quaternion.copy(parentInvQuat)
            mesh.rotateZ(slot.spin * age * 2) // gentle in-plane tumble
        }
    })

    return (
        <group ref={groupRef}>
            {materials.map((material, i) => (
                <mesh
                    key={i}
                    ref={(el) => (meshRefs.current[i] = el)}
                    geometry={geometries[0]}
                    material={material}
                    visible={false}
                    frustumCulled={false}
                    renderOrder={20}
                />
            ))}
        </group>
    )
}

useGLTF.preload(notesUrl)
