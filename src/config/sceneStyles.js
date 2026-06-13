import { mainCharacterMaterialPresets } from './mainCharacterMaterials.js'
import { objectFieldDefaults } from './objectFieldDefaults.js'
import { painterlyPostDebugModes, painterlyPostDefaults } from './painterlyPostDefaults.js'
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
        trampleEnabled: true,
        trampleHeightScale: 0.32,
        trampleLean: 0.24,
        trampleStrength: 0.7,
        trampleThreshold: 0.2,
        trampleBrighten: 0.16,
        trampleFadeStart: 0.1,
        trampleDissolveAlpha: 1.0,
        trampleDissolveDither: 1.0,
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
    objectParameters: {
        ...objectFieldDefaults,
        painterlyEnabled: true,
        painterlyScale: 0.08,
        painterlyContrast: 1.05,
        painterlyBrightness: 0.5,
        painterlyColorStrength: 0,
        fadeOffset: 2.5,
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
        fadeMode: 'Color',
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
    painterlyPostParameters: {
        ...painterlyPostDefaults,
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
    objectParameters: {
        ...complexStyle.objectParameters,
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
        fadeMode: 'Dither',
        noiseStrength: 0.08,
        noiseScale: 0.13,
        circleRadiusFactor: 1,
        groundFadeOffset: 0,
        grassFadeOffset: 2.45,
        groundOffset: -2.4,
    },
    painterlyPostParameters: {
        ...complexStyle.painterlyPostParameters,
        enabled: false,
    },
    characterMaterialParameters: {
        ...complexStyle.characterMaterialParameters,
        painterlyEnabled: false,
        materials: cloneMaterials(complexStyle.characterMaterialParameters.materials),
    },
}

const magicGlowStyle = {
    ...complexStyle,
    label: 'Magic Glow',
    borderParameters: {
        ...complexStyle.borderParameters,
        fadeMode: 'Dither',
    },
    lanternGroundLightParameters: {
        ...complexStyle.lanternGroundLightParameters,
        radius: 3.55,
        edgeSoftness: 1.99,
        edgeNoiseScale: 0.39,
        edgeNoiseStrength: 0,
        innerBrightness: 2.0,
        outerDarkness: 0,
    },
    painterlyPostParameters: {
        ...complexStyle.painterlyPostParameters,
        enabled: true,
        debugMode: painterlyPostDebugModes.Original,
        renderScale: 1,
        largeNoiseScale: 0.1,
        largeNoiseStrength: 8,
        fineNoiseScale: 400,
        fineNoiseStrength: 0,
        noiseSeed: 100,
        radius: 8,
        anisotropy: 2,
        eccentricity: 4,
        filterStrength: 1,
        sensorNoiseEnabled: false,
        luminanceNoise: 0.2,
        chromaNoise: 0.1,
        sensorNoiseScale: 8,
        bloomEnabled: false,
        bloomIntensity: 2,
        bloomThreshold: 1,
        bloomSmoothing: 1,
        bloomRadius: 0.5,
        sharpenEnabled: true,
        sharpenStrength: 1,
    },
}

const painteryStyle = {
    ...complexStyle,
    label: 'Paintery',
    terrainParameters: {
        ...complexStyle.terrainParameters,
        backgroundColor: '#0d0764',
        baseBrightness: 1.8,
    },

    grassParameters: {
        ...complexStyle.grassParameters,
        enabled: true,
        baseBrightness: 1.46,
    },
    lanternGroundLightParameters: {
        ...complexStyle.lanternGroundLightParameters,
        radius: 3.0,
        edgeSoftness: 1.99,
        edgeNoiseScale: 0.39,
        edgeNoiseStrength: 0,
        innerBrightness: 1.2,
        outerDarkness: 0,
    },
    painterlyPostParameters: {
        ...complexStyle.painterlyPostParameters,
        enabled: true,
        debugMode: painterlyPostDebugModes.Kuwahara,
        renderScale: 1,
        largeNoiseScale: 0.1,
        largeNoiseStrength: 0,
        fineNoiseScale: 1,
        fineNoiseStrength: 0,
        noiseSeed: 0,
        radius: 8,
        anisotropy: 0.0,
        eccentricity: 0.0,
        filterStrength: 0.0,
        sensorNoiseEnabled: true,
        luminanceNoise: 0.01,
        chromaNoise: 0.0,
        sensorNoiseScale: 1,
        bloomEnabled: true,
        bloomIntensity: 1.41,
        bloomThreshold: 0.0,
        bloomSmoothing: 0.68,
        bloomRadius: 0.0,
        sharpenEnabled: true,
        sharpenStrength: 0.35,
    },
}

export const sceneStylePresets = Object.freeze({
    complex: complexStyle,
    flatColors: flatColorsStyle,
    magicGlow: magicGlowStyle,
    paintery: painteryStyle,
})

export const defaultSceneStyleId = 'complex'
export const defaultSceneStyle = sceneStylePresets[defaultSceneStyleId]

export function cloneSceneStyleSection(section) {
    if (!section) return section
    if (!section.materials) return { ...section }

    return {
        ...section,
        materials: cloneMaterials(section.materials),
    }
}
