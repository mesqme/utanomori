import { useState, useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { sharedNoise2D } from './utils/worldNoise.js'
import { gsap } from 'gsap'
import * as THREE from 'three'

import TerrainChunk from './TerrainChunk.jsx'
import ScatteredObjects from './ScatteredObjects.jsx'
import GrassTrail from './GrassTrail.jsx'
import { revealCircle } from './utils/revealCircle.js'
import { useBakedPainteryTexture } from './utils/useBakedPainteryTexture.js'
import { getRefScale } from './utils/screenScale.js'
import useTerrainMaterial from '../materials/TerrainMaterial.jsx'
import useGrassMaterial from '../materials/GrassMaterial.jsx'
import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { loaderInteraction } from '../loader/loaderInteraction.js'

import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import noiseTextureUrl from '../assets/textures/noiseTexture.png'
import groundTextureUrl from '../assets/textures/ground.png'

const START_CIRCLE_RADIUS = 0.07
// Hovering the GO circle in warmup previews this much of the world (a partial reveal — well
// past the red hat but not the full gameplay radius), then fades back when the pointer leaves.
const WARMUP_HOVER_RADIUS = 0.45
const WARMUP_HOVER_LERP = 6 // grow-in speed while hovering
const WARMUP_FADE_LERP = 2.5 // slower fade-back when the pointer leaves
const START_RADIUS_DELAY = 1.1
const ACTIVE_CHUNK_RADIUS = 2

export default function Terrain() {
    const [activeChunks, setActiveChunks] = useState([])

    const currentChunk = useRef({ x: 0, z: 0 })
    const radiusAnimationRef = useRef(null)
    const prevPhaseRef = useRef(PHASES.loading)
    const circleRadiusRef = useRef(START_CIRCLE_RADIUS)
    const pendingChunksRef = useRef([])
    const desiredChunkKeysRef = useRef(new Set())
    const pruneChunksRef = useRef(false)

    const phase = usePhases((s) => s.phase)
    const chunkSize = useStore((s) => s.terrainParameters.chunkSize)
    const borderCircleRadius = useStore((s) => s.borderParameters.circleRadiusFactor)
    const introReplayNonce = useStore((s) => s.introReplayNonce)

    const noise2D = sharedNoise2D

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

    const groundTexture = useTexture(
        groundTextureUrl,
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.colorSpace = THREE.NoColorSpace
            return texture
        },
        [groundTextureUrl]
    )

    // Selectable source texture for the bake (drei preloads all six so swapping is instant).
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

    // The intro reveal moves with the camera travel: the lit circle shrinks slightly while the
    // camera rises, then opens out to full as it spirals down. Timed to the (tunable) intro
    // durations so the two stay in sync; replayable via the "redo the animation" button.
    const runIntroReveal = () => {
        if (radiusAnimationRef.current) radiusAnimationRef.current.kill()
        const intro = useStore.getState().introCameraParameters
        const startValue = circleRadiusRef.current
        const reduced = Math.max(START_CIRCLE_RADIUS, startValue - intro.revealReduce)
        const obj = { value: startValue }
        const tl = gsap.timeline({
            onComplete: () => {
                radiusAnimationRef.current = null
            },
        })
        tl.to(obj, { value: reduced, duration: Math.max(0.001, intro.riseDuration), ease: 'power2.out', onUpdate: () => setCircleRadius(obj.value) })
        tl.to(obj, { value: borderCircleRadius, duration: Math.max(0.001, intro.spiralDuration), ease: 'power2.out', onUpdate: () => setCircleRadius(obj.value) })
        radiusAnimationRef.current = tl
    }

    useEffect(() => {
        return () => {
            if (radiusAnimationRef.current) {
                radiusAnimationRef.current.kill()
                radiusAnimationRef.current = null
            }
            noiseTexture.dispose()
            groundTexture.dispose()
        }
    }, [noiseTexture, groundTexture])

    useEffect(() => {
        if (phase === PHASES.intro) {
            // Reveal flows with the camera travel: shrink slightly on the rise, open on the spiral.
            runIntroReveal()
        } else if (phase === PHASES.start || phase === PHASES.credits) {
            // Full circle during gameplay / credits (debug jumps straight here).
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

        // Warmup: hovering the GO circle previews more of the world (the reveal circle grows
        // out from under the red hat), then fades back gently when the pointer leaves.
        if (phase === PHASES.warmup && !radiusAnimationRef.current) {
            const hovering = loaderInteraction.hovered
            const target = hovering ? WARMUP_HOVER_RADIUS : START_CIRCLE_RADIUS
            const rate = hovering ? WARMUP_HOVER_LERP : WARMUP_FADE_LERP
            const t = Math.min(1, (delta || 0.016) * rate)
            setCircleRadius(THREE.MathUtils.lerp(circleRadiusRef.current, target, t))
        }

        terrainMaterial.uniforms.uCircleCenter.value.copy(state.smoothedCircleCenter)
        terrainMaterial.uniforms.uLanternPosition.value.copy(state.lanternPosition)
        grassMaterial.uniforms.uTime.value = frameState.clock.elapsedTime
        grassMaterial.uniforms.uCircleCenter.value.copy(state.smoothedCircleCenter)
        grassMaterial.uniforms.uLanternPosition.value.copy(state.lanternPosition)

        revealCircle.centerX = state.smoothedCircleCenter.x
        revealCircle.centerZ = state.smoothedCircleCenter.z
        revealCircle.chunkSize = chunkSize

        // Bake the resolution factor into the screen-space sizes so the paintery edge
        // and dithering stay consistent across 1080p / 4k.
        const refScale = getRefScale(frameState)
        const painterySize = state.borderParameters.painterySize * refScale
        const pixelSize = state.ditheringParameters.pixelSize * refScale
        terrainMaterial.uniforms.uPainterySize.value = painterySize
        terrainMaterial.uniforms.uPixelSize.value = pixelSize
        grassMaterial.uniforms.uPainterySize.value = painterySize
        grassMaterial.uniforms.uPixelSize.value = pixelSize

        const ballPosition = state.ballPosition
        const safeChunkSize = Math.max(0.0001, chunkSize)
        const chunkX = Math.round(ballPosition.x / safeChunkSize)
        const chunkZ = Math.round(ballPosition.z / safeChunkSize)

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
                    noise2D={noise2D}
                    terrainMaterial={terrainMaterial}
                    grassMaterial={grassMaterial}
                />
            ))}
            <ScatteredObjects activeChunks={activeChunks} chunkSize={chunkSize} noise2D={noise2D} />
            <GrassTrail grassMaterial={grassMaterial} />
        </group>
    )
}
