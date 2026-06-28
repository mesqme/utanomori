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
//
// Hover/click happen on a FIXED-SIZE invisible proxy sphere per stone (not the visible mesh, which
// scales with the rise + hover and would drop the hover at its edges). The shared arrow pointer
// (TargetArrow) follows the mouse freely around the arc during input and snaps onto a stone only
// when its proxy is hovered (during playback it snaps to the singing note).
const COUNT_MAX = 7 // we keep up to 7 meshes; the active game uses the first `count` of them
const STAGED = new Set(['setup', 'countdown', 'playback', 'input', 'roundClear', 'success', 'fail'])
const REVEAL_FACTOR_ALWAYS = 1000 // focal element → never fade at the reveal-circle edge
const POINTER_APPEAR_TIME = 0.14 // seconds the pointer scales back from 0 when it pops to a new note
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

    // Shared invisible hover proxy: a unit sphere (scaled per frame to a fixed world radius). It
    // renders nothing (colorWrite off) but stays raycastable so hover/click are stable.
    const proxyGeometry = useMemo(() => new THREE.SphereGeometry(1, 12, 8), [])
    const proxyMaterial = useMemo(
        () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false, colorWrite: false }),
        []
    )

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
        proxyGeometry.dispose()
        proxyMaterial.dispose()
        clearAllMusicStones()
        clearMusicStoneSeeThrough()
        musicStonePointer.active = false
    }, [stones, proxyGeometry, proxyMaterial])

    const meshRefs = useRef([])
    const proxyRefs = useRef([])
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
    // The pointer is bound to the PLAYED note (sung during the melody / pressed while repeating) — it
    // pops note-to-note (scales from 0 at each new note), it does not rotate or follow the cursor.
    const pointerTargetRef = useRef(-1) // stone the pointer currently sits at
    const pointerAppearRef = useRef(0) // 0..1 scale-in after a snap to a new note
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
            layoutRef.current = { cx: game.companion.x, cz: game.companion.z, count: game.stoneCount }
            stageStartRef.current = state.clock.elapsedTime
        }

        // Camera: the shared "dialogue camera" (a close framing on the music character) for any
        // interaction speech (prompt / fail speech); the wider stones framing while they're up;
        // otherwise hand back to the follow camera.
        const layout = layoutRef.current
        const speechStage = (game.stage === 'prompt' || game.stage === 'failSpeech') && !!game.companion
        if (speechStage) {
            cameraRig.mode = 'orbit'
            cameraRig.centerX = game.companion.x
            cameraRig.centerZ = game.companion.z
            cameraRig.angle = 0
            cameraRig.height = p.dialogueCameraHeight
            cameraRig.distance = p.dialogueCameraDistance
            cameraRig.targetYOffset = p.dialogueTargetY
            cameraRig.lerpSpeed = p.cameraLerp
        } else if (layout) {
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
            }
            prevNoteRef.current = game.activeNote
        }

        // No layout (idle): everything sunk → hide, clear state, leave the camera.
        if (!layout) {
            clearAllMusicStones()
            clearMusicStoneSeeThrough()
            musicStonePointer.active = false
            pointerTargetRef.current = -1
            for (let i = 0; i < COUNT_MAX; i++) {
                if (meshRefs.current[i]) meshRefs.current[i].visible = false
                if (proxyRefs.current[i]) proxyRefs.current[i].visible = false
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
        // Stone visuals + clicking happen ONLY while the player repeats (input). During the melody
        // (playback) the proxies still RAYCAST — so we track which note the cursor is over — but the
        // stones don't react (no enlarge / hover-brighten) and nothing is clickable yet.
        const inputStage = game.stage === 'input'
        const trackActive = staged && (inputStage || game.stage === 'playback')

        let allDown = true
        for (let i = 0; i < COUNT_MAX; i++) {
            const mesh = meshRefs.current[i]
            if (!mesh) continue
            if (i >= count) {
                // Not part of this character's set.
                scaleRef.current[i] = 0
                hoverScaleRef.current[i] = 0
                mesh.visible = false
                if (proxyRefs.current[i]) proxyRefs.current[i].visible = false
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

            // Hover visual (enlarge + brighten) only while the player repeats (input).
            const hovered = inputStage && hoverRef.current[i]
            hoverScaleRef.current[i] = THREE.MathUtils.damp(hoverScaleRef.current[i], hovered ? 1 : 0, 12, dt)

            const appear = easeOut(s)
            const meshScale = appear * p.scale * (1 + hoverScaleRef.current[i] * (p.hoverScale ?? 0.18))
            mesh.visible = meshScale > 0.0001

            const theta = Math.PI * (1 - i / span) // i=0 → left end, i=count-1 → right end
            const hOff = Math.cos(theta) * p.radius
            const vOff = Math.sin(theta) * p.radius
            const appearDrift = (1 - appear) * 0.6

            // Idle motion: a vertical bob (bobAmount) AND/OR a gentle in-place rotation wobble
            // (floatRotate) — both can run together now.
            const ph = state.clock.elapsedTime * p.bobSpeed + i * 1.3
            const bob = Math.sin(ph) * p.bobAmount * appear
            let wobbleYaw = 0
            let wobbleTilt = 0
            if (p.floatRotate) {
                wobbleYaw = Math.sin(ph) * (p.floatRotateAmount ?? 0.12) * appear
                wobbleTilt = Math.cos(ph * 0.8) * (p.floatRotateAmount ?? 0.12) * 0.5 * appear
            }

            mesh.position.set(
                layout.cx + rightX * hOff,
                groundY + p.yOffset + p.hoverHeight + vOff - appearDrift + bob,
                layout.cz + rightZ * hOff
            )
            mesh.rotation.set(Math.PI / 2 + wobbleTilt, rotations[i] + wobbleYaw, 0)
            mesh.scale.setScalar(meshScale)

            // Invisible hover proxy: fixed world radius at the stone's centre. Live during the melody
            // AND input so we always track which note the cursor is over — but it only highlights /
            // is clickable during input (above + onClick guard). Clear stale hover when it goes idle
            // (pointer-out doesn't always fire as the proxy hides).
            const proxy = proxyRefs.current[i]
            if (proxy) {
                const proxyLive = trackActive && s > 0.4
                proxy.visible = proxyLive
                if (proxyLive) {
                    proxy.position.copy(mesh.position)
                    proxy.scale.setScalar(p.hoverProxyRadius ?? 1.8)
                } else {
                    hoverRef.current[i] = false
                }
            }

            baseColor.set(p['color' + i] ?? '#ffffff')
            const hoverAmount = hovered ? p.hoverBoost : 0
            tmpColor.copy(baseColor).multiplyScalar(1 + flashRef.current[i] * p.flashBoost + hoverAmount)
            stones[i].material.uniforms.uBaseColor.value.copy(tmpColor)
        }

        // Pointer (the shared arrow): playback → the singing note; input → the HOVERED stone. On
        // each change it snaps to that note's place and re-"appears" (scales from 0), so it pops
        // note-to-note. A press doesn't move it — pressing just flashes green/red (TargetArrow,
        // via lastPress). When nothing is hovered it rests on the last note.
        let desiredTarget = -1
        if (game.stage === 'playback') {
            if (game.activeNote != null && game.activeNote >= 0 && game.activeNote < count) desiredTarget = game.activeNote
        } else if (inputStage) {
            for (let i = 0; i < count; i++) {
                if (hoverRef.current[i]) {
                    desiredTarget = i
                    break
                }
            }
        }
        if (desiredTarget >= 0 && desiredTarget !== pointerTargetRef.current) {
            pointerTargetRef.current = desiredTarget
            pointerAppearRef.current = 0
        }
        const pointerTarget = pointerTargetRef.current
        const pointerShow = staged && !allDown && pointerTarget >= 0 && pointerTarget < count && (game.stage === 'playback' || inputStage)
        musicStonePointer.active = pointerShow
        if (pointerShow) {
            pointerAppearRef.current = Math.min(1, pointerAppearRef.current + dt / POINTER_APPEAR_TIME)
            musicStonePointer.appear = pointerAppearRef.current

            const ang = Math.PI * (1 - pointerTarget / span)
            ptrRadial.set(rightX * Math.cos(ang), Math.sin(ang), rightZ * Math.cos(ang))
            pointerTargetPos.set(
                layout.cx + ptrRadial.x * p.pointerRadius,
                groundY + p.yOffset + p.hoverHeight + ptrRadial.y * p.pointerRadius,
                layout.cz + ptrRadial.z * p.pointerRadius
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

        // See-through: every stone acts like the hero — trees in front of any stone fade, so even
        // the highest stones stay visible behind tall trees.
        clearMusicStoneSeeThrough()
        if (seeThrough.enabled && p.seeThroughEnabled && staged) {
            state.gl.getDrawingBufferSize(stBuffer)
            stRight.setFromMatrixColumn(state.camera.matrixWorld, 0)
            for (let i = 0; i < count && musicStoneSeeThrough.count < MAX_STONE_SEE_THROUGH; i++) {
                const mesh = meshRefs.current[i]
                if (!mesh || !mesh.visible) continue
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
                <mesh key={i} ref={(el) => (meshRefs.current[i] = el)} geometry={stone.geometry} material={stone.material} frustumCulled={false} scale={0} />
            ))}
            {stones.map((stone, i) => (
                <mesh
                    key={`proxy${i}`}
                    ref={(el) => (proxyRefs.current[i] = el)}
                    geometry={proxyGeometry}
                    material={proxyMaterial}
                    frustumCulled={false}
                    visible={false}
                    renderOrder={-1}
                    onPointerOver={(event) => {
                        event.stopPropagation()
                        hoverRef.current[i] = true // highlights + aims the arrow even while listening
                        if (useSongGame.getState().stage === 'input') document.body.style.cursor = 'pointer'
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
                        playSound(g.track, g.stoneSounds[i]) // this stone's unique sound
                        g.pressNote(i)
                    }}
                />
            ))}
        </group>
    )
}

useGLTF.preload(stonesModelUrl)
