import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import terrainVertexShader from '../shaders/terrain/vertex.glsl'
import terrainFragmentShader from '../shaders/terrain/fragment.glsl'
import useStore from '../stores/useStore.jsx'
import { getGroundShadowData } from '../world/utils/groundShadowField.js'

// Edge fade modes shared across the world: 0 = Dither, 1 = Color, 2 = Paintery.
export function fadeModeToInt(mode) {
    return mode === 'Color' ? 1 : mode === 'Paintery' ? 2 : 0
}

export default function useTerrainMaterial({
    chunkSize,
    initialCircleRadius,
    noiseTexture,
    groundTexture,
    painteryTexture,
}) {
    const terrainColor = useStore((s) => s.terrainParameters.color)
    const backgroundColor = useStore((s) => s.backgroundParameters.backgroundColor)
    const terrainBaseBrightness = useStore((s) => s.terrainParameters.baseBrightness)
    const groundTextureEnabled = useStore((s) => s.terrainParameters.groundTextureEnabled)
    const groundTextureScale = useStore((s) => s.terrainParameters.groundTextureScale)
    const groundTextureContrast = useStore((s) => s.terrainParameters.groundTextureContrast)
    const shadowRadius = useStore((s) => s.terrainParameters.shadowRadius ?? 1)
    const shadowSoftness = useStore((s) => s.terrainParameters.shadowSoftness ?? 0.65)
    const shadowDarkness = useStore((s) => s.terrainParameters.shadowDarkness ?? 1)
    const roadParameters = useStore((s) => s.roadParameters)
    const lanternGroundLightParameters = useStore((s) => s.lanternGroundLightParameters)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGroundOffset = useStore((s) => s.borderParameters.groundOffset)
    const borderGroundFadeOffset = useStore((s) => s.borderParameters.groundFadeOffset)
    const borderFadeMode = useStore((s) => s.borderParameters.fadeMode)
    const borderParameters = useStore((s) => s.borderParameters)
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
                uFadeMode: { value: fadeModeToInt(borderFadeMode) },
                uPainteryTexture: { value: painteryTexture },
                uPainterySize: { value: borderParameters.painterySize },
                uPainteryScreenBlend: { value: borderParameters.painteryScreenBlend },
                uPainteryDrift: { value: borderParameters.painteryDrift },
                uPainteryLayer2Scale: { value: borderParameters.painteryLayer2Scale },
                uPainteryBleed: { value: borderParameters.painteryBleed },
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
                // Character ground shadows (hero + companions): shared [x, z, radius, strength] buffer,
                // mutated each frame and re-uploaded — like uTramplers. Drawn into the opaque ground.
                uGroundShadows: { value: getGroundShadowData() },
                uShadowRadiusMul: { value: shadowRadius },
                uShadowSoftness: { value: shadowSoftness },
                uShadowDarkness: { value: shadowDarkness },
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
        u.uFadeMode.value = fadeModeToInt(borderFadeMode)
        u.uPainterySize.value = borderParameters.painterySize
        u.uPainteryScreenBlend.value = borderParameters.painteryScreenBlend
        u.uPainteryDrift.value = borderParameters.painteryDrift
        u.uPainteryLayer2Scale.value = borderParameters.painteryLayer2Scale
        u.uPainteryBleed.value = borderParameters.painteryBleed
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
        u.uShadowRadiusMul.value = shadowRadius
        u.uShadowSoftness.value = shadowSoftness
        u.uShadowDarkness.value = shadowDarkness
    }, [
        material,
        terrainColor,
        shadowRadius,
        shadowSoftness,
        shadowDarkness,
        backgroundColor,
        terrainBaseBrightness,
        chunkSize,
        borderGroundOffset,
        borderGroundFadeOffset,
        borderFadeMode,
        borderParameters,
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
