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
    const grassBaseBrightness = useStore((s) => s.grassParameters.baseBrightness)
    const grassPatchParameters = useStore((s) => s.grassPatchParameters)
    const windParameters = useStore((s) => s.windParameters)
    const lanternGroundLightParameters = useStore((s) => s.lanternGroundLightParameters)
    const roadParameters = useStore((s) => s.roadParameters)
    const trailCanvasSize = useStore((s) => s.trailParameters.chunkSize)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGrassFadeOffset = useStore((s) => s.borderParameters.grassFadeOffset)
    const borderGroundOffset = useStore((s) => s.borderParameters.groundOffset)
    const borderGroundFadeOffset = useStore((s) => s.borderParameters.groundFadeOffset)
    const pixelSize = useStore((s) => s.ditheringParameters.pixelSize)
    const ditherModeValue = useStore((s) => (s.ditheringParameters.ditherMode === 'Bayer' ? 1 : 0))

    const emptyTrailTexture = useMemo(() => {
        const texture = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat)
        texture.needsUpdate = true
        return texture
    }, [])

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
                    uBaseBrightness: { value: grassBaseBrightness },
                    uLeanFactor: { value: grassParameters.leanFactor },
                    uCameraFacingStrength: { value: grassPatchParameters.cameraFacingStrength },
                    uOrientationVariation: { value: grassPatchParameters.orientationVariation },
                    uRoadGrassMinScale: { value: roadParameters.grassMinScale },
                    uDebugBorders: { value: grassPatchParameters.debugBorders ? 1 : 0 },
                    uDebugPatchColors: { value: grassPatchParameters.debugPatchColors ? 1 : 0 },

                    uWindDirection: { value: windParameters.direction },
                    uWindScale: { value: windParameters.scale },
                    uWindStrength: { value: windParameters.strength },
                    uWindSpeed: { value: windParameters.speed },
                    uTrailTexture: { value: emptyTrailTexture },
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
                    uLanternPosition: { value: new THREE.Vector3() },
                    uLanternLightRadius: { value: lanternGroundLightParameters.radius },
                    uLanternLightEdgeSoftness: { value: lanternGroundLightParameters.edgeSoftness },
                    uLanternLightNoiseScale: { value: lanternGroundLightParameters.edgeNoiseScale },
                    uLanternLightNoiseStrength: { value: lanternGroundLightParameters.edgeNoiseStrength },
                    uLanternLightInnerBrightness: { value: lanternGroundLightParameters.innerBrightness },
                    uLanternLightOuterDarkness: { value: lanternGroundLightParameters.outerDarkness },
                },
                vertexShader: grassVertexShader,
                fragmentShader: grassFragmentShader,
                side: THREE.FrontSide,
            }),
        [emptyTrailTexture]
    )

    useEffect(() => {
        const u = material.uniforms
        u.uPixelSize.value = pixelSize
        u.uDitherMode.value = ditherModeValue
        u.uGrassSegments.value = grassParameters.segmentsCount
        u.uGrassChunkSize.value = chunkSize
        u.uGrassWidth.value = grassParameters.width
        u.uGrassHeight.value = grassParameters.height
        u.uBaseBrightness.value = grassBaseBrightness
        u.uLeanFactor.value = grassParameters.leanFactor
        u.uCameraFacingStrength.value = grassPatchParameters.cameraFacingStrength
        u.uOrientationVariation.value = grassPatchParameters.orientationVariation
        u.uRoadGrassMinScale.value = roadParameters.enabled ? roadParameters.grassMinScale : 1
        u.uDebugBorders.value = grassPatchParameters.debugBorders ? 1 : 0
        u.uDebugPatchColors.value = grassPatchParameters.debugPatchColors ? 1 : 0

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
        u.uLanternLightRadius.value = lanternGroundLightParameters.radius
        u.uLanternLightEdgeSoftness.value = lanternGroundLightParameters.edgeSoftness
        u.uLanternLightNoiseScale.value = lanternGroundLightParameters.edgeNoiseScale
        u.uLanternLightNoiseStrength.value = lanternGroundLightParameters.edgeNoiseStrength
        u.uLanternLightInnerBrightness.value = lanternGroundLightParameters.innerBrightness
        u.uLanternLightOuterDarkness.value = lanternGroundLightParameters.outerDarkness
    }, [
        material,
        grassParameters,
        grassBaseBrightness,
        grassPatchParameters,
        windParameters,
        lanternGroundLightParameters,
        roadParameters,
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
            emptyTrailTexture.dispose()
        }
    }, [material, emptyTrailTexture])

    return material
}
