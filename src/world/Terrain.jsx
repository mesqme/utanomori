import { useState, useRef, useEffect } from 'react'
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

import noiseTextureUrl from '../assets/textures/noiseTexture.png'
import groundTextureUrl from '../assets/textures/ground.png'
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'

const START_CIRCLE_RADIUS = 0.07
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

    const painteryTexture = useTexture(
        paintaryAlpha01Url,
        (texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            texture.minFilter = THREE.LinearFilter
            texture.magFilter = THREE.LinearFilter
            texture.colorSpace = THREE.NoColorSpace
            return texture
        },
        [paintaryAlpha01Url]
    )

    // Bake the smoothing/threshold into the brush texture once, then sample the
    // stylized copy everywhere instead of running Kuwahara over the whole frame.
    const painteryTextureParameters = useStore((s) => s.painteryTextureParameters)
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

    useEffect(() => {
        return () => {
            if (radiusAnimationRef.current) {
                radiusAnimationRef.current.kill()
                radiusAnimationRef.current = null
            }
            noiseTexture.dispose()
            groundTexture.dispose()
            painteryTexture.dispose()
        }
    }, [noiseTexture, groundTexture, painteryTexture])

    useEffect(() => {
        if (phase === PHASES.intro) {
            // Reveal the world as the camera arcs from the top hat-view to the front.
            if (radiusAnimationRef.current) {
                radiusAnimationRef.current.kill()
            }
            setCircleRadius(START_CIRCLE_RADIUS)
            const radiusObj = { value: START_CIRCLE_RADIUS }
            radiusAnimationRef.current = gsap.to(radiusObj, {
                value: borderCircleRadius,
                duration: 2.2,
                delay: 0.3,
                ease: 'power2.out',
                onUpdate: () => setCircleRadius(radiusObj.value),
                onComplete: () => {
                    radiusAnimationRef.current = null
                },
            })
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

    useFrame((frameState) => {
        const state = useStore.getState()

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
