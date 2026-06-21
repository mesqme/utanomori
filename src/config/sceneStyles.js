import { mainCharacterMaterialPresets } from './mainCharacterMaterials.js'
import { objectFieldDefaults } from './objectFieldDefaults.js'
import { painterlyPostDefaults } from './painterlyPostDefaults.js'
import { characterStylizedDefaults } from './stylizedMaterialDefaults.js'

function cloneMaterials(materials) {
    return Object.fromEntries(Object.entries(materials).map(([id, colors]) => [id, { ...colors }]))
}

const complexStyle = {
    label: 'Complex',
    terrainParameters: {
        color: '#454496',
        backgroundColor: '#403496',
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

        // Grass-trail reaction — four independent layers. Each can read the fading
        // trail texture ('Trail') or a plain radius around the characters ('Radius'),
        // with its own falloff (start..end of the normalised influence + a rate curve).
        trampleEnabled: true,
        trailStrength: 0.7,

        dissolveEnabled: true,
        dissolveSource: 'Radius',
        dissolveRadius: 4.7,
        dissolveStart: 0.0,
        dissolveEnd: 0.88,
        dissolveRate: 2.15,
        dissolveAmount: 1.08,
        dissolveMode: 'Alpha',

        lightenEnabled: true,
        lightenSource: 'Trail',
        lightenRadius: 2.25,
        lightenStart: 0.02,
        lightenEnd: 0.47,
        lightenRate: 0.35,
        lightenAmount: 0.23,
        lightenColor: '#ff0518',

        scaleEnabled: true,
        scaleSource: 'Trail',
        scaleRadius: 2.75,
        scaleStart: 0.27,
        scaleEnd: 1.0,
        scaleRate: 0.8,
        scaleAmount: 0.59,

        leanEnabled: true,
        leanSource: 'Radius',
        leanRadius: 2.0,
        leanStart: 0.0,
        leanEnd: 0.67,
        leanRate: 0.8,
        leanAmount: 0.52,
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
        painterlyScale: 0.13,
        painterlyContrast: 0.35,
        painterlyBrightness: 0.52,
        painterlyColorStrength: 0.46,
        fadeOffset: 5.8,
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
        painterySize: 167,
        painteryScreenBlend: 0.85,
        painteryDrift: 0.12,
        painteryLayer2Scale: 2.2,
        painteryBleed: 0.35,
    },
    ditheringParameters: {
        ditherMode: 'Bayer',
        pixelSize: 1,
    },
    backgroundParameters: {
        // Layer 1 — base colour: vertical gradient from the horizon up to the scene colour
        colorHorizon: '#0095ff', // lower / horizon colour (top colour = scene backgroundColor)
        gradientHeight: -0.9, // sky direction.y where the horizon colour sits
        gradientPower: 1.45, // gradient curve (higher = colour stays near the horizon longer)
        // Layer 2 — paintery texture (watercolorBasic) for colour variation
        textureEnabled: true,
        colorMode: 'Both', // Intensity | Color Mix | Both
        textureSize: 2000,
        textureLayer2: 0.95,
        textureContrast: 1.0, // contrast applied to the texture itself before it is used
        colorIntensity: 1.43, // brightness variation from the texture
        colorMixColor: '#01194c', // secondary colour blended in by the texture
        colorMixIntensity: 1.1, // how strongly the secondary colour mixes in
        // Layer 3 — stars
        starsEnabled: true,
        starStyle: 'Stylized', // Stylized | Natural
        starCellSize: 92,
        starDensity: 0.05,
        starSize: 0.08,
        starBrightness: 4.0,
        starTwinkleSpeed: 2.0,
        starRays: 2.0,
        starColor: '#ffffff',
        starsFadeStart: -0.9, // sky direction.y where stars begin to appear
        starsFadeWidth: 0.57, // span over which density ramps from ~0 to full
        // Constellations (lines joining some stars to up to two present neighbours)
        constellationsEnabled: false,
        constellationDensity: 0.36, // share of stars that become constellation nodes
        constellationBrightness: 2.02,
        constellationWidth: 0.1,
        // Optional slow rotation of the whole sky around Y
        rotationEnabled: true,
        rotationSpeed: -0.003,
    },
    painterlyPostParameters: {
        ...painterlyPostDefaults,
    },
    // Stylized silhouette edge on the props (bushes / stones / mushrooms).
    // Painterly silhouette edge — applied only to the tree leaves (canopy).
    edgeParameters: {
        enabled: true,
        mode: 'Dither', // Dither (opaque, stippled) | Alpha (transparent blend)
        color: '#9b62d0',
        tint: 1.0,
        width: 40.0,
        bias: 0.42,
        softness: 0.18,
        noiseScale: 0.5,
        sharpness: 2.9, // higher = the edge pulls back to a thin line at the silhouette
    },
    // Fresnel colour rim — applied to the hard-surface props (trunks / stones / mushrooms).
    propRimParameters: {
        enabled: true,
        color: '#84afff',
        strength: 3.0,
        power: 4.4, // higher = the rim tightens to the silhouette
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

const complexPainteryStyle = {
    ...complexStyle,
    label: 'Complex Paintery',
    terrainParameters: {
        ...complexStyle.terrainParameters,
        backgroundColor: '#403496',
    },
    borderParameters: {
        ...complexStyle.borderParameters,
        fadeMode: 'Paintery',
        noiseStrength: 0.57,
        noiseScale: 0.3,
        circleRadiusFactor: 1.0,
        groundFadeOffset: 3.0,
        grassFadeOffset: 3.66,
        groundOffset: -3.0,
        painterySize: 500,
        painteryScreenBlend: 0.7,
        painteryDrift: 0.0,
        painteryLayer2Scale: 0.45,
        painteryBleed: 0.22,
    },
    backgroundParameters: {
        ...complexStyle.backgroundParameters,
        colorHorizon: '#0095ff',
        gradientHeight: -0.9,
        gradientPower: 1.45,
        textureEnabled: true,
        colorMode: 'Both',
        textureSize: 2000,
        textureLayer2: 0.95,
        textureContrast: 1.0,
        colorIntensity: 1.43,
        colorMixColor: '#01194c',
        colorMixIntensity: 1.1,
        starsEnabled: true,
        starStyle: 'Stylized',
        starCellSize: 92,
        starDensity: 0.05,
        starSize: 0.08,
        starBrightness: 4.0,
        starTwinkleSpeed: 2.0,
        starRays: 2.0,
        starColor: '#ffffff',
        starsFadeStart: -0.9,
        starsFadeWidth: 0.57,
        constellationsEnabled: false,
        constellationDensity: 0.36,
        constellationBrightness: 2.02,
        constellationWidth: 0.1,
        rotationEnabled: true,
        rotationSpeed: -0.003,
    },
    gameUiParameters: {
        bubbleShape: 'Rect',
        buttonShape: 'Rect',
        roughness: 8.5,
        detail: 29,
        cornerRadius: 55,
        bubbleWidth: 760,
        textSize: 24,
        padding: 43,
        buttonWidth: 180,
        buttonHeight: 58,
        textureStrength: 1,
        textureScale: 600,
        fillColor: '#fef4ef',
        textColor: '#26285a',
    },
    seeThroughParameters: {
        enabled: true,
        worldRadius: 3.8,
        inner: 0.0,
        depthBias: 0.0,
        opacityIntensity: 0.7,
        textureContrast: 1.0,
        textureScale: 250,
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
        noiseSeed: 100,
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
        color: '#747dff',
        backgroundColor: '#3d1f95',
        baseBrightness: 0.66,
        segments: 19,
        scale: 0.08,
        amplitude: 0,
        groundTextureScale: 0.05,
        groundTextureContrast: 0.45,
        chunkSize: 9,
    },

    grassParameters: {
        ...complexStyle.grassParameters,
        enabled: true,
        baseColor: '#6aa1a1',
        baseBrightness: 2.0,

        lightenEnabled: true,
        lightenSource: 'Trail',
        lightenRadius: 2.25,
        lightenStart: 0.02,
        lightenEnd: 0.47,
        lightenRate: 0.6,
        lightenAmount: 0.3,
        lightenColor: '#ff00e6',
    },
    borderParameters: {
        ...complexStyle.borderParameters,
        fadeMode: 'Paintery',
        noiseStrength: 0.57,
        noiseScale: 0.3,
        circleRadiusFactor: 1.0,
        groundFadeOffset: 3.0,
        grassFadeOffset: 3.66,
        groundOffset: -3.0,
        painterySize: 1120,
        painteryScreenBlend: 1.0,
        painteryDrift: 0.16,
        painteryLayer2Scale: 0.8,
        painteryBleed: 0.0,
    },
    backgroundParameters: {
        ...complexStyle.backgroundParameters,
        colorHorizon: '#0093ff',
        gradientHeight: -0.9,
        gradientPower: 3.1,
        textureEnabled: true,
        colorMode: 'Both',
        textureSize: 1322,
        textureLayer2: 1.1,
        textureContrast: 1.0,
        colorIntensity: 4.0,
        colorMixColor: '#070258',
        colorMixIntensity: 1.04,
        starsEnabled: true,
        starStyle: 'Stylized',
        starCellSize: 92,
        starDensity: 0.05,
        starSize: 0.08,
        starBrightness: 4.0,
        starTwinkleSpeed: 2.0,
        starRays: 2.0,
        starColor: '#ffffff',
        starsFadeStart: -0.9,
        starsFadeWidth: 0.57,
        constellationsEnabled: false,
        constellationDensity: 0.36,
        constellationBrightness: 2.02,
        constellationWidth: 0.1,
        rotationEnabled: true,
        rotationSpeed: -0.003,
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
        noiseSeed: 0,
        sensorNoiseEnabled: true,
        luminanceNoise: 0.02,
        chromaNoise: 0.02,
        sensorNoiseScale: 1,
        bloomEnabled: false,
        bloomIntensity: 0.0,
        bloomThreshold: 0.34,
        bloomSmoothing: 0.36,
        bloomRadius: 0.5,
        sharpenEnabled: false,
        sharpenStrength: 0.28,
    },
    gameUiParameters: {
        bubbleShape: 'Rect',
        buttonShape: 'Rect',
        roughness: 8.5,
        detail: 29,
        cornerRadius: 55,
        bubbleWidth: 760,
        textSize: 24,
        padding: 43,
        buttonWidth: 180,
        buttonHeight: 58,
        textureStrength: 1,
        textureScale: 600,
        fillColor: '#fef4ef',
        textColor: '#26285a',
    },
    seeThroughParameters: {
        enabled: true,
        worldRadius: 1.8,
        inner: 0.53,
        depthBias: 0.0,
        opacityIntensity: 0.7,
        textureContrast: 1.0,
        textureScale: 250,
    },
}

export const sceneStylePresets = Object.freeze({
    complex: complexStyle,
    complexPaintery: complexPainteryStyle,
    flatColors: flatColorsStyle,
    magicGlow: magicGlowStyle,
    paintery: painteryStyle,
})

export const defaultSceneStyleId = 'paintery'
export const defaultSceneStyle = sceneStylePresets[defaultSceneStyleId]

export function cloneSceneStyleSection(section) {
    if (!section) return section
    if (!section.materials) return { ...section }

    return {
        ...section,
        materials: cloneMaterials(section.materials),
    }
}
