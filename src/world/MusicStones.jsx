import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { createPropStylizedMaterial, updatePropStylizedMaterial } from '../materials/PropStylizedMaterial.js'
import { createStoneGeometry } from './utils/stoneGeometry.js'
import { MUSIC_STONE_VARIANTS } from '../config/objectFieldDefaults.js'
import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import { revealCircle } from './utils/revealCircle.js'
import { getRefScale } from './utils/screenScale.js'
import { getGroundY } from './utils/groundHeight.js'
import { seeThrough } from './utils/seeThrough.js'
import { musicStoneSeeThrough, clearMusicStoneSeeThrough, MAX_STONE_SEE_THROUGH } from './utils/musicStoneSeeThrough.js'
import { musicStonePointer } from './utils/musicStonePointer.js'
import { clearAllMusicStones } from './utils/musicStoneField.js'
import { cameraRig } from '../game/cameraRig.js'
import { playNote } from '../game/songAudio.js'
import stonesModelUrl from '../assets/models/stones.glb'

// Seven coloured stones that stage the song mini-game in 3D: they rise around the singing
// companion (one per note), the camera lifts to a top-down view, each played note flashes its
// stone, and the player clicks the stones to repeat the song. On teardown they sink and the
// grass recovers. State comes from useSongGame; the stones are the presentation + input.
const COUNT = 7
const STAGED = new Set(['setup', 'playback', 'input', 'roundClear', 'success', 'fail'])
const REVEAL_FACTOR_ALWAYS = 1000 // focal element → never fade at the reveal-circle edge
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

export default function MusicStones() {
    const { nodes } = useGLTF(stonesModelUrl)
    const textureName = useStore((s) => s.objectParameters.textureName)
    const painterlyTextures = useTexture(PAINTERY_TEXTURE_URL_LIST)
    const painterlyTexture = useMemo(() => {
        const t = painterlyTextures[painteryTextureIndex(textureName)] ?? painterlyTextures[0]
        t.wrapS = THREE.RepeatWrapping
        t.wrapT = THREE.RepeatWrapping
        t.colorSpace = THREE.NoColorSpace
        t.needsUpdate = true
        return t
    }, [painterlyTextures, textureName])

    // One mesh per music stone: GLB geometry (baked/recentred like ordinary stones) + its own
    // prop stylized material (colour via uBaseColor, fresnel rim, painterly).
    const stones = useMemo(() => {
        return MUSIC_STONE_VARIANTS.map((variant) => {
            const node = nodes[variant.node]
            const geometry = node ? createStoneGeometry(node) : new THREE.IcosahedronGeometry(0.5, 1)
            const material = createPropStylizedMaterial(painterlyTexture, { toneMapped: true })
            return { geometry, material, safeRadius: variant.diameter * 0.5 }
        })
        // Built once the GLB is ready; texture is swapped in place below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes])

    useEffect(() => {
        stones.forEach((s) => {
            if (s.material.uniforms.uPainterlyTexture) s.material.uniforms.uPainterlyTexture.value = painterlyTexture
        })
    }, [stones, painterlyTexture])

    useEffect(() => () => {
        stones.forEach((s) => {
            s.geometry.dispose()
            s.material.dispose()
        })
        clearAllMusicStones()
        clearMusicStoneSeeThrough()
        musicStonePointer.active = false
    }, [stones])

    const meshRefs = useRef([])
    const scaleRef = useRef(new Array(COUNT).fill(0)) // animated rise progress 0..1
    const flashRef = useRef(new Array(COUNT).fill(0)) // flash decay 0..1
    const hoverRef = useRef(new Array(COUNT).fill(false)) // pointer is over a clickable stone
    const prevNoteRef = useRef(null)
    const layoutRef = useRef(null) // { cx, cz, facing } captured when staging begins
    const stageStartRef = useRef(0)
    const rotations = useMemo(() => Array.from({ length: COUNT }, () => Math.random() * Math.PI * 2), [])
    const baseColor = useMemo(() => new THREE.Color(), [])
    const tmpColor = useMemo(() => new THREE.Color(), [])

    // Pointer pose: MusicStones computes the Simon-game pose (orbit angle spring + radius poke +
    // screen-plane orientation) and writes it to the shared musicStonePointer; the SINGLE arrow in
    // TargetArrow renders + blends it with the gameplay aim (so it's the same arrow, never popping).
    const pointerWasVisibleRef = useRef(false)
    const pointerAngleRef = useRef(0) // current orbit angle (spring)
    const pointerAngVelRef = useRef(0) // angular velocity (spring)
    const pointerTargetRef = useRef(-1) // persisted target note (last singing/hovered)
    const pointerPulseRef = useRef(0) // remaining time of a radius "poke" (same-note / press)
    const pointerTargetPos = useMemo(() => new THREE.Vector3(), [])
    // Temps for orienting the arrow in the screen plane.
    const ptrRadial = useMemo(() => new THREE.Vector3(), [])
    const ptrForward = useMemo(() => new THREE.Vector3(), [])
    const ptrInPlane = useMemo(() => new THREE.Vector3(), [])
    const ptrX = useMemo(() => new THREE.Vector3(), [])
    const ptrY = useMemo(() => new THREE.Vector3(), [])
    const ptrZ = useMemo(() => new THREE.Vector3(), [])
    const ptrBasis = useMemo(() => new THREE.Matrix4(), [])

    // Temps for projecting the bottom stones to see-through holes (framebuffer px).
    const stCenter = useMemo(() => new THREE.Vector3(), [])
    const stEdge = useMemo(() => new THREE.Vector3(), [])
    const stRight = useMemo(() => new THREE.Vector3(), [])
    const stBuffer = useMemo(() => new THREE.Vector2(), [])

    useFrame((state, delta) => {
        const dt = Math.min(delta, 0.05)
        const game = useSongGame.getState()
        const store = useStore.getState()
        const p = store.musicStoneParameters
        const staged = game.active && STAGED.has(game.stage) && !!game.companion

        // Capture the layout (companion centre) when staging begins.
        if (staged && !layoutRef.current) {
            layoutRef.current = { cx: game.companion.x, cz: game.companion.z }
            stageStartRef.current = state.clock.elapsedTime
        }

        // Camera: rise to a top-down shot over the companion while the stones are present
        // (through the sink-out too); restore to follow only once they're fully gone.
        const layout = layoutRef.current
        if (layout) {
            cameraRig.mode = 'orbit'
            cameraRig.centerX = layout.cx
            cameraRig.centerZ = layout.cz
            cameraRig.angle = 0 // fixed azimuth (same as the follow shot) → the lift doesn't rotate
            cameraRig.height = p.cameraHeight
            cameraRig.distance = p.cameraDistance
            cameraRig.targetYOffset = p.hoverHeight + p.radius * 0.5 // look at the rainbow's middle
            cameraRig.lerpSpeed = p.cameraLerp
        } else if (cameraRig.centerX !== null) {
            cameraRig.mode = 'follow'
            cameraRig.centerX = null
            cameraRig.centerZ = null
            cameraRig.lerpSpeed = 5
        }

        // Flash the matching stone when a new note plays.
        if (game.activeNote !== prevNoteRef.current) {
            if (game.activeNote != null && game.activeNote >= 0 && game.activeNote < COUNT) {
                flashRef.current[game.activeNote] = 1
                // Same note replayed: the arrow won't rotate, so poke its radius to show the hit.
                if (game.activeNote === pointerTargetRef.current) pointerPulseRef.current = p.pointerPulseDuration
            }
            prevNoteRef.current = game.activeNote
        }

        // No layout (idle): everything sunk → hide, clear the grass discs, leave the camera.
        if (!layout) {
            clearAllMusicStones()
            clearMusicStoneSeeThrough()
            musicStonePointer.active = false
            for (let i = 0; i < COUNT; i++) {
                const m = meshRefs.current[i]
                if (m) m.visible = false
            }
            return
        }

        const sinceStart = state.clock.elapsedTime - stageStartRef.current
        const inRate = dt / Math.max(0.05, p.scaleInDuration)
        const outRate = dt / Math.max(0.05, p.scaleOutDuration)

        // Rainbow basis: the arc lives in a vertical plane whose horizontal axis ('right') is
        // perpendicular to the camera azimuth, so it faces the camera. Y is the vertical axis.
        const groundY = getGroundY(layout.cx, layout.cz)
        const rightX = Math.cos(cameraRig.angle)
        const rightZ = -Math.sin(cameraRig.angle)

        let allDown = true
        for (let i = 0; i < COUNT; i++) {
            const mesh = meshRefs.current[i]
            if (!mesh) continue

            // Staggered target: each stone starts rising a beat after the previous (left→right).
            const started = staged && sinceStart >= i * p.staggerDelay
            const target = started ? 1 : 0
            let s = scaleRef.current[i]
            if (s < target) s = Math.min(target, s + inRate)
            else s = Math.max(target, s - outRate)
            scaleRef.current[i] = s
            if (s > 0.001) allDown = false

            // Flash decay.
            flashRef.current[i] = Math.max(0, flashRef.current[i] - dt / Math.max(0.02, p.flashDuration))

            const appear = easeOut(s)
            const meshScale = appear * p.scale
            mesh.visible = meshScale > 0.0001

            // Vertical "rainbow" arc above the companion's head: it spans the screen-horizontal
            // axis (perpendicular to the camera) and curves upward in Y. i = 0..6 sweeps the arc
            // left→right over the top. Floating, so no overlap with ground props (→ stars later).
            const theta = Math.PI * (1 - i / (COUNT - 1)) // i=0 → left end, i=6 → right end
            const hOff = Math.cos(theta) * p.radius // horizontal along the screen axis
            const vOff = Math.sin(theta) * p.radius // vertical rise (rainbow bulge)
            const appearDrift = (1 - appear) * 0.6 // rise into place as they materialize
            const bob = Math.sin(state.clock.elapsedTime * p.bobSpeed + i * 1.3) * p.bobAmount * appear
            mesh.position.set(
                layout.cx + rightX * hOff,
                groundY + p.yOffset + p.hoverHeight + vOff - appearDrift + bob,
                layout.cz + rightZ * hOff
            )
            // Tilt 90° forward so the stone's top (where the rune goes) faces the camera; the
            // per-stone spin (applied before the tilt) keeps each face varied.
            mesh.rotation.set(Math.PI / 2, rotations[i], 0)
            mesh.scale.setScalar(meshScale)

            // Colour + flash + hover (brighten uBaseColor; the shader clamps toward white).
            // Hover adds a slight glow while clickable; a click flashes to the full sing brightness.
            baseColor.set(p['color' + i] ?? '#ffffff')
            const hoverAmount = game.stage === 'input' && hoverRef.current[i] ? p.hoverBoost : 0
            tmpColor.copy(baseColor).multiplyScalar(1 + flashRef.current[i] * p.flashBoost + hoverAmount)
            stones[i].material.uniforms.uBaseColor.value.copy(tmpColor)
        }

        // Pointer: the arrow ORBITS the rainbow centre to the singing note (playback) or the
        // just-pressed note (input), via a damped spring on the orbit angle. A far hop builds more
        // speed → more overshoot/wobble before it settles (inertia); a neighbour hop barely
        // wobbles. It persists between notes (doesn't vanish), so each move is a circular slide.
        let instTarget = -1
        if (game.stage === 'playback' && game.activeNote != null && game.activeNote >= 0 && game.activeNote < COUNT) {
            instTarget = game.activeNote // the singing note
        } else if (game.stage === 'input') {
            for (let i = 0; i < COUNT; i++) {
                if (hoverRef.current[i]) {
                    instTarget = i // the stone the player is hovering
                    break
                }
            }
        }
        if (!staged) pointerTargetRef.current = -1
        else if (instTarget >= 0) pointerTargetRef.current = instTarget
        const target = pointerTargetRef.current

        {
            const targetMesh = target >= 0 ? meshRefs.current[target] : null
            const show = staged && !!targetMesh && targetMesh.visible
            musicStonePointer.active = show
            if (show) {
                const targetAngle = Math.PI * (1 - target / (COUNT - 1))
                if (pointerWasVisibleRef.current) {
                    // Damped spring on the orbit angle (semi-implicit Euler) → inertia + wobble.
                    const accel = (targetAngle - pointerAngleRef.current) * p.pointerStiffness - pointerAngVelRef.current * p.pointerDamping
                    pointerAngVelRef.current += accel * dt
                    pointerAngleRef.current += pointerAngVelRef.current * dt
                } else {
                    pointerAngleRef.current = targetAngle // snap on first appearance
                    pointerAngVelRef.current = 0
                }
                // Outward radial in the rainbow plane at the CURRENT (springing) angle.
                const ang = pointerAngleRef.current
                ptrRadial.set(rightX * Math.cos(ang), Math.sin(ang), rightZ * Math.cos(ang))
                // Radius "poke" (same-note replay during playback, or a press during input): dip
                // the radius toward the centre, then return — a small move that registers the hit.
                let radiusNow = p.pointerRadius
                if (pointerPulseRef.current > 0) {
                    const prog = 1 - pointerPulseRef.current / Math.max(0.01, p.pointerPulseDuration)
                    radiusNow -= Math.sin(prog * Math.PI) * p.pointerPulseAmount
                    pointerPulseRef.current = Math.max(0, pointerPulseRef.current - dt)
                }
                // Position at the radius from the rainbow centre (the half-circle's centre).
                pointerTargetPos.set(
                    layout.cx + ptrRadial.x * radiusNow,
                    groundY + p.yOffset + p.hoverHeight + ptrRadial.y * radiusNow,
                    layout.cz + ptrRadial.z * radiusNow
                )
                musicStonePointer.position.copy(pointerTargetPos)
                // Orient perpendicular to the camera (flat face toward it), arrow forward (-X)
                // pointing OUTWARD along the current radial → at the note.
                state.camera.getWorldDirection(ptrForward)
                ptrInPlane.copy(ptrRadial).addScaledVector(ptrForward, -ptrRadial.dot(ptrForward)).normalize()
                ptrY.copy(ptrForward).negate() // flat-face normal toward the camera
                ptrX.copy(ptrInPlane).negate() // local +X → -radial, so -X (forward) → radial
                ptrZ.crossVectors(ptrX, ptrY)
                ptrBasis.makeBasis(ptrX, ptrY, ptrZ)
                musicStonePointer.quaternion.setFromRotationMatrix(ptrBasis)
            }
            pointerWasVisibleRef.current = show
        }

        // See-through subjects: the BOTTOM side stones act like the hero — trees in front of
        // them fade so the stones stay visible (the top stones are clear of trees). Project each
        // participating stone to a screen disc + camera depth (mirrors MainCharacter's hero hole).
        clearMusicStoneSeeThrough()
        if (seeThrough.enabled && p.seeThroughEnabled && staged) {
            state.gl.getDrawingBufferSize(stBuffer)
            stRight.setFromMatrixColumn(state.camera.matrixWorld, 0) // camera right (world)
            for (let i = 0; i < COUNT && musicStoneSeeThrough.count < MAX_STONE_SEE_THROUGH; i++) {
                const mesh = meshRefs.current[i]
                if (!mesh || !mesh.visible) continue
                if (Math.sin(Math.PI * (1 - i / (COUNT - 1))) > 0.6) continue // only the lower stones
                stCenter.copy(mesh.position)
                const camDist = state.camera.position.distanceTo(stCenter)
                stEdge.copy(stCenter).addScaledVector(stRight, p.seeThroughRadius)
                stCenter.project(state.camera)
                stEdge.project(state.camera)
                if (stCenter.z <= -1 || stCenter.z >= 1) continue
                const cx = (stCenter.x * 0.5 + 0.5) * stBuffer.x
                const cy = (stCenter.y * 0.5 + 0.5) * stBuffer.y
                const o = musicStoneSeeThrough.count * 4
                musicStoneSeeThrough.data[o] = cx
                musicStoneSeeThrough.data[o + 1] = cy
                musicStoneSeeThrough.data[o + 2] = Math.hypot((stEdge.x * 0.5 + 0.5) * stBuffer.x - cx, (stEdge.y * 0.5 + 0.5) * stBuffer.y - cy)
                musicStoneSeeThrough.data[o + 3] = camDist
                musicStoneSeeThrough.count++
            }
        }

        // Drop the layout once everything has fully sunk (lets the camera restore + grass recover).
        if (!staged && allDown) layoutRef.current = null

        // Per-frame material uniforms (shared across the seven stones), matching ordinary stones.
        const options = {
            propRim: store.propRimParameters,
            refScale: getRefScale(state),
            circleCenterX: layout.cx,
            circleCenterZ: layout.cz,
            radiusFactor: REVEAL_FACTOR_ALWAYS,
            chunkSize: revealCircle.chunkSize,
            fadeOffset: store.objectParameters.fadeOffset,
            backgroundColor: store.terrainParameters.backgroundColor,
            fadeMode: store.borderParameters.fadeMode,
            pixelSize: store.ditheringParameters.pixelSize,
            painterlyEnabled: store.objectParameters.painterlyEnabled,
            painterlyScale: store.objectParameters.painterlyScale,
            painterlyContrast: store.objectParameters.painterlyContrast,
            painterlyBrightness: store.objectParameters.painterlyBrightness,
            painterlyColorStrength: store.objectParameters.painterlyColorStrength,
            paintery: {
                size: store.borderParameters.painterySize,
                screenBlend: store.borderParameters.painteryScreenBlend,
                drift: store.borderParameters.painteryDrift,
                layer2Scale: store.borderParameters.painteryLayer2Scale,
                bleed: store.borderParameters.painteryBleed,
            },
            seeThrough,
        }
        for (let i = 0; i < COUNT; i++) updatePropStylizedMaterial(stones[i].material, options)
    })

    return (
        <group>
            {stones.map((stone, i) => (
                <mesh
                    key={i}
                    ref={(el) => (meshRefs.current[i] = el)}
                    geometry={stone.geometry}
                    material={stone.material}
                    frustumCulled={false}
                    scale={0}
                    onPointerOver={(event) => {
                        if (useSongGame.getState().stage !== 'input') return
                        event.stopPropagation()
                        hoverRef.current[i] = true
                        document.body.style.cursor = 'pointer'
                    }}
                    onPointerOut={() => {
                        hoverRef.current[i] = false
                        document.body.style.cursor = ''
                    }}
                    onClick={(event) => {
                        if (useSongGame.getState().stage !== 'input') return
                        event.stopPropagation()
                        flashRef.current[i] = 1 // same brightness as when the companion sings
                        pointerPulseRef.current = useStore.getState().musicStoneParameters.pointerPulseDuration // poke the arrow
                        playNote(i, { duration: 0.5 })
                        useSongGame.getState().pressNote(i)
                    }}
                />
            ))}
        </group>
    )
}

useGLTF.preload(stonesModelUrl)
