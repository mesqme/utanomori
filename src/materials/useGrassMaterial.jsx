import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import grassVertexShader from '../shaders/grass/vertex.glsl'
import grassFragmentShader from '../shaders/grass/fragment.glsl'
import useStore from '../stores/useStore.jsx'
import { themeMaskUniforms } from '../world/state/themeMask.js'
import { fadeModeToInt } from './fadeMode.js'
import { getTrampleData } from '../world/state/trampleField.js'
import { characterSeeThrough } from '../world/state/characterSeeThrough.js'

// Characters react the grass via four independent layers (dissolve / lighten /
// scale / lean), each reading the fading trail texture or a radius around the
// characters (uTramplers). See GrassTrail + trampleField.
const sourceToInt = (source) => (source === 'Radius' ? 1 : 0)

// Whether any enabled layer uses the trail / radius source — lets the shader skip
// the trail samples or the trampler loop entirely when unused.
const computeSourceUsage = (p) => {
    const layers = [
        [p.dissolveEnabled, p.dissolveSource],
        [p.lightenEnabled, p.lightenSource],
        [p.scaleEnabled, p.scaleSource],
        [p.leanEnabled, p.leanSource],
    ]
    return {
        useTrail: layers.some(([enabled, source]) => enabled && source !== 'Radius') ? 1 : 0,
        useRadius: layers.some(([enabled, source]) => enabled && source === 'Radius') ? 1 : 0,
    }
}

export default function useGrassMaterial({
    chunkSize,
    initialCircleRadius,
    noiseTexture,
    painteryTexture,
}) {
    const grassParameters = useStore((s) => s.grassParameters)
    const backgroundColor = useStore((s) => s.backgroundParameters.backgroundColor)
    const grassBaseBrightness = useStore((s) => s.grassParameters.baseBrightness)
    const grassPatchParameters = useStore((s) => s.grassPatchParameters)
    const windParameters = useStore((s) => s.windParameters)
    const lanternGroundLightParameters = useStore((s) => s.lanternGroundLightParameters)
    const lanternGrassParameters = useStore((s) => s.lanternGrassParameters)
    const roadParameters = useStore((s) => s.roadParameters)
    const borderNoiseStrength = useStore((s) => s.borderParameters.noiseStrength)
    const borderNoiseScale = useStore((s) => s.borderParameters.noiseScale)
    const borderGrassFadeOffset = useStore((s) => s.borderParameters.grassFadeOffset)
    const borderFadeMode = useStore((s) => s.borderParameters.fadeMode)
    const borderParameters = useStore((s) => s.borderParameters)
    const pixelSize = useStore((s) => s.ditheringParameters.pixelSize)

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                uniforms: {
                    uPixelSize: { value: pixelSize },
                    uFadeMode: { value: fadeModeToInt(borderFadeMode) },
                    uPainteryTexture: { value: painteryTexture },
                    uPainteryDrift: { value: borderParameters.painteryDrift },
                    uPainteryLayer2Scale: { value: borderParameters.painteryLayer2Scale },
                    uBackgroundColor: { value: new THREE.Color(backgroundColor) },
                    uBackgroundColorOld: { value: new THREE.Color(backgroundColor) },
                    uTime: { value: 0 },
                    uGrassSegments: { value: grassParameters.segmentsCount },
                    uGrassChunkSize: { value: chunkSize },
                    uGrassWidth: { value: grassParameters.width },
                    uGrassHeight: { value: grassParameters.height },
                    uBaseBrightness: { value: grassBaseBrightness },
                    // The grass palette (the bake stores per-blade family + tone only) — recolouring
                    // is a uniform write, no field rebuild.
                    uGrassBaseColor: { value: new THREE.Color(grassParameters.colorBase) },
                    uGrassTintCyan: { value: new THREE.Color(grassPatchParameters.tintColorCyan) },
                    uGrassTintViolet: { value: new THREE.Color(grassPatchParameters.tintColorViolet) },
                    uGrassTintYellow: { value: new THREE.Color(grassPatchParameters.tintColorYellow) },
                    uGrassTintGreen: { value: new THREE.Color(grassPatchParameters.tintColorGreen) },
                    uGrassTintStrength: { value: 0.5 + (grassPatchParameters.patchColorVariation ?? 0.28) * 0.5 },
                    // Whole-field fade: 0 on the loading/GO screens (no top-down grass in the hover
                    // preview), driven up to 1 by Terrain once GO is pressed.
                    uGrassGlobalAlpha: { value: 0 },
                    // Outgoing-theme palette + the screen-space transition mask (Terrain.jsx drives
                    // these per frame during a masked theme switch).
                    uGrassBaseColorOld: { value: new THREE.Color(grassParameters.colorBase) },
                    uGrassTintCyanOld: { value: new THREE.Color(grassPatchParameters.tintColorCyan) },
                    uGrassTintVioletOld: { value: new THREE.Color(grassPatchParameters.tintColorViolet) },
                    uGrassTintYellowOld: { value: new THREE.Color(grassPatchParameters.tintColorYellow) },
                    uGrassTintGreenOld: { value: new THREE.Color(grassPatchParameters.tintColorGreen) },
                    uBaseBrightnessOld: { value: grassBaseBrightness },
                    uLightenColorOld: { value: new THREE.Color(grassParameters.lightenColor ?? '#cdeebf') },
                    ...themeMaskUniforms,
                    uCameraFacingStrength: { value: grassPatchParameters.cameraFacingStrength },
                    uOrientationVariation: { value: grassPatchParameters.orientationVariation },
                    uRoadGrassMinScale: { value: roadParameters.grassMinScale },

                    uWindDirection: { value: windParameters.direction },
                    uWindScale: { value: windParameters.scale },
                    uWindStrength: { value: windParameters.strength },
                    uWindSpeed: { value: windParameters.speed },
                    uCircleCenter: { value: new THREE.Vector3() },

                    uTrailTexture: { value: null },
                    uTrailCenter: { value: new THREE.Vector2() },
                    uTrailWorldSize: { value: 28 },
                    uTrailResolution: { value: 256 },
                    uTrampleEnabled: { value: 1 },
                    uTrailStrength: { value: grassParameters.trailStrength ?? 0.7 },
                    uTramplers: { value: getTrampleData() },
                    // Music-character see-through: grass in front of a sheep clears so it shows through
                    // (the trample only presses the grass down at foot level). Shared buffer, mutated
                    // by each SheepCreature each frame and re-uploaded — like uTramplers.
                    uCharSeeThrough: { value: characterSeeThrough.data },
                    uCharSeeThroughCount: { value: characterSeeThrough.count },
                    uUseTrailSource: { value: computeSourceUsage(grassParameters).useTrail },
                    uUseRadiusSource: { value: computeSourceUsage(grassParameters).useRadius },

                    uScaleEnabled: { value: grassParameters.scaleEnabled ? 1 : 0 },
                    uScaleSource: { value: sourceToInt(grassParameters.scaleSource) },
                    uScaleRadius: { value: grassParameters.scaleRadius ?? 2 },
                    uScaleStart: { value: grassParameters.scaleStart ?? 0.2 },
                    uScaleEnd: { value: grassParameters.scaleEnd ?? 1 },
                    uScaleRate: { value: grassParameters.scaleRate ?? 1 },
                    uScaleAmount: { value: grassParameters.scaleAmount ?? 0.68 },

                    uLeanEnabled: { value: grassParameters.leanEnabled ? 1 : 0 },
                    uLeanSource: { value: sourceToInt(grassParameters.leanSource) },
                    uLeanRadius: { value: grassParameters.leanRadius ?? 2 },
                    uLeanStart: { value: grassParameters.leanStart ?? 0.2 },
                    uLeanEnd: { value: grassParameters.leanEnd ?? 1 },
                    uLeanRate: { value: grassParameters.leanRate ?? 1 },
                    uLeanAmount: { value: grassParameters.leanAmount ?? 0.24 },

                    uDissolveEnabled: { value: grassParameters.dissolveEnabled ? 1 : 0 },
                    uDissolveSource: { value: sourceToInt(grassParameters.dissolveSource) },
                    uDissolveRadius: { value: grassParameters.dissolveRadius ?? 2 },
                    uDissolveStart: { value: grassParameters.dissolveStart ?? 0.1 },
                    uDissolveEnd: { value: grassParameters.dissolveEnd ?? 1 },
                    uDissolveRate: { value: grassParameters.dissolveRate ?? 1 },
                    uDissolveAmount: { value: grassParameters.dissolveAmount ?? 1 },
                    uDissolveMode: { value: grassParameters.dissolveMode === 'Dither' ? 1 : 0 },

                    uLightenEnabled: { value: grassParameters.lightenEnabled ? 1 : 0 },
                    uLightenSource: { value: sourceToInt(grassParameters.lightenSource) },
                    uLightenRadius: { value: grassParameters.lightenRadius ?? 2 },
                    uLightenStart: { value: grassParameters.lightenStart ?? 0.2 },
                    uLightenEnd: { value: grassParameters.lightenEnd ?? 1 },
                    uLightenRate: { value: grassParameters.lightenRate ?? 1 },
                    uLightenAmount: { value: grassParameters.lightenAmount ?? 0.16 },
                    uLightenColor: { value: new THREE.Color(grassParameters.lightenColor ?? '#cdeebf') },

                    uNoiseTexture: { value: noiseTexture },
                    uNoiseStrength: { value: borderNoiseStrength },
                    uNoiseScale: { value: borderNoiseScale },
                    uCircleRadiusFactor: { value: initialCircleRadius },
                    uGrassFadeOffset: { value: borderGrassFadeOffset },
                    uLanternPosition: { value: new THREE.Vector3() },
                    uLanternLightRadius: { value: lanternGroundLightParameters.radius },
                    uLanternLightEdgeSoftness: { value: lanternGroundLightParameters.edgeSoftness },
                    uLanternLightNoiseScale: { value: lanternGroundLightParameters.edgeNoiseScale },
                    uLanternLightNoiseStrength: { value: lanternGroundLightParameters.edgeNoiseStrength },
                    uLanternLightInnerBrightness: { value: lanternGroundLightParameters.innerBrightness },
                    uLanternLightOuterDarkness: { value: lanternGroundLightParameters.outerDarkness },
                    uLanternGrassEnabled: { value: lanternGrassParameters.enabled ? 1 : 0 },
                    uLanternGrassRadius: { value: lanternGrassParameters.radius },
                    uLanternGrassSoftness: { value: lanternGrassParameters.softness },
                    uLanternGrassScale: { value: lanternGrassParameters.scale },
                    uLanternGrassColor: { value: new THREE.Color(lanternGrassParameters.color) },
                    uLanternGrassAlpha: { value: lanternGrassParameters.alpha },
                    uLanternGrassColorAmount: { value: lanternGrassParameters.colorAmount },
                },
                vertexShader: grassVertexShader,
                fragmentShader: grassFragmentShader,
                side: THREE.FrontSide,
                transparent: true,
            }),
        []
    )

    useEffect(() => {
        const u = material.uniforms
        u.uPixelSize.value = pixelSize
        u.uFadeMode.value = fadeModeToInt(borderFadeMode)
        u.uPainteryDrift.value = borderParameters.painteryDrift
        u.uPainteryLayer2Scale.value = borderParameters.painteryLayer2Scale
        u.uBackgroundColor.value.set(backgroundColor)
        u.uGrassSegments.value = grassParameters.segmentsCount
        u.uGrassChunkSize.value = chunkSize
        u.uGrassWidth.value = grassParameters.width
        u.uGrassHeight.value = grassParameters.height
        u.uBaseBrightness.value = grassBaseBrightness
        u.uGrassBaseColor.value.set(grassParameters.colorBase)
        u.uGrassTintCyan.value.set(grassPatchParameters.tintColorCyan)
        u.uGrassTintViolet.value.set(grassPatchParameters.tintColorViolet)
        u.uGrassTintYellow.value.set(grassPatchParameters.tintColorYellow)
        u.uGrassTintGreen.value.set(grassPatchParameters.tintColorGreen)
        u.uGrassTintStrength.value = 0.5 + (grassPatchParameters.patchColorVariation ?? 0.28) * 0.5
        u.uCameraFacingStrength.value = grassPatchParameters.cameraFacingStrength
        u.uOrientationVariation.value = grassPatchParameters.orientationVariation
        u.uRoadGrassMinScale.value = roadParameters.enabled ? roadParameters.grassMinScale : 1

        u.uWindDirection.value = windParameters.direction
        u.uWindScale.value = windParameters.scale
        u.uWindStrength.value = windParameters.strength
        u.uWindSpeed.value = windParameters.speed

        u.uNoiseTexture.value = noiseTexture
        u.uNoiseStrength.value = borderNoiseStrength
        u.uNoiseScale.value = borderNoiseScale
        u.uGrassFadeOffset.value = borderGrassFadeOffset
        u.uLanternLightRadius.value = lanternGroundLightParameters.radius
        u.uLanternLightEdgeSoftness.value = lanternGroundLightParameters.edgeSoftness
        u.uLanternLightNoiseScale.value = lanternGroundLightParameters.edgeNoiseScale
        u.uLanternLightNoiseStrength.value = lanternGroundLightParameters.edgeNoiseStrength
        u.uLanternLightInnerBrightness.value = lanternGroundLightParameters.innerBrightness
        u.uLanternLightOuterDarkness.value = lanternGroundLightParameters.outerDarkness

        u.uLanternGrassEnabled.value = lanternGrassParameters.enabled ? 1 : 0
        u.uLanternGrassRadius.value = lanternGrassParameters.radius
        u.uLanternGrassSoftness.value = lanternGrassParameters.softness
        u.uLanternGrassScale.value = lanternGrassParameters.scale
        u.uLanternGrassColor.value.set(lanternGrassParameters.color)
        u.uLanternGrassAlpha.value = lanternGrassParameters.alpha
        u.uLanternGrassColorAmount.value = lanternGrassParameters.colorAmount

        u.uTrampleEnabled.value = (grassParameters.trampleEnabled ?? true) ? 1 : 0
        u.uTrailStrength.value = grassParameters.trailStrength ?? 0.7
        const sourceUsage = computeSourceUsage(grassParameters)
        u.uUseTrailSource.value = sourceUsage.useTrail
        u.uUseRadiusSource.value = sourceUsage.useRadius

        u.uScaleEnabled.value = grassParameters.scaleEnabled ? 1 : 0
        u.uScaleSource.value = sourceToInt(grassParameters.scaleSource)
        u.uScaleRadius.value = grassParameters.scaleRadius ?? 2
        u.uScaleStart.value = grassParameters.scaleStart ?? 0.2
        u.uScaleEnd.value = grassParameters.scaleEnd ?? 1
        u.uScaleRate.value = grassParameters.scaleRate ?? 1
        u.uScaleAmount.value = grassParameters.scaleAmount ?? 0.68

        u.uLeanEnabled.value = grassParameters.leanEnabled ? 1 : 0
        u.uLeanSource.value = sourceToInt(grassParameters.leanSource)
        u.uLeanRadius.value = grassParameters.leanRadius ?? 2
        u.uLeanStart.value = grassParameters.leanStart ?? 0.2
        u.uLeanEnd.value = grassParameters.leanEnd ?? 1
        u.uLeanRate.value = grassParameters.leanRate ?? 1
        u.uLeanAmount.value = grassParameters.leanAmount ?? 0.24

        u.uDissolveEnabled.value = grassParameters.dissolveEnabled ? 1 : 0
        u.uDissolveSource.value = sourceToInt(grassParameters.dissolveSource)
        u.uDissolveRadius.value = grassParameters.dissolveRadius ?? 2
        u.uDissolveStart.value = grassParameters.dissolveStart ?? 0.1
        u.uDissolveEnd.value = grassParameters.dissolveEnd ?? 1
        u.uDissolveRate.value = grassParameters.dissolveRate ?? 1
        u.uDissolveAmount.value = grassParameters.dissolveAmount ?? 1
        u.uDissolveMode.value = grassParameters.dissolveMode === 'Dither' ? 1 : 0

        u.uLightenEnabled.value = grassParameters.lightenEnabled ? 1 : 0
        u.uLightenSource.value = sourceToInt(grassParameters.lightenSource)
        u.uLightenRadius.value = grassParameters.lightenRadius ?? 2
        u.uLightenStart.value = grassParameters.lightenStart ?? 0.2
        u.uLightenEnd.value = grassParameters.lightenEnd ?? 1
        u.uLightenRate.value = grassParameters.lightenRate ?? 1
        u.uLightenAmount.value = grassParameters.lightenAmount ?? 0.16
        u.uLightenColor.value.set(grassParameters.lightenColor ?? '#cdeebf')
    }, [
        material,
        grassParameters,
        backgroundColor,
        grassBaseBrightness,
        grassPatchParameters,
        windParameters,
        lanternGroundLightParameters,
        lanternGrassParameters,
        roadParameters,
        chunkSize,
        noiseTexture,
        borderNoiseStrength,
        borderNoiseScale,
        borderGrassFadeOffset,
        borderFadeMode,
        borderParameters,
        pixelSize,
    ])

    useEffect(() => {
        return () => {
            material.dispose()
        }
    }, [material])

    return material
}
