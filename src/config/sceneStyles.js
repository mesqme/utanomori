import { mainCharacterMaterialPresets } from './mainCharacterMaterials.js'
import { characterStylizedDefaults } from './stylizedMaterialDefaults.js'

function cloneMaterials(materials) {
    return Object.fromEntries(Object.entries(materials).map(([id, colors]) => [id, { ...colors }]))
}

const complexStyle = {
    label: 'Complex',
    terrainParameters: {
        color: '#454496',
        backgroundColor: '#44336c',
        baseBrightness: 1,
        groundTextureEnabled: true,
        segments: 19,
        scale: 0.08,
        amplitude: 0,
        groundTextureScale: 0.05,
        groundTextureContrast: 0.45,
        chunkSize: 9,
    },
    grassParameters: {
        enabled: true,
        count: 1600,
        segmentsCount: 4,
        width: 0.28,
        height: 1.25,
        colorBase: '#028600',
        baseBrightness: 1,
        leanFactor: 0,
    },
    grassPatchParameters: {
        worldSeed: 9187,
        spacing: 2.6,
        jitter: 0.07,
        domainWarpScale: 0.46,
        domainWarpStrength: 1.23,
        patchHeightVariation: 0.25,
        patchWidthVariation: 0.19,
        patchColorVariation: 0.28,
        internalNoiseScale: 0.54,
        internalHeightVariation: 0.28,
        internalWidthVariation: 0.4,
        internalColorVariation: 1,
        internalLeanVariation: 0.08,
        radialLeanStrength: 0.16,
        cameraFacingStrength: 0.08,
        orientationVariation: 0.14,
        borderWidth: 0.75,
        borderMinScale: 0.75,
        tintColorCyan: '#1d55ff',
        tintColorViolet: '#2843eb',
        tintColorYellow: '#6e35ff',
        tintColorGreen: '#5130ff',
        debugCenters: false,
        debugBorders: false,
        debugPatchColors: false,
    },
    roadParameters: {
        enabled: true,
        worldSeed: 4242,
        laneSpacing: 24,
        nodeSpacing: 10,
        meanderStrength: 11.6,
        width: 1.5,
        softness: 1.85,
        grassMinScale: 0,
        groundBrightness: -0.15,
        groundNoiseScale: 2,
        groundNoiseStrength: 2,
        groundEdgeSharpness: 1,
    },
    windParameters: {
        direction: 0.65,
        scale: 0.35,
        strength: 0.2,
        speed: 1.1,
    },
    lanternGroundLightParameters: {
        radius: 3,
        edgeSoftness: 1.1,
        edgeNoiseScale: 0.39,
        edgeNoiseStrength: 0,
        innerBrightness: 0.4,
        outerDarkness: 0,
    },
    borderParameters: {
        noiseStrength: 0.77,
        noiseScale: 0.23,
        circleRadiusFactor: 1,
        groundFadeOffset: 3,
        groundOffset: -2.4,
        grassFadeOffset: 3.66,
    },
    ditheringParameters: {
        ditherMode: 'Bayer',
        pixelSize: 1,
    },
    characterParameters: {
        modelScale: 0.51,
        modelYOffset: 0.59,
        rotationOffset: 1.57,
        idleTimeScale: 1,
        runTimeScale: 1.2,
        runBlendInSpeed: 18,
        runBlendOutSpeed: 3,
    },
    characterMaterialParameters: {
        ...characterStylizedDefaults,
        materials: cloneMaterials(mainCharacterMaterialPresets.previous.materials),
    },
}

const flatColorsStyle = {
    ...complexStyle,
    label: 'Flat Colors',
    terrainParameters: {
        ...complexStyle.terrainParameters,
        groundTextureEnabled: false,
    },
    grassParameters: {
        ...complexStyle.grassParameters,
        enabled: false,
    },
    roadParameters: {
        ...complexStyle.roadParameters,
        enabled: false,
    },
    lanternGroundLightParameters: {
        ...complexStyle.lanternGroundLightParameters,
        radius: 3,
        edgeSoftness: 0,
        edgeNoiseScale: 0.39,
        edgeNoiseStrength: 0,
        innerBrightness: 0.4,
        outerDarkness: 0,
    },
    borderParameters: {
        ...complexStyle.borderParameters,
        noiseStrength: 0.08,
        noiseScale: 0.13,
        circleRadiusFactor: 1,
        groundFadeOffset: 0,
        grassFadeOffset: 2.45,
        groundOffset: -2.4,
    },
    characterMaterialParameters: {
        ...complexStyle.characterMaterialParameters,
        painterlyEnabled: false,
        materials: cloneMaterials(complexStyle.characterMaterialParameters.materials),
    },
}

export const sceneStylePresets = Object.freeze({
    complex: complexStyle,
    flatColors: flatColorsStyle,
})

export const defaultSceneStyleId = 'flatColors'
export const defaultSceneStyle = sceneStylePresets[defaultSceneStyleId]

export function cloneSceneStyleSection(section) {
    if (!section) return section
    if (!section.materials) return { ...section }

    return {
        ...section,
        materials: cloneMaterials(section.materials),
    }
}
