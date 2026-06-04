import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import grassVertexShader from '../shaders/grass/vertex.glsl'
import grassFragmentShader from '../shaders/grass/fragment.glsl'
import useStore from '../stores/useStore.jsx'

export default function useGrassMaterial({
    chunkSize,
    initialCircleRadius,
    noiseTexture,
}) {
    const grassParameters = useStore((s) => s.grassParameters)
    const windParameters = useStore((s) => s.windParameters)
    const trailCanvasSize = useStore((s) => s.trailParameters.chunkSize)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGrassFadeOffset = useStore((s) => s.borderParameters.grassFadeOffset)
    const borderGroundOffset = useStore((s) => s.borderParameters.groundOffset)
    const borderGroundFadeOffset = useStore((s) => s.borderParameters.groundFadeOffset)
    const pixelSize = useStore((s) => s.ditheringParameters.pixelSize)
    const ditherModeValue = useStore((s) => (s.ditheringParameters.ditherMode === 'Bayer' ? 1 : 0))

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    uPixelSize: { value: pixelSize },
                    uDitherMode: { value: ditherModeValue }, // 0: Diamond, 1: Bayer
                    uTime: { value: 0 },
                    uGrassSegments: { value: grassParameters.segmentsCount },
                    uGrassChunkSize: { value: chunkSize },
                    uGrassWidth: { value: grassParameters.width },
                    uGrassHeight: { value: grassParameters.height },
                    uGrassBaseColor: { value: new THREE.Color(grassParameters.colorBase) },
                    uGrassTopColor: { value: new THREE.Color(grassParameters.colorTop) },
                    uLeanFactor: { value: grassParameters.leanFactor },

                    uWindDirection: { value: windParameters.direction },
                    uWindScale: { value: windParameters.scale },
                    uWindStrength: { value: windParameters.strength },
                    uWindSpeed: { value: windParameters.speed },
                    uTrailTexture: { value: null },
                    uBallPosition: { value: new THREE.Vector3() },
                    uCircleCenter: { value: new THREE.Vector3() },
                    uTrailCanvasSize: { value: trailCanvasSize },
                    uSobelMode: { value: grassParameters.sobelMode },

                    uNoiseTexture: { value: noiseTexture },
                    uNoiseStrength: { value: borderNoiseStrength },
                    uNoiseScale: { value: borderNoiseScale },
                    uCircleRadiusFactor: { value: initialCircleRadius },
                    uGrassFadeOffset: { value: borderGrassFadeOffset },
                    uGroundOffset: { value: borderGroundOffset },
                    uGroundFadeOffset: { value: borderGroundFadeOffset },
                },
                vertexShader: grassVertexShader,
                fragmentShader: grassFragmentShader,
                side: THREE.FrontSide,
            }),
        []
    )

    useEffect(() => {
        const u = material.uniforms
        u.uPixelSize.value = pixelSize
        u.uDitherMode.value = ditherModeValue
        u.uGrassSegments.value = grassParameters.segmentsCount
        u.uGrassChunkSize.value = chunkSize
        u.uGrassWidth.value = grassParameters.width
        u.uGrassHeight.value = grassParameters.height
        u.uGrassBaseColor.value.set(grassParameters.colorBase)
        u.uGrassTopColor.value.set(grassParameters.colorTop)
        u.uLeanFactor.value = grassParameters.leanFactor

        u.uWindDirection.value = windParameters.direction
        u.uWindScale.value = windParameters.scale
        u.uWindStrength.value = windParameters.strength
        u.uWindSpeed.value = windParameters.speed
        u.uTrailCanvasSize.value = trailCanvasSize
        u.uSobelMode.value = grassParameters.sobelMode

        u.uNoiseTexture.value = noiseTexture
        u.uNoiseStrength.value = borderNoiseStrength
        u.uNoiseScale.value = borderNoiseScale
        u.uGrassFadeOffset.value = borderGrassFadeOffset
        u.uGroundOffset.value = borderGroundOffset
        u.uGroundFadeOffset.value = borderGroundFadeOffset
    }, [
        material,
        grassParameters,
        windParameters,
        trailCanvasSize,
        chunkSize,
        noiseTexture,
        borderNoiseStrength,
        borderNoiseScale,
        borderGrassFadeOffset,
        borderGroundOffset,
        borderGroundFadeOffset,
        pixelSize,
        ditherModeValue,
    ])

    useEffect(() => {
        return () => {
            material.dispose()
        }
    }, [material])

    return material
}
