import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import terrainVertexShader from '../shaders/terrain/vertex.glsl'
import terrainFragmentShader from '../shaders/terrain/fragment.glsl'
import useStore from '../stores/useStore.jsx'

export default function useTerrainMaterial({
    chunkSize,
    initialCircleRadius,
    noiseTexture,
    groundTexture,
}) {
    const terrainColor = useStore((s) => s.terrainParameters.color)
    const backgroundColor = useStore((s) => s.terrainParameters.backgroundColor)
    const terrainBaseBrightness = useStore((s) => s.terrainParameters.baseBrightness)
    const groundTextureEnabled = useStore((s) => s.terrainParameters.groundTextureEnabled)
    const groundTextureScale = useStore((s) => s.terrainParameters.groundTextureScale)
    const groundTextureContrast = useStore((s) => s.terrainParameters.groundTextureContrast)
    const roadParameters = useStore((s) => s.roadParameters)
    const lanternGroundLightParameters = useStore((s) => s.lanternGroundLightParameters)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGroundOffset = useStore((s) => s.borderParameters.groundOffset)
    const borderGroundFadeOffset = useStore((s) => s.borderParameters.groundFadeOffset)
    const borderFadeMode = useStore((s) => s.borderParameters.fadeMode)
    const pixelSize = useStore((s) => s.ditheringParameters.pixelSize)
    const ditherModeValue = useStore((s) => (s.ditheringParameters.ditherMode === 'Bayer' ? 1 : 0))

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uBaseColor: { value: new THREE.Color(terrainColor) },
                uBackgroundColor: { value: new THREE.Color(backgroundColor) },
                uBaseBrightness: { value: terrainBaseBrightness },
                uCircleCenter: { value: new THREE.Vector3() },
                uPatchSize: { value: chunkSize },
                uCircleRadiusFactor: { value: initialCircleRadius },
                uGroundOffset: { value: borderGroundOffset },
                uGroundFadeOffset: { value: borderGroundFadeOffset },
                uFadeMode: { value: borderFadeMode === 'Color' ? 1 : 0 },
                uNoiseTexture: { value: noiseTexture },
                uNoiseStrength: { value: borderNoiseStrength },
                uNoiseScale: { value: borderNoiseScale },
                uGroundTexture: { value: groundTexture },
                uGroundTextureEnabled: { value: groundTextureEnabled ? 1 : 0 },
                uGroundTextureScale: { value: groundTextureScale },
                uGroundTextureContrast: { value: groundTextureContrast },
                uRoadEnabled: { value: roadParameters.enabled ? 1 : 0 },
                uRoadWidth: { value: roadParameters.width },
                uRoadSoftness: { value: roadParameters.softness },
                uRoadGroundBrightness: { value: roadParameters.groundBrightness },
                uRoadGroundNoiseScale: { value: roadParameters.groundNoiseScale },
                uRoadGroundNoiseStrength: { value: roadParameters.groundNoiseStrength },
                uRoadGroundEdgeSharpness: { value: roadParameters.groundEdgeSharpness },
                uLanternPosition: { value: new THREE.Vector3() },
                uLanternLightRadius: { value: lanternGroundLightParameters.radius },
                uLanternLightEdgeSoftness: { value: lanternGroundLightParameters.edgeSoftness },
                uLanternLightNoiseScale: { value: lanternGroundLightParameters.edgeNoiseScale },
                uLanternLightNoiseStrength: { value: lanternGroundLightParameters.edgeNoiseStrength },
                uLanternLightInnerBrightness: { value: lanternGroundLightParameters.innerBrightness },
                uLanternLightOuterDarkness: { value: lanternGroundLightParameters.outerDarkness },
                uPixelSize: { value: pixelSize },
                uDitherMode: { value: ditherModeValue }, // 0: Diamond, 1: Bayer
            },
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragmentShader,
        })
    }, [])

    useEffect(() => {
        const u = material.uniforms
        u.uBaseColor.value.set(terrainColor)
        u.uBackgroundColor.value.set(backgroundColor)
        u.uBaseBrightness.value = terrainBaseBrightness
        u.uPatchSize.value = chunkSize
        u.uGroundOffset.value = borderGroundOffset
        u.uGroundFadeOffset.value = borderGroundFadeOffset
        u.uFadeMode.value = borderFadeMode === 'Color' ? 1 : 0
        u.uNoiseTexture.value = noiseTexture
        u.uNoiseStrength.value = borderNoiseStrength
        u.uNoiseScale.value = borderNoiseScale
        u.uGroundTexture.value = groundTexture
        u.uGroundTextureEnabled.value = groundTextureEnabled ? 1 : 0
        u.uGroundTextureScale.value = groundTextureScale
        u.uGroundTextureContrast.value = groundTextureContrast
        u.uRoadEnabled.value = roadParameters.enabled ? 1 : 0
        u.uRoadWidth.value = roadParameters.width
        u.uRoadSoftness.value = roadParameters.softness
        u.uRoadGroundBrightness.value = roadParameters.groundBrightness
        u.uRoadGroundNoiseScale.value = roadParameters.groundNoiseScale
        u.uRoadGroundNoiseStrength.value = roadParameters.groundNoiseStrength
        u.uRoadGroundEdgeSharpness.value = roadParameters.groundEdgeSharpness
        u.uLanternLightRadius.value = lanternGroundLightParameters.radius
        u.uLanternLightEdgeSoftness.value = lanternGroundLightParameters.edgeSoftness
        u.uLanternLightNoiseScale.value = lanternGroundLightParameters.edgeNoiseScale
        u.uLanternLightNoiseStrength.value = lanternGroundLightParameters.edgeNoiseStrength
        u.uLanternLightInnerBrightness.value = lanternGroundLightParameters.innerBrightness
        u.uLanternLightOuterDarkness.value = lanternGroundLightParameters.outerDarkness
        u.uPixelSize.value = pixelSize
        u.uDitherMode.value = ditherModeValue
    }, [
        material,
        terrainColor,
        backgroundColor,
        terrainBaseBrightness,
        chunkSize,
        borderGroundOffset,
        borderGroundFadeOffset,
        borderFadeMode,
        noiseTexture,
        borderNoiseStrength,
        borderNoiseScale,
        groundTexture,
        groundTextureEnabled,
        groundTextureScale,
        groundTextureContrast,
        roadParameters,
        lanternGroundLightParameters,
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
