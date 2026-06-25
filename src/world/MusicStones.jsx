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
import { playSound } from '../game/gameSounds.js'
import stonesModelUrl from '../assets/models/stones.glb'

// Coloured stones that stage the song mini-game in 3D: ONE stone per UNIQUE sound for the current
// character (3–6), in a half-circle "rainbow" above the singing companion. The camera lifts, each
// played sound flashes its stone, and the player clicks the stones to repeat the melody. Stone i
// plays the unique sound game.stoneSounds[i]; the melody (game.song) is a sequence of stone indices.
const COUNT_MAX = 7 // we keep up to 7 meshes; the active game uses the first `count` of them
const STAGED = new Set(['setup', 'countdown', 'playback', 'input', 'roundClear', 'success', 'fail'])
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

    // One mesh per (potential) stone: GLB geometry + its own prop stylized material.
    const stones = useMemo(() => {
        return MUSIC_STONE_VARIANTS.map((variant) => {
            const node = nodes[variant.node]
            const geometry = node ? createStoneGeometry(node) : new THREE.IcosahedronGeometry(0.5, 1)
            const material = createPropStylizedMaterial(painterlyTexture, { toneMapped: true })
            return { geometry, material, safeRadius: variant.diameter * 0.5 }
        })
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
    const scaleRef = useRef(new Array(COUNT_MAX).fill(0)) // animated rise progress 0..1
    const flashRef = useRef(new Array(COUNT_MAX).fill(0)) // flash decay 0..1
    const hoverRef = useRef(new Array(COUNT_MAX).fill(false)) // pointer is over a clickable stone
    const hoverScaleRef = useRef(new Array(COUNT_MAX).fill(0)) // eased hover scale-up 0..1
    const prevNoteRef = useRef(null)
    const layoutRef = useRef(null) // { cx, cz, count } captured when staging begins
    const stageStartRef = useRef(0)
    const rotations = useMemo(() => Array.from({ length: COUNT_MAX }, () => Math.random() * Math.PI * 2), [])
    const baseColor = useMemo(() => new THREE.Color(), [])
    const tmpColor = useMemo(() => new THREE.Color(), [])

    // Pointer pose: written to the shared musicStonePointer, rendered by the single arrow (TargetArrow).
    const pointerWasVisibleRef = useRef(false)
    const pointerAngleRef = useRef(0)
    const pointerAngVelRef = useRef(0)
    const pointerTargetRef = useRef(-1)
    const pointerPulseRef = useRef(0)
    const pointerTargetPos = useMemo(() => new THREE.Vector3(), [])
    const ptrRadial = useMemo(() => new THREE.Vector3(), [])
    const ptrForward = useMemo(() => new THREE.Vector3(), [])
    const ptrInPlane = useMemo(() => new THREE.Vector3(), [])
    const ptrX = useMemo(() => new THREE.Vector3(), [])
    const ptrY = useMemo(() => new THREE.Vector3(), [])
    const ptrZ = useMemo(() => new THREE.Vector3(), [])
    const ptrBasis = useMemo(() => new THREE.Matrix4(), [])

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

        // Capture the layout (companion centre + this character's stone count) when staging begins.
        if (staged && !layoutRef.current && game.stoneSounds.length > 0) {
            layoutRef.current = { cx: game.companion.x, cz: game.companion.z, count: game.stoneSounds.length }
            stageStartRef.current = state.clock.elapsedTime
        }

        const layout = layoutRef.current
        if (layout) {
            cameraRig.mode = 'orbit'
            cameraRig.centerX = layout.cx
            cameraRig.centerZ = layout.cz
            cameraRig.angle = 0
            cameraRig.height = p.cameraHeight
            cameraRig.distance = p.cameraDistance
            cameraRig.targetYOffset = p.hoverHeight + p.radius * 0.5
            cameraRig.lerpSpeed = p.cameraLerp
        } else if (cameraRig.centerX !== null) {
            cameraRig.mode = 'follow'
            cameraRig.centerX = null
            cameraRig.centerZ = null
            cameraRig.lerpSpeed = 5
        }

        // Flash the matching stone when a new sound plays.
        if (game.activeNote !== prevNoteRef.current) {
            if (game.activeNote != null && game.activeNote >= 0 && game.activeNote < COUNT_MAX) {
                flashRef.current[game.activeNote] = 1
                if (game.activeNote === pointerTargetRef.current) pointerPulseRef.current = p.pointerPulseDuration
            }
            prevNoteRef.current = game.activeNote
        }

        // No layout (idle): everything sunk → hide, clear state, leave the camera.
        if (!layout) {
            clearAllMusicStones()
            clearMusicStoneSeeThrough()
            musicStonePointer.active = false
            for (let i = 0; i < COUNT_MAX; i++) {
                const m = meshRefs.current[i]
                if (m) m.visible = false
            }
            return
        }

        const count = layout.count // this character's stone count
        const sinceStart = state.clock.elapsedTime - stageStartRef.current
        const inRate = dt / Math.max(0.05, p.scaleInDuration)
        const outRate = dt / Math.max(0.05, p.scaleOutDuration)

        const groundY = getGroundY(layout.cx, layout.cz)
        const rightX = Math.cos(cameraRig.angle)
        const rightZ = -Math.sin(cameraRig.angle)
        const span = Math.max(1, count - 1)

        let allDown = true
        for (let i = 0; i < COUNT_MAX; i++) {
            const mesh = meshRefs.current[i]
            if (!mesh) continue
            if (i >= count) {
                // Not part of this character's set.
                scaleRef.current[i] = 0
                hoverScaleRef.current[i] = 0
                mesh.visible = false
                continue
            }

            const started = staged && sinceStart >= i * p.staggerDelay
            const target = started ? 1 : 0
            let s = scaleRef.current[i]
            if (s < target) s = Math.min(target, s + inRate)
            else s = Math.max(target, s - outRate)
            scaleRef.current[i] = s
            if (s > 0.001) allDown = false

            flashRef.current[i] = Math.max(0, flashRef.current[i] - dt / Math.max(0.02, p.flashDuration))

            // Hover: ease a small scale-up (and brighten below) while clickable.
            const hovered = game.stage === 'input' && hoverRef.current[i]
            hoverScaleRef.current[i] = THREE.MathUtils.damp(hoverScaleRef.current[i], hovered ? 1 : 0, 12, dt)

            const appear = easeOut(s)
            const meshScale = appear * p.scale * (1 + hoverScaleRef.current[i] * (p.hoverScale ?? 0.18))
            mesh.visible = meshScale > 0.0001

            const theta = Math.PI * (1 - i / span) // i=0 → left end, i=count-1 → right end
            const hOff = Math.cos(theta) * p.radius
            const vOff = Math.sin(theta) * p.radius
            const appearDrift = (1 - appear) * 0.6
            const bob = Math.sin(state.clock.elapsedTime * p.bobSpeed + i * 1.3) * p.bobAmount * appear
            mesh.position.set(
                layout.cx + rightX * hOff,
                groundY + p.yOffset + p.hoverHeight + vOff - appearDrift + bob,
                layout.cz + rightZ * hOff
            )
            mesh.rotation.set(Math.PI / 2, rotations[i], 0)
            mesh.scale.setScalar(meshScale)

            baseColor.set(p['color' + i] ?? '#ffffff')
            const hoverAmount = hovered ? p.hoverBoost : 0
            tmpColor.copy(baseColor).multiplyScalar(1 + flashRef.current[i] * p.flashBoost + hoverAmount)
            stones[i].material.uniforms.uBaseColor.value.copy(tmpColor)
        }

        // Pointer: orbits the rainbow centre to the singing note (playback) or the hovered stone
        // (input), via a damped spring. Persists between notes. (Rendered by the single arrow.)
        let instTarget = -1
        if (game.stage === 'playback' && game.activeNote != null && game.activeNote >= 0 && game.activeNote < count) {
            instTarget = game.activeNote
        } else if (game.stage === 'input') {
            for (let i = 0; i < count; i++) {
                if (hoverRef.current[i]) {
                    instTarget = i
                    break
                }
            }
        }
        if (!staged) pointerTargetRef.current = -1
        else if (instTarget >= 0) pointerTargetRef.current = instTarget
        const target = pointerTargetRef.current

        {
            const targetMesh = target >= 0 && target < count ? meshRefs.current[target] : null
            const show = staged && !!targetMesh && targetMesh.visible
            musicStonePointer.active = show
            if (show) {
                const targetAngle = Math.PI * (1 - target / span)
                if (pointerWasVisibleRef.current) {
                    const accel = (targetAngle - pointerAngleRef.current) * p.pointerStiffness - pointerAngVelRef.current * p.pointerDamping
                    pointerAngVelRef.current += accel * dt
                    pointerAngleRef.current += pointerAngVelRef.current * dt
                } else {
                    pointerAngleRef.current = targetAngle
                    pointerAngVelRef.current = 0
                }
                const ang = pointerAngleRef.current
                ptrRadial.set(rightX * Math.cos(ang), Math.sin(ang), rightZ * Math.cos(ang))
                let radiusNow = p.pointerRadius
                if (pointerPulseRef.current > 0) {
                    const prog = 1 - pointerPulseRef.current / Math.max(0.01, p.pointerPulseDuration)
                    radiusNow -= Math.sin(prog * Math.PI) * p.pointerPulseAmount
                    pointerPulseRef.current = Math.max(0, pointerPulseRef.current - dt)
                }
                pointerTargetPos.set(
                    layout.cx + ptrRadial.x * radiusNow,
                    groundY + p.yOffset + p.hoverHeight + ptrRadial.y * radiusNow,
                    layout.cz + ptrRadial.z * radiusNow
                )
                musicStonePointer.position.copy(pointerTargetPos)
                state.camera.getWorldDirection(ptrForward)
                ptrInPlane.copy(ptrRadial).addScaledVector(ptrForward, -ptrRadial.dot(ptrForward)).normalize()
                ptrY.copy(ptrForward).negate()
                ptrX.copy(ptrInPlane).negate()
                ptrZ.crossVectors(ptrX, ptrY)
                ptrBasis.makeBasis(ptrX, ptrY, ptrZ)
                musicStonePointer.quaternion.setFromRotationMatrix(ptrBasis)
            }
            pointerWasVisibleRef.current = show
        }

        // See-through: the BOTTOM (lower) stones act like the hero — trees in front of them fade.
        clearMusicStoneSeeThrough()
        if (seeThrough.enabled && p.seeThroughEnabled && staged) {
            state.gl.getDrawingBufferSize(stBuffer)
            stRight.setFromMatrixColumn(state.camera.matrixWorld, 0)
            for (let i = 0; i < count && musicStoneSeeThrough.count < MAX_STONE_SEE_THROUGH; i++) {
                const mesh = meshRefs.current[i]
                if (!mesh || !mesh.visible) continue
                if (Math.sin(Math.PI * (1 - i / span)) > 0.6) continue // only the lower stones
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

        if (!staged && allDown) layoutRef.current = null

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
        for (let i = 0; i < COUNT_MAX; i++) updatePropStylizedMaterial(stones[i].material, options)
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
                        const g = useSongGame.getState()
                        if (g.stage !== 'input') return
                        event.stopPropagation()
                        flashRef.current[i] = 1
                        pointerPulseRef.current = useStore.getState().musicStoneParameters.pointerPulseDuration
                        playSound(g.track, g.stoneSounds[i]) // this stone's unique sound
                        g.pressNote(i)
                    }}
                />
            ))}
        </group>
    )
}

useGLTF.preload(stonesModelUrl)
