import { useState, useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { gsap } from 'gsap'
import * as THREE from 'three'

import TerrainChunk from './TerrainChunk.jsx'
import ScatteredObjects from './ScatteredObjects.jsx'
import GrassTrail from './GrassTrail.jsx'
import { revealCircle } from './state/revealCircle.js'
import { seeThrough } from './state/seeThrough.js'
import { themeMask, updateThemeMask } from './state/themeMask.js'
import { characterSeeThrough } from './state/characterSeeThrough.js'
import { useBakedPainteryTexture } from './utils/useBakedPainteryTexture.js'
import { getRefScale } from './utils/screenScale.js'
import useTerrainMaterial from '../materials/useTerrainMaterial.jsx'
import useGrassMaterial from '../materials/useGrassMaterial.jsx'
import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { loaderInteraction } from '../loader/loaderInteraction.js'
import { RESTART_DURATION } from '../game/gameConfig.js'

import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import { GROUND_TEXTURE_URL_LIST, groundTextureIndex } from '../config/surfaceTextures.js'
import noiseTextureUrl from '../assets/textures/noiseTexture.png'

const START_CIRCLE_RADIUS = 0.07
// Hovering the GO circle in warmup previews this much of the world (a partial reveal — well
// past the red hat but not the full gameplay radius), then fades back when the pointer leaves.
const WARMUP_HOVER_RADIUS = 0.45
const WARMUP_HOVER_LERP = 6 // grow-in speed while hovering
const WARMUP_FADE_LERP = 2.5 // slower fade-back when the pointer leaves
const ACTIVE_CHUNK_RADIUS = 2

export default function Terrain() {
    const [activeChunks, setActiveChunks] = useState([])

    const currentChunk = useRef({ x: 0, z: 0 })
    const radiusAnimationRef = useRef(null)
    const prevPhaseRef = useRef(PHASES.loading)
    const circleRadiusRef = useRef(START_CIRCLE_RADIUS)
    // Grass global fade: 0 on the loading/GO screens (the hover preview shows ground + props but no
    // grass — top-down grass reads badly), fading up to 1 once GO is pressed.
    const grassAlphaRef = useRef(0)
    const pendingChunksRef = useRef([])
    const desiredChunkKeysRef = useRef(new Set())
    const pruneChunksRef = useRef(false)

    const phase = usePhases((s) => s.phase)
    const chunkSize = useStore((s) => s.terrainParameters.chunkSize)
    const borderCircleRadius = useStore((s) => s.borderParameters.circleRadiusFactor)
    const introReplayNonce = useStore((s) => s.introReplayNonce)

    const noiseTexture = useTexture(
        noiseTextureUrl,
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            return texture
        },
        [noiseTextureUrl]
    )

    // Selectable ground-detail texture (drei preloads all so swapping is instant). 'World ▸ Terrain ▸
    // groundTextureName' picks which — defaults to the watercolor texture.
    const groundTextureName = useStore((s) => s.terrainParameters.groundTextureName)
    const groundTextures = useTexture(GROUND_TEXTURE_URL_LIST)
    const groundTexture = useMemo(() => {
        const texture = groundTextures[groundTextureIndex(groundTextureName)] ?? groundTextures[0]
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.colorSpace = THREE.NoColorSpace
        texture.needsUpdate = true // these textures are preloaded/shared — force the wrap change to upload
        return texture
    }, [groundTextures, groundTextureName])

    // Selectable source texture for the bake (drei preloads all six so swapping is instant).
    //
    // SHARED INSTANCES — the canonical note, referenced from the three other call sites.
    // useTexture caches by URL, so Terrain, MainCharacter, ScatteredObjects and MusicStones all
    // receive the SAME six Texture objects, and each of them mutates the one it picks. The wrap +
    // colorSpace writes agree everywhere, but the filters do not: here we set Linear min/mag,
    // MainCharacter sets LinearMipmapLinear min on all six. Both write the same object, so the
    // component that renders LAST decides what the GPU actually gets. It happens to look right.
    //
    // Do NOT "clean this up" by unifying the four sites into one shared usePainteryTexture hook,
    // and do NOT reorder Experience.jsx's children — either one changes which filter wins.
    const painteryTextureParameters = useStore((s) => s.painteryTextureParameters)
    const painteryTextures = useTexture(PAINTERY_TEXTURE_URL_LIST)
    const painteryTexture = useMemo(() => {
        const texture = painteryTextures[painteryTextureIndex(painteryTextureParameters.textureName)] ?? painteryTextures[0]
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.colorSpace = THREE.NoColorSpace
        return texture
    }, [painteryTextures, painteryTextureParameters.textureName])

    // Bake the smoothing/threshold into the brush texture once, then sample the
    // stylized copy everywhere instead of running Kuwahara over the whole frame.
    const stylizedPainteryTexture = useBakedPainteryTexture(painteryTexture, painteryTextureParameters)

    const terrainMaterial = useTerrainMaterial({
        chunkSize,
        initialCircleRadius: START_CIRCLE_RADIUS,
        noiseTexture,
        groundTexture,
        painteryTexture: stylizedPainteryTexture,
    })
    const grassMaterial = useGrassMaterial({
        chunkSize,
        initialCircleRadius: START_CIRCLE_RADIUS,
        noiseTexture,
        painteryTexture: stylizedPainteryTexture,
    })

    const setCircleRadius = (value) => {
        circleRadiusRef.current = value
        terrainMaterial.uniforms.uCircleRadiusFactor.value = value
        grassMaterial.uniforms.uCircleRadiusFactor.value = value
        revealCircle.radiusFactor = value
    }

    // The intro reveal moves with the camera travel: the lit circle opens out to full as the
    // camera spirals down. Timed to the (tunable) spiral duration so the two stay in sync;
    // replayable via the "redo the animation" button.
    const runIntroReveal = () => {
        if (radiusAnimationRef.current) radiusAnimationRef.current.kill()
        const intro = useStore.getState().introCameraParameters
        const obj = { value: circleRadiusRef.current }
        radiusAnimationRef.current = gsap.to(obj, {
            value: borderCircleRadius,
            duration: Math.max(0.001, intro.spiralDuration),
            ease: 'power2.out',
            onUpdate: () => setCircleRadius(obj.value),
            onComplete: () => {
                radiusAnimationRef.current = null
            },
        })
    }

    // Cinematic restart: shrink the lit circle back to the tiny pre-start radius as the camera
    // lifts away (the reverse of runIntroReveal).
    const runRestartReveal = () => {
        if (radiusAnimationRef.current) radiusAnimationRef.current.kill()
        const obj = { value: circleRadiusRef.current }
        radiusAnimationRef.current = gsap.to(obj, {
            value: START_CIRCLE_RADIUS,
            duration: RESTART_DURATION,
            ease: 'power2.inOut',
            onUpdate: () => setCircleRadius(obj.value),
            onComplete: () => {
                radiusAnimationRef.current = null
            },
        })
    }

    useEffect(() => {
        return () => {
            if (radiusAnimationRef.current) {
                radiusAnimationRef.current.kill()
                radiusAnimationRef.current = null
            }
            noiseTexture.dispose()
            // groundTexture is one of the shared preloaded SURFACE textures (swappable) — don't dispose
            // it here, the same way the paintery list isn't disposed.
        }
    }, [noiseTexture])

    useEffect(() => {
        if (phase === PHASES.intro) {
            // Reveal flows with the camera travel: opens out to full over the spiral.
            runIntroReveal()
        } else if (phase === PHASES.restarting) {
            // Reverse: shrink the lit circle back down as the camera lifts to the top shot.
            runRestartReveal()
        } else if (phase === PHASES.start || phase === PHASES.finale || phase === PHASES.credits) {
            // Full circle during gameplay / finale / credits (debug jumps straight here).
            if (!radiusAnimationRef.current) setCircleRadius(borderCircleRadius)
        } else {
            // loading / warmup: tiny circle so the hat covers the small terrain from top.
            if (radiusAnimationRef.current) {
                radiusAnimationRef.current.kill()
                radiusAnimationRef.current = null
            }
            setCircleRadius(START_CIRCLE_RADIUS)
        }

        prevPhaseRef.current = phase
    }, [phase, borderCircleRadius])

    // "Redo the animation" → replay the reveal alongside the camera travel.
    useEffect(() => {
        if (introReplayNonce === 0) return
        runIntroReveal()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [introReplayNonce])

    useFrame((frameState, delta) => {
        const state = useStore.getState()

        /**
         * Warmup hover reveal
         */
        // Warmup: hovering the GO circle previews more of the world (the reveal circle grows
        // out from under the red hat), then fades back gently when the pointer leaves.
        if (phase === PHASES.warmup && !radiusAnimationRef.current) {
            const hovering = loaderInteraction.hovered
            const target = hovering ? WARMUP_HOVER_RADIUS : START_CIRCLE_RADIUS
            const rate = hovering ? WARMUP_HOVER_LERP : WARMUP_FADE_LERP
            const t = Math.min(1, (delta || 0.016) * rate)
            setCircleRadius(THREE.MathUtils.lerp(circleRadiusRef.current, target, t))
        }

        /**
         * Grass fade
         */
        // Grass global fade: invisible on the loading / GO screens (top-down grass looked wrong in
        // the hover preview), fading in once GO is pressed (intro onward). Resettling hides behind
        // the loader curtain, so snapping back to 0 there is invisible.
        {
            const hideGrass = phase === PHASES.loading || phase === PHASES.warmup || phase === PHASES.resettling
            const t = Math.min(1, (delta || 0.016) * (hideGrass ? 6 : 1.4))
            grassAlphaRef.current = THREE.MathUtils.lerp(grassAlphaRef.current, hideGrass ? 0 : 1, t)
            grassMaterial.uniforms.uGrassGlobalAlpha.value = grassAlphaRef.current
        }

        /**
         * Theme mask
         */
        // Live masked theme transition: ONE update drives the shared mask uniforms for EVERY themed
        // material (they all spread themeMaskUniforms), plus the outgoing-theme values on the two
        // ground materials (identity when inactive — old falls back to the live values).
        {
            updateThemeMask(frameState.gl, state.themeTransitionParameters)
            const old = themeMask.active ? themeMask.old : null
            terrainMaterial.uniforms.uBaseColorOld.value.set(old?.terrainColor ?? state.terrainParameters.color)
            terrainMaterial.uniforms.uBaseBrightnessOld.value = old?.terrainBrightness ?? state.terrainParameters.baseBrightness
            terrainMaterial.uniforms.uGroundTextureContrastOld.value = old?.terrainTextureContrast ?? state.terrainParameters.groundTextureContrast
            grassMaterial.uniforms.uGrassBaseColorOld.value.set(old?.grassBase ?? state.grassParameters.colorBase)
            grassMaterial.uniforms.uGrassTintCyanOld.value.set(old?.tintCyan ?? state.grassPatchParameters.tintColorCyan)
            grassMaterial.uniforms.uGrassTintVioletOld.value.set(old?.tintViolet ?? state.grassPatchParameters.tintColorViolet)
            grassMaterial.uniforms.uGrassTintYellowOld.value.set(old?.tintYellow ?? state.grassPatchParameters.tintColorYellow)
            grassMaterial.uniforms.uGrassTintGreenOld.value.set(old?.tintGreen ?? state.grassPatchParameters.tintColorGreen)
            grassMaterial.uniforms.uBaseBrightnessOld.value = old?.grassBrightness ?? state.grassParameters.baseBrightness
            grassMaterial.uniforms.uLightenColorOld.value.set(old?.lightenColor ?? state.grassParameters.lightenColor ?? '#cdeebf')
            // The border-fade target (the sky colour) is themed too — keep the far edge on the mask.
            terrainMaterial.uniforms.uBackgroundColorOld.value.set(old?.bgColor ?? state.backgroundParameters.backgroundColor)
            grassMaterial.uniforms.uBackgroundColorOld.value.set(old?.bgColor ?? state.backgroundParameters.backgroundColor)
        }

        /**
         * Frame uniforms
         */
        terrainMaterial.uniforms.uCircleCenter.value.copy(state.smoothedCircleCenter)
        terrainMaterial.uniforms.uLanternPosition.value.copy(state.lanternPosition)
        grassMaterial.uniforms.uTime.value = frameState.clock.elapsedTime
        grassMaterial.uniforms.uCircleCenter.value.copy(state.smoothedCircleCenter)
        grassMaterial.uniforms.uLanternPosition.value.copy(state.lanternPosition)
        // Grass see-through (hero + sheep) is the same shared buffer as the props, but it can be
        // toggled OFF for the grass only (props stay see-through). Off → count 0 skips the loop.
        grassMaterial.uniforms.uCharSeeThroughCount.value =
            seeThrough.enabled && seeThrough.grassEnabled ? characterSeeThrough.count : 0

        revealCircle.centerX = state.smoothedCircleCenter.x
        revealCircle.centerZ = state.smoothedCircleCenter.z
        revealCircle.chunkSize = chunkSize

        /**
         * Dithering scale
         */
        // Bake the resolution factor into the screen-space sizes so the dithering stays
        // consistent across 1080p / 4k. (The paintery border brush is world-anchored, so it
        // needs no per-resolution size here — only the props use the screen-space variant.)
        const refScale = getRefScale(frameState)
        const pixelSize = state.ditheringParameters.pixelSize * refScale
        terrainMaterial.uniforms.uPixelSize.value = pixelSize
        grassMaterial.uniforms.uPixelSize.value = pixelSize

        /**
         * Chunk grid
         */
        const heroPosition = state.heroPosition
        const safeChunkSize = Math.max(0.0001, chunkSize)
        const chunkX = Math.round(heroPosition.x / safeChunkSize)
        const chunkZ = Math.round(heroPosition.z / safeChunkSize)

        if (chunkX !== currentChunk.current.x || chunkZ !== currentChunk.current.z || currentChunk.current.size !== safeChunkSize || activeChunks.length === 0) {
            currentChunk.current = { x: chunkX, z: chunkZ, size: safeChunkSize }

            const newChunks = []
            for (let x = -ACTIVE_CHUNK_RADIUS; x <= ACTIVE_CHUNK_RADIUS; x++) {
                for (let z = -ACTIVE_CHUNK_RADIUS; z <= ACTIVE_CHUNK_RADIUS; z++) {
                    newChunks.push({
                        x: chunkX + x,
                        z: chunkZ + z,
                        key: `${chunkX + x},${chunkZ + z}`,
                    })
                }
            }

            desiredChunkKeysRef.current = new Set(newChunks.map((chunk) => chunk.key))
            if (activeChunks.length === 0) {
                setActiveChunks(newChunks)
                pendingChunksRef.current = []
                pruneChunksRef.current = false
                return
            }

            const activeKeys = new Set(activeChunks.map((chunk) => chunk.key))
            pendingChunksRef.current = newChunks.filter((chunk) => !activeKeys.has(chunk.key))
            pruneChunksRef.current = true
        }

        /**
         * Chunk streaming
         */
        // Stream one incoming edge chunk per frame. Existing edge chunks stay alive
        // until all replacements are ready, avoiding both a visible gap and one large
        // synchronous grass/object generation spike at every chunk boundary.
        if (pendingChunksRef.current.length > 0) {
            const nextChunk = pendingChunksRef.current.shift()
            setActiveChunks((chunks) => (chunks.some((chunk) => chunk.key === nextChunk.key) ? chunks : [...chunks, nextChunk]))
        } else if (pruneChunksRef.current) {
            const desiredKeys = desiredChunkKeysRef.current
            setActiveChunks((chunks) => chunks.filter((chunk) => desiredKeys.has(chunk.key)))
            pruneChunksRef.current = false
        }
    })

    return (
        <group>
            {activeChunks.map((chunk) => (
                <TerrainChunk
                    key={chunk.key}
                    x={chunk.x}
                    z={chunk.z}
                    size={chunkSize}
                    terrainMaterial={terrainMaterial}
                    grassMaterial={grassMaterial}
                />
            ))}
            <ScatteredObjects activeChunks={activeChunks} chunkSize={chunkSize} />
            <GrassTrail grassMaterial={grassMaterial} />
        </group>
    )
}
