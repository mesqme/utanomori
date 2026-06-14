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

    const terrainMaterial = useTerrainMaterial({
        chunkSize,
        initialCircleRadius: START_CIRCLE_RADIUS,
        noiseTexture,
        groundTexture,
        painteryTexture,
    })
    const grassMaterial = useGrassMaterial({
        chunkSize,
        initialCircleRadius: START_CIRCLE_RADIUS,
        noiseTexture,
        painteryTexture,
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
        const wasStarted = prevPhaseRef.current === PHASES.start

        if (phase === PHASES.start) {
            if (!wasStarted) {
                const targetRadius = borderCircleRadius
                const startRadius = START_CIRCLE_RADIUS

                if (radiusAnimationRef.current) {
                    radiusAnimationRef.current.kill()
                    radiusAnimationRef.current = null
                }

                setCircleRadius(startRadius)

                const radiusObj = { value: startRadius }
                radiusAnimationRef.current = gsap.to(radiusObj, {
                    value: targetRadius,
                    duration: 2.0,
                    delay: START_RADIUS_DELAY,
                    ease: 'power2.out',
                    onUpdate: () => {
                        setCircleRadius(radiusObj.value)
                    },
                    onComplete: () => {
                        radiusAnimationRef.current = null
                    },
                })
            } else if (!radiusAnimationRef.current) {
                setCircleRadius(borderCircleRadius)
            }
        } else if (!radiusAnimationRef.current) {
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
            setActiveChunks(newChunks)
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
