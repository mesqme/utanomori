import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
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
import { resolvedCameraDistances, isMobile, isPortrait } from '../config/mobile.js'
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
// Touch has no hover, so a tap drives both the pointer and a one-shot scale "pop" (below). A short
// debounce swallows accidental double-taps — the melody never needs two presses this close together.
const TAP_PULSE_TIME = 0.26 // seconds for the tap scale up-then-down pop
const TAP_PULSE_BOOST = 0.22 // peak extra scale at the middle of the pop
const TAP_DEBOUNCE = 0.2 // seconds; a second press within this window is ignored
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
    // Touch (no hover): the last tapped stone aims the pointer, a per-stone pulse gives the tap its
    // scale pop, and a single timestamp debounces accidental double-taps.
    const tapTargetRef = useRef(-1)
    const tapPulseRef = useRef(new Array(COUNT_MAX).fill(0)) // 1 → 0 pop (decays over TAP_PULSE_TIME); fired on tap AND on each played note during playback
    const lastPressRef = useRef(0) // time of the last accepted press
    const lastPressIndexRef = useRef(-1) // which stone it was (debounce is per-stone, see onClick)
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
        // otherwise hand back to the follow camera. The song game OWNS the camera only during gameplay
        // (PHASES.start) — once the final game ends and we move to the finale/credits, GameDirector is
        // the sole camera owner, so we never fight its shot from here (this is what broke the old
        // finale: a stale stones-framing kept overriding it post-game).
        const layout = layoutRef.current
        const rc = resolvedCameraDistances() // mobile-aware minigame + talk distances
        // Mobile: landscape = horizontal LINE + arrow from below; portrait = 2-column GRID + arrow
        // from the stone's outer side (all from mobileStoneParameters).
        const mobile = isMobile()
        const portrait = mobile && isPortrait()
        const ms = useStore.getState().mobileStoneParameters
        // Portrait grid geometry for a stone index. COLUMN-major: the first half of the colours fill
        // the left column top→bottom, the rest fill the right column — so colours read down a column,
        // not across rows. Each column is centred vertically around gridHeight (a short column stays
        // balanced). Shared by the stone placement, the camera look-at and the arrow.
        const gridCols = 2
        const rowsPerCol = layoutRef.current ? Math.ceil(layoutRef.current.count / gridCols) : 1
        const gridPos = (index, total) => {
            const col = Math.floor(index / rowsPerCol) // 0 → left, 1 → right
            const rowInCol = index % rowsPerCol
            const colCount = col === 0 ? Math.min(total, rowsPerCol) : total - rowsPerCol
            return {
                h: (col === 0 ? -1 : 1) * ms.colGap,
                v: ms.gridHeight + ((colCount - 1) / 2 - rowInCol) * ms.rowGap, // centred per column
                col,
            }
        }
        const speechStage = (game.stage === 'prompt' || game.stage === 'failSpeech') && !!game.companion
        if (usePhases.getState().phase === PHASES.start) {
            if (speechStage) {
                cameraRig.mode = 'orbit'
                cameraRig.centerX = game.companion.x
                cameraRig.centerZ = game.companion.z
                cameraRig.angle = 0
                cameraRig.height = rc.talkHeight
                cameraRig.distance = rc.talkDistance
                cameraRig.targetYOffset = p.dialogueTargetY
                cameraRig.lerpSpeed = p.cameraLerp
            } else if (layout) {
                cameraRig.mode = 'orbit'
                cameraRig.centerX = layout.cx
                cameraRig.centerZ = layout.cz
                cameraRig.angle = 0
                cameraRig.height = rc.minigameHeight
                cameraRig.distance = rc.minigameDistance
                // Look at the stones' vertical centre: grid centre (portrait), the line (landscape),
                // or the rainbow's mid-height (desktop).
                cameraRig.targetYOffset = portrait
                    ? p.hoverHeight + ms.gridHeight
                    : mobile
                      ? p.hoverHeight + ms.lineHeight
                      : p.hoverHeight + p.radius * 0.5
                cameraRig.lerpSpeed = p.cameraLerp
            } else if (cameraRig.centerX !== null) {
                cameraRig.mode = 'follow'
                cameraRig.centerX = null
                cameraRig.centerZ = null
                cameraRig.lerpSpeed = 5
            }
        }

        // Flash + scale-pop the matching stone when a new sound plays (the character demonstrating the
        // melody) — the same pop as a tap, to emphasise each played note.
        if (game.activeNote !== prevNoteRef.current) {
            if (game.activeNote != null && game.activeNote >= 0 && game.activeNote < COUNT_MAX) {
                flashRef.current[game.activeNote] = 1
                tapPulseRef.current[game.activeNote] = 1
            }
            prevNoteRef.current = game.activeNote
        }

        // No layout (idle): everything sunk → hide, clear state, leave the camera.
        if (!layout) {
            clearAllMusicStones()
            clearMusicStoneSeeThrough()
            musicStonePointer.active = false
            pointerTargetRef.current = -1
            tapTargetRef.current = -1
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
                tapPulseRef.current[i] = 0
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

            // Hover visual (enlarge + brighten) only while the player repeats (input). Desktop-only —
            // touch has no hover (and any stray touch-hover would stick), so mobile uses the tap pulse.
            const hovered = inputStage && !mobile && hoverRef.current[i]
            hoverScaleRef.current[i] = THREE.MathUtils.damp(hoverScaleRef.current[i], hovered ? 1 : 0, 12, dt)

            // Tap pop: a one-shot scale up-then-down after a tap (the mobile stand-in for hover-enlarge;
            // also gives desktop clicks a little kick). sin(0→π) as the timer runs 1→0 = smooth up/down.
            let tapPulse = 0
            if (tapPulseRef.current[i] > 0) {
                tapPulseRef.current[i] = Math.max(0, tapPulseRef.current[i] - dt / TAP_PULSE_TIME)
                tapPulse = Math.sin((1 - tapPulseRef.current[i]) * Math.PI) * TAP_PULSE_BOOST
            }

            const appear = easeOut(s)
            const stoneScale = portrait ? ms.gridScale : mobile ? ms.scale : p.scale
            const meshScale = appear * stoneScale * (1 + hoverScaleRef.current[i] * (p.hoverScale ?? 0.18) + tapPulse)
            mesh.visible = meshScale > 0.0001

            let hOff
            let vOff
            if (portrait) {
                const g = gridPos(i, count) // 2-column grid, read top-left → down
                hOff = g.h
                vOff = g.v
            } else if (mobile) {
                hOff = (2 * (i / span) - 1) * ms.lineWidth // evenly spaced, -lineWidth → +lineWidth
                vOff = ms.lineHeight // flat horizontal line
            } else {
                const theta = Math.PI * (1 - i / span) // i=0 → left end, i=count-1 → right end
                hOff = Math.cos(theta) * p.radius
                vOff = Math.sin(theta) * p.radius
            }
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
            // Clear the tap target so a fresh input round starts with the pointer on the last sung note
            // (not last round's tap), then aim at the note currently singing.
            tapTargetRef.current = -1
            if (game.activeNote != null && game.activeNote >= 0 && game.activeNote < count) desiredTarget = game.activeNote
        } else if (inputStage) {
            if (mobile) {
                // No hover on touch: the pointer is transferred to whichever stone was last tapped.
                if (tapTargetRef.current >= 0 && tapTargetRef.current < count) desiredTarget = tapTargetRef.current
            } else {
                for (let i = 0; i < count; i++) {
                    if (hoverRef.current[i]) {
                        desiredTarget = i
                        break
                    }
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

            state.camera.getWorldDirection(ptrForward)
            if (portrait) {
                // Grid: sit on the target stone's INNER side (the centre gap between the two columns)
                // and point OUTWARD at it — left column ← arrow to its right pointing left, right
                // column mirrored. Never crosses the other column. Arrow forward = local -X.
                const g = gridPos(pointerTarget, count)
                const innerSign = g.col === 0 ? 1 : -1 // arrow sits toward the centre
                const hArrow = g.h + innerSign * ms.arrowDrop
                pointerTargetPos.set(
                    layout.cx + rightX * hArrow,
                    groundY + p.yOffset + p.hoverHeight + g.v,
                    layout.cz + rightZ * hArrow
                )
                musicStonePointer.position.copy(pointerTargetPos)
                ptrX.set(innerSign * rightX, 0, innerSign * rightZ) // local -X → outward, toward the stone
                ptrY.copy(ptrForward).negate()
                ptrY.addScaledVector(ptrX, -ptrY.dot(ptrX)) // orthogonalize → the flat side faces the camera
                if (ptrY.lengthSq() < 1e-4) ptrY.set(0, 1, 0)
                ptrY.normalize()
                ptrZ.crossVectors(ptrX, ptrY)
            } else if (mobile) {
                // Rise from BELOW the target line-stone and point straight UP at it (arrow forward =
                // local -X). Faces the camera (its plane normal = camera-facing, kept horizontal).
                const hOffT = (2 * (pointerTarget / span) - 1) * ms.lineWidth
                pointerTargetPos.set(
                    layout.cx + rightX * hOffT,
                    groundY + p.yOffset + p.hoverHeight + ms.lineHeight - ms.arrowDrop,
                    layout.cz + rightZ * hOffT
                )
                musicStonePointer.position.copy(pointerTargetPos)
                ptrX.set(0, -1, 0) // local -X → world up (the arrow points up)
                ptrY.copy(ptrForward).negate()
                ptrY.y = 0
                if (ptrY.lengthSq() < 1e-4) ptrY.set(0, 0, 1)
                ptrY.normalize()
                ptrZ.crossVectors(ptrX, ptrY)
            } else {
                const ang = Math.PI * (1 - pointerTarget / span)
                ptrRadial.set(rightX * Math.cos(ang), Math.sin(ang), rightZ * Math.cos(ang))
                pointerTargetPos.set(
                    layout.cx + ptrRadial.x * p.pointerRadius,
                    groundY + p.yOffset + p.hoverHeight + ptrRadial.y * p.pointerRadius,
                    layout.cz + ptrRadial.z * p.pointerRadius
                )
                musicStonePointer.position.copy(pointerTargetPos)
                ptrInPlane.copy(ptrRadial).addScaledVector(ptrForward, -ptrRadial.dot(ptrForward)).normalize()
                ptrY.copy(ptrForward).negate()
                ptrX.copy(ptrInPlane).negate()
                ptrZ.crossVectors(ptrX, ptrY)
            }
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
            // Music stones get their OWN rim colour (single colour → all type slots in their material).
            propRim: {
                enabled: store.propRimParameters.enabled,
                strength: store.propRimParameters.strength,
                power: store.propRimParameters.power,
                color: store.propRimParameters.musicStoneColor,
            },
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
                        // Debounce accidental double-taps (touch bounce) PER STONE: a repeat tap on the
                        // SAME stone within TAP_DEBOUNCE is dropped (the melody never has the same note
                        // twice in a row, so this is safe), while two different stones tapped fast both
                        // register normally.
                        const now = performance.now() / 1000
                        if (i === lastPressIndexRef.current && now - lastPressRef.current < TAP_DEBOUNCE) return
                        lastPressRef.current = now
                        lastPressIndexRef.current = i
                        tapTargetRef.current = i // aim the pointer at the tapped stone (no hover on touch)
                        tapPulseRef.current[i] = 1 // scale pop feedback
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
