import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { levaStore, useControls } from 'leva'
import useStore from '../stores/useStore.jsx'
import usePhases from '../stores/usePhases.jsx'
import { seeThrough, applySeeThroughParameters } from './utils/seeThrough.js'
import { updateEdgeUniforms } from '../materials/edgeUniforms.js'
import { mainCharacterMaterialGroups } from '../config/mainCharacterMaterials.js'
import { cloneSceneStyleSection, sceneStylePresets } from '../config/sceneStyles.js'
import { painterlyTextureOptions, stylizedDebugModes } from '../config/stylizedMaterialDefaults.js'

const SCENE_STYLE_SECTIONS = new Set([
    'terrainParameters',
    'grassParameters',
    'grassPatchParameters',
    'roadParameters',
    'objectParameters',
    'backgroundParameters',
    'windParameters',
    'lanternGroundLightParameters',
    'borderParameters',
    'ditheringParameters',
    'painterlyPostParameters',
    'characterParameters',
    'characterMaterialParameters',
    'edgeParameters',
    'gameUiParameters',
])

const sceneStyleOptions = Object.freeze({
    ...Object.fromEntries(Object.entries(sceneStylePresets).map(([id, preset]) => [preset.label, id])),
    Custom: 'custom',
})

const LEVA_SECTION_PATHS = Object.freeze({
    Terrain: {
        groundTexture: 'groundTextureEnabled',
        color: 'color',
        backgroundColor: 'backgroundColor',
        baseBrightness: 'baseBrightness',
        segments: 'segments',
        scale: 'scale',
        amplitude: 'amplitude',
        groundTextureScale: 'groundTextureScale',
        groundTextureContrast: 'groundTextureContrast',
        chunkSize: 'chunkSize',
    },
    Grass: {
        enabled: 'enabled',
        count: 'count',
        segments: 'segmentsCount',
        width: 'width',
        height: 'height',
        baseColor: 'colorBase',
        baseBrightness: 'baseBrightness',
        lean: 'leanFactor',
    },
    Wind: {
        direction: 'direction',
        scale: 'scale',
        strength: 'strength',
        speed: 'speed',
    },
    'Grass Patches': {
        worldSeed: 'worldSeed',
        spacing: 'spacing',
        jitter: 'jitter',
        warpScale: 'domainWarpScale',
        warpStrength: 'domainWarpStrength',
        patchHeightVariation: 'patchHeightVariation',
        patchWidthVariation: 'patchWidthVariation',
        patchColorVariation: 'patchColorVariation',
        internalNoiseScale: 'internalNoiseScale',
        internalHeightVariation: 'internalHeightVariation',
        internalWidthVariation: 'internalWidthVariation',
        internalColorVariation: 'internalColorVariation',
        internalLeanVariation: 'internalLeanVariation',
        radialLean: 'radialLeanStrength',
        cameraFacing: 'cameraFacingStrength',
        orientationVariation: 'orientationVariation',
        borderWidth: 'borderWidth',
        borderMinScale: 'borderMinScale',
        tintCyan: 'tintColorCyan',
        tintViolet: 'tintColorViolet',
        tintYellow: 'tintColorYellow',
        tintGreen: 'tintColorGreen',
    },
    Roads: {
        enabled: 'enabled',
        worldSeed: 'worldSeed',
        laneSpacing: 'laneSpacing',
        nodeSpacing: 'nodeSpacing',
        meander: 'meanderStrength',
        width: 'width',
        softness: 'softness',
        grassMinScale: 'grassMinScale',
        groundBrightness: 'groundBrightness',
        groundNoiseScale: 'groundNoiseScale',
        groundNoiseStrength: 'groundNoiseStrength',
        groundEdgeSharpness: 'groundEdgeSharpness',
    },
    Objects: {
        enabled: 'enabled',
        worldSeed: 'worldSeed',
        cellSize: 'cellSize',
        groupJitter: 'groupJitter',
        density: 'density',
        roadClearance: 'roadClearance',
        groupScale: 'groupScale',
        minObjectSpacing: 'minObjectSpacing',
        painterly: 'painterlyEnabled',
        painterlyScale: 'painterlyScale',
        painterlyContrast: 'painterlyContrast',
        painterlyBrightness: 'painterlyBrightness',
        painterlyTint: 'painterlyColorStrength',
        fadeOffset: 'fadeOffset',
    },
    'Grass Trail': {
        enabled: 'trampleEnabled',
        trailStrength: 'trailStrength',
    },
    'GT Dissolve': {
        enabled: 'dissolveEnabled',
        source: 'dissolveSource',
        radius: 'dissolveRadius',
        start: 'dissolveStart',
        end: 'dissolveEnd',
        rate: 'dissolveRate',
        amount: 'dissolveAmount',
        mode: 'dissolveMode',
    },
    'GT Lighten': {
        enabled: 'lightenEnabled',
        source: 'lightenSource',
        radius: 'lightenRadius',
        start: 'lightenStart',
        end: 'lightenEnd',
        rate: 'lightenRate',
        amount: 'lightenAmount',
        color: 'lightenColor',
    },
    'GT Scale': {
        enabled: 'scaleEnabled',
        source: 'scaleSource',
        radius: 'scaleRadius',
        start: 'scaleStart',
        end: 'scaleEnd',
        rate: 'scaleRate',
        amount: 'scaleAmount',
    },
    'GT Lean': {
        enabled: 'leanEnabled',
        source: 'leanSource',
        radius: 'leanRadius',
        start: 'leanStart',
        end: 'leanEnd',
        rate: 'leanRate',
        amount: 'leanAmount',
    },
    'Lantern Ground Light': {
        radius: 'radius',
        edgeSoftness: 'edgeSoftness',
        edgeNoiseScale: 'edgeNoiseScale',
        edgeNoiseStrength: 'edgeNoiseStrength',
        innerBrightness: 'innerBrightness',
        outerDarkness: 'outerDarkness',
    },
    Border: {
        fadeMode: 'fadeMode',
        nStrength: 'noiseStrength',
        nScale: 'noiseScale',
        radius: 'circleRadiusFactor',
        edgeFade: 'groundFadeOffset',
        grassFade: 'grassFadeOffset',
        groundOffset: 'groundOffset',
        pSize: 'painterySize',
        pScreenBlend: 'painteryScreenBlend',
        pDrift: 'painteryDrift',
        pLayer2: 'painteryLayer2Scale',
        pBleed: 'painteryBleed',
    },
    'Dithering Params': {
        ditherMode: 'ditherMode',
        pixelSize: 'pixelSize',
    },
    Background: {
        mode: 'mode',
        textureSize: 'textureSize',
        textureContrast: 'textureContrast',
        textureLayer2: 'textureLayer2',
        starCellSize: 'starCellSize',
        starDensity: 'starDensity',
        starSize: 'starSize',
        starBrightness: 'starBrightness',
        starTwinkle: 'starTwinkleSpeed',
        starRays: 'starRays',
        starColor: 'starColor',
    },
    'Painterly Postprocess': {
        enabled: 'enabled',
        noiseSeed: 'noiseSeed',
        sensorNoise: 'sensorNoiseEnabled',
        lumaNoise: 'luminanceNoise',
        chromaNoise: 'chromaNoise',
        sensorScale: 'sensorNoiseScale',
        bloom: 'bloomEnabled',
        bloomIntensity: 'bloomIntensity',
        bloomThreshold: 'bloomThreshold',
        bloomSmooth: 'bloomSmoothing',
        bloomRadius: 'bloomRadius',
        sharpen: 'sharpenEnabled',
        sharpenStrength: 'sharpenStrength',
    },
    Edge: {
        enabled: 'enabled',
        mode: 'mode',
        color: 'color',
        tint: 'tint',
        width: 'width',
        bias: 'bias',
        softness: 'softness',
        noiseScale: 'noiseScale',
    },
    Character: {
        modelScale: 'modelScale',
        modelYOffset: 'modelYOffset',
        rotationOffset: 'rotationOffset',
        idleTimeScale: 'idleTimeScale',
        runTimeScale: 'runTimeScale',
        runBlendInSpeed: 'runBlendInSpeed',
        runBlendOutSpeed: 'runBlendOutSpeed',
    },
    'Character Stylized': {
        debug: 'debugMode',
        painterly: 'painterlyEnabled',
        pTexture: 'painterlyTexture',
        pScale: 'painterlyScale',
        pContrast: 'painterlyContrast',
        pColor: 'painterlyColor',
        pTint: 'painterlyColorStrength',
        pBrightness: 'painterlyBrightnessVariation',
    },
    'Camera Debug': {
        debugOrbit: 'debugOrbit',
        debugOrbitAngle: 'debugOrbitAngle',
        debugOrbitDistance: 'debugOrbitDistance',
        debugOrbitHeight: 'debugOrbitHeight',
        debugTargetYOffset: 'debugTargetYOffset',
    },
    'Game UI': {
        bubbleShape: 'bubbleShape',
        buttonShape: 'buttonShape',
        roughness: 'roughness',
        detail: 'detail',
        cornerRadius: 'cornerRadius',
        bubbleWidth: 'bubbleWidth',
        textSize: 'textSize',
        padding: 'padding',
        buttonWidth: 'buttonWidth',
        buttonHeight: 'buttonHeight',
        textureStrength: 'textureStrength',
        textureScale: 'textureScale',
        fillColor: 'fillColor',
        textColor: 'textColor',
    },
})

function addLevaSectionValues(values, folder, section, paths) {
    Object.entries(paths).forEach(([control, parameter]) => {
        values[`${folder}.${control}`] = section[parameter]
    })
}

function addSeeThroughValues(values) {
    values['See-Through.enabled'] = seeThrough.enabled
    values['See-Through.worldRadius'] = seeThrough.worldRadius
    values['See-Through.inner'] = seeThrough.inner
    values['See-Through.depthBias'] = seeThrough.depthBias
    values['See-Through.opacityIntensity'] = seeThrough.opacityIntensity
    values['See-Through.textureContrast'] = seeThrough.textureContrast
    values['See-Through.textureScale'] = seeThrough.textureScale
}

export default function Controls() {
    const syncingLeva = useRef(false)
    const sceneStylePreset = useStore((state) => state.sceneStylePreset)
    const terrainParameters = useStore((state) => state.terrainParameters)
    const grassParameters = useStore((state) => state.grassParameters)
    const grassPatchParameters = useStore((state) => state.grassPatchParameters)
    const roadParameters = useStore((state) => state.roadParameters)
    const objectParameters = useStore((state) => state.objectParameters)
    const backgroundParameters = useStore((state) => state.backgroundParameters)
    const windParameters = useStore((state) => state.windParameters)
    const lanternGroundLightParameters = useStore((state) => state.lanternGroundLightParameters)
    const borderParameters = useStore((state) => state.borderParameters)
    const ditheringParameters = useStore((state) => state.ditheringParameters)
    const painterlyPostParameters = useStore((state) => state.painterlyPostParameters)
    const characterParameters = useStore((state) => state.characterParameters)
    const characterMaterialParameters = useStore((state) => state.characterMaterialParameters)
    const cameraParameters = useStore((state) => state.cameraParameters)
    const gameUiParameters = useStore((state) => state.gameUiParameters)
    const painteryTextureParameters = useStore((state) => state.painteryTextureParameters)
    const edgeParameters = useStore((state) => state.edgeParameters)
    const setDpr = useThree((state) => state.setDpr)
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    const setParam = (section, param) => (value, _, context) => {
        if (syncingLeva.current || context?.initial) return

        useStore.setState((state) => ({
            sceneStylePreset: SCENE_STYLE_SECTIONS.has(section) ? 'custom' : state.sceneStylePreset,
            [section]: {
                ...state[section],
                [param]: value,
            },
        }))
    }

    const setSceneStylePreset = (presetId) => {
        if (syncingLeva.current) return

        const preset = sceneStylePresets[presetId]

        if (!preset) {
            useStore.setState({ sceneStylePreset: presetId })
            return
        }

        if (preset.seeThroughParameters) {
            Object.assign(seeThrough, preset.seeThroughParameters)
        }

        useStore.setState({
            sceneStylePreset: presetId,
            ...(preset.generalParameters ?? {}),
            terrainParameters: { ...preset.terrainParameters },
            grassParameters: { ...preset.grassParameters },
            grassPatchParameters: { ...preset.grassPatchParameters },
            roadParameters: { ...preset.roadParameters },
            objectParameters: { ...preset.objectParameters },
            windParameters: { ...preset.windParameters },
            lanternGroundLightParameters: { ...preset.lanternGroundLightParameters },
            borderParameters: { ...preset.borderParameters },
            ditheringParameters: { ...preset.ditheringParameters },
            backgroundParameters: { ...preset.backgroundParameters },
            painterlyPostParameters: { ...preset.painterlyPostParameters },
            characterParameters: { ...preset.characterParameters },
            characterMaterialParameters: cloneSceneStyleSection(preset.characterMaterialParameters),
            ...(preset.gameUiParameters ? { gameUiParameters: { ...preset.gameUiParameters } } : {}),
            ...(preset.edgeParameters ? { edgeParameters: { ...preset.edgeParameters } } : {}),
        })

        if (preset.seeThroughParameters) {
            const values = {}
            addSeeThroughValues(values)
            syncingLeva.current = true
            try {
                levaStore.set(values, false)
            } finally {
                syncingLeva.current = false
            }
        }
    }

    const setCharacterMaterialParam = (slotId, param) => (value, _, context) => {
        if (syncingLeva.current || context?.initial) return

        useStore.setState((state) => ({
            sceneStylePreset: 'custom',
            characterMaterialParameters: {
                ...state.characterMaterialParameters,
                materials: {
                    ...state.characterMaterialParameters.materials,
                    [slotId]: {
                        ...state.characterMaterialParameters.materials[slotId],
                        [param]: value,
                    },
                },
            },
        }))
    }

    useEffect(() => {
        const values = {
            'General.style': sceneStylePreset,
            'General.perfMonitor': perfVisible,
            'General.bgWireframe': backgroundWireframe,
        }

        addLevaSectionValues(values, 'Terrain', terrainParameters, LEVA_SECTION_PATHS.Terrain)
        addLevaSectionValues(values, 'Grass', grassParameters, LEVA_SECTION_PATHS.Grass)
        addLevaSectionValues(values, 'Wind', windParameters, LEVA_SECTION_PATHS.Wind)
        addLevaSectionValues(values, 'Grass Patches', grassPatchParameters, LEVA_SECTION_PATHS['Grass Patches'])
        addLevaSectionValues(values, 'Roads', roadParameters, LEVA_SECTION_PATHS.Roads)
        addLevaSectionValues(values, 'Objects', objectParameters, LEVA_SECTION_PATHS.Objects)
        addLevaSectionValues(values, 'Grass Trail', grassParameters, LEVA_SECTION_PATHS['Grass Trail'])
        addLevaSectionValues(values, 'GT Dissolve', grassParameters, LEVA_SECTION_PATHS['GT Dissolve'])
        addLevaSectionValues(values, 'GT Lighten', grassParameters, LEVA_SECTION_PATHS['GT Lighten'])
        addLevaSectionValues(values, 'GT Scale', grassParameters, LEVA_SECTION_PATHS['GT Scale'])
        addLevaSectionValues(values, 'GT Lean', grassParameters, LEVA_SECTION_PATHS['GT Lean'])
        addLevaSectionValues(values, 'Lantern Ground Light', lanternGroundLightParameters, LEVA_SECTION_PATHS['Lantern Ground Light'])
        addLevaSectionValues(values, 'Border', borderParameters, LEVA_SECTION_PATHS.Border)
        addLevaSectionValues(values, 'Dithering Params', ditheringParameters, LEVA_SECTION_PATHS['Dithering Params'])
        addLevaSectionValues(values, 'Background', backgroundParameters, LEVA_SECTION_PATHS.Background)
        addLevaSectionValues(values, 'Painterly Postprocess', painterlyPostParameters, LEVA_SECTION_PATHS['Painterly Postprocess'])
        addLevaSectionValues(values, 'Edge', edgeParameters, LEVA_SECTION_PATHS.Edge)
        addLevaSectionValues(values, 'Character', characterParameters, LEVA_SECTION_PATHS.Character)
        addLevaSectionValues(values, 'Character Stylized', characterMaterialParameters, LEVA_SECTION_PATHS['Character Stylized'])

        mainCharacterMaterialGroups.forEach((group) => {
            values[`Character Stylized.${group.label} Base`] =
                characterMaterialParameters.materials[group.id]?.baseColor ?? group.baseColor
        })

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [sceneStylePreset])

    useEffect(() => {
        const values = {}
        addLevaSectionValues(values, 'Camera Debug', cameraParameters, LEVA_SECTION_PATHS['Camera Debug'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [cameraParameters])

    useEffect(() => {
        const values = {}
        addLevaSectionValues(values, 'Game UI', gameUiParameters, LEVA_SECTION_PATHS['Game UI'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [gameUiParameters])

    useEffect(() => {
        updateEdgeUniforms(edgeParameters)
    }, [edgeParameters])

    // Apply the active style's see-through config to the live module + Leva display
    // (on mount and whenever the preset changes).
    useEffect(() => {
        const preset = sceneStylePresets[sceneStylePreset]
        const params = preset?.seeThroughParameters
        if (!params) return
        applySeeThroughParameters(params)
        const values = {}
        addSeeThroughValues(values)
        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [sceneStylePreset])

    useControls('General', {
        style: {
            value: sceneStylePreset,
            options: sceneStyleOptions,
            onChange: (value, _, context) => {
                if (!context?.initial) setSceneStylePreset(value)
            },
        },
        perfMonitor: {
            value: perfVisible,
            onChange: (value, _, context) => {
                if (!context?.initial && !syncingLeva.current) useStore.getState().setPerfVisible(value)
            },
        },
        bgWireframe: {
            value: backgroundWireframe,
            onChange: (value, _, context) => {
                if (!context?.initial && !syncingLeva.current) useStore.getState().setBackgroundWireframe(value)
            },
        },
        debugMode: {
            value: usePhases.getState().debugMode,
            onChange: (value, _, context) => {
                if (!context?.initial) usePhases.getState().setDebugMode(value)
            },
        },
        dpr: {
            value: 1.25,
            min: 0.5,
            max: 2,
            step: 0.05,
            onChange: (value, _, context) => {
                if (!context?.initial) setDpr(value)
            },
        },
    })

    useControls('Game UI', {
        bubbleShape: {
            value: gameUiParameters.bubbleShape,
            options: ['Rect', 'Ellipse', 'Circle'],
            onChange: setParam('gameUiParameters', 'bubbleShape'),
        },
        buttonShape: {
            value: gameUiParameters.buttonShape,
            options: ['Rect', 'Ellipse', 'Circle'],
            onChange: setParam('gameUiParameters', 'buttonShape'),
        },
        roughness: { value: gameUiParameters.roughness, min: 0, max: 24, step: 0.5, onChange: setParam('gameUiParameters', 'roughness') },
        detail: { value: gameUiParameters.detail, min: 2, max: 60, step: 1, onChange: setParam('gameUiParameters', 'detail') },
        cornerRadius: { value: gameUiParameters.cornerRadius, min: 0, max: 80, step: 1, onChange: setParam('gameUiParameters', 'cornerRadius') },
        bubbleWidth: { value: gameUiParameters.bubbleWidth, min: 260, max: 760, step: 10, onChange: setParam('gameUiParameters', 'bubbleWidth') },
        textSize: { value: gameUiParameters.textSize, min: 12, max: 34, step: 1, onChange: setParam('gameUiParameters', 'textSize') },
        padding: { value: gameUiParameters.padding, min: 12, max: 60, step: 1, onChange: setParam('gameUiParameters', 'padding') },
        buttonWidth: { value: gameUiParameters.buttonWidth, min: 80, max: 360, step: 5, onChange: setParam('gameUiParameters', 'buttonWidth') },
        buttonHeight: { value: gameUiParameters.buttonHeight, min: 36, max: 120, step: 2, onChange: setParam('gameUiParameters', 'buttonHeight') },
        textureStrength: { value: gameUiParameters.textureStrength, min: 0, max: 1, step: 0.01, onChange: setParam('gameUiParameters', 'textureStrength') },
        textureScale: { value: gameUiParameters.textureScale, min: 20, max: 600, step: 5, onChange: setParam('gameUiParameters', 'textureScale') },
        fillColor: { value: gameUiParameters.fillColor, onChange: setParam('gameUiParameters', 'fillColor') },
        textColor: { value: gameUiParameters.textColor, onChange: setParam('gameUiParameters', 'textColor') },
    })

    useControls('See-Through', {
        enabled: {
            value: seeThrough.enabled,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.enabled = value
            },
        },
        worldRadius: {
            value: seeThrough.worldRadius,
            min: 0.4,
            max: 5,
            step: 0.1,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.worldRadius = value
            },
        },
        inner: {
            value: seeThrough.inner,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.inner = value
            },
        },
        depthBias: {
            value: seeThrough.depthBias,
            min: 0,
            max: 4,
            step: 0.1,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.depthBias = value
            },
        },
        opacityIntensity: {
            value: seeThrough.opacityIntensity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.opacityIntensity = value
            },
        },
        textureContrast: {
            value: seeThrough.textureContrast,
            min: 0.2,
            max: 6,
            step: 0.05,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.textureContrast = value
            },
        },
        textureScale: {
            value: seeThrough.textureScale,
            min: 20,
            max: 1200,
            step: 5,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.textureScale = value
            },
        },
    })

    useControls('Edge', {
        enabled: { value: edgeParameters.enabled, onChange: setParam('edgeParameters', 'enabled') },
        mode: { value: edgeParameters.mode, options: ['Dither', 'Alpha'], onChange: setParam('edgeParameters', 'mode') },
        color: { value: edgeParameters.color, onChange: setParam('edgeParameters', 'color') },
        tint: { value: edgeParameters.tint, min: 0, max: 1, step: 0.01, onChange: setParam('edgeParameters', 'tint') },
        width: { value: edgeParameters.width, min: 0, max: 40, step: 0.5, onChange: setParam('edgeParameters', 'width') },
        bias: { value: edgeParameters.bias, min: 0, max: 2, step: 0.01, onChange: setParam('edgeParameters', 'bias') },
        softness: { value: edgeParameters.softness, min: 0, max: 1, step: 0.01, onChange: setParam('edgeParameters', 'softness') },
        noiseScale: { value: edgeParameters.noiseScale, min: 0.02, max: 4, step: 0.02, onChange: setParam('edgeParameters', 'noiseScale') },
    })

    useControls('Terrain', {
        groundTexture: {
            value: terrainParameters.groundTextureEnabled,
            onChange: setParam('terrainParameters', 'groundTextureEnabled'),
        },
        color: {
            value: terrainParameters.color,
            onChange: setParam('terrainParameters', 'color'),
        },
        backgroundColor: {
            value: terrainParameters.backgroundColor,
            onChange: setParam('terrainParameters', 'backgroundColor'),
        },
        baseBrightness: {
            value: terrainParameters.baseBrightness,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('terrainParameters', 'baseBrightness'),
        },
        segments: {
            value: terrainParameters.segments,
            min: 1,
            max: 100,
            step: 1,
            onChange: setParam('terrainParameters', 'segments'),
        },
        scale: {
            value: terrainParameters.scale,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('terrainParameters', 'scale'),
        },
        amplitude: {
            value: terrainParameters.amplitude,
            min: 0,
            max: 10,
            step: 0.1,
            onChange: setParam('terrainParameters', 'amplitude'),
        },
        groundTextureScale: {
            value: terrainParameters.groundTextureScale,
            min: 0.01,
            max: 2.0,
            step: 0.01,
            onChange: setParam('terrainParameters', 'groundTextureScale'),
        },
        groundTextureContrast: {
            value: terrainParameters.groundTextureContrast,
            min: 0,
            max: 1.0,
            step: 0.01,
            onChange: setParam('terrainParameters', 'groundTextureContrast'),
        },
        chunkSize: {
            value: terrainParameters.chunkSize,
            min: 2,
            max: 50,
            step: 1,
            onChange: setParam('terrainParameters', 'chunkSize'),
        },
    })

    useControls('Grass', {
        enabled: {
            value: grassParameters.enabled,
            onChange: setParam('grassParameters', 'enabled'),
        },
        count: {
            value: grassParameters.count,
            min: 0,
            max: 10000,
            step: 100,
            onChange: setParam('grassParameters', 'count'),
        },
        segments: {
            value: grassParameters.segmentsCount,
            min: 1,
            max: 8,
            step: 1,
            onChange: setParam('grassParameters', 'segmentsCount'),
        },
        width: {
            value: grassParameters.width,
            min: 0.01,
            max: 0.5,
            step: 0.01,
            onChange: setParam('grassParameters', 'width'),
        },
        height: {
            value: grassParameters.height,
            min: 0.05,
            max: 3,
            step: 0.01,
            onChange: setParam('grassParameters', 'height'),
        },
        baseColor: {
            value: grassParameters.colorBase,
            onChange: setParam('grassParameters', 'colorBase'),
        },
        baseBrightness: {
            value: grassParameters.baseBrightness,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('grassParameters', 'baseBrightness'),
        },
        lean: {
            value: grassParameters.leanFactor,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('grassParameters', 'leanFactor'),
        },
    })

    useControls('Wind', {
        direction: {
            value: windParameters.direction,
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            onChange: setParam('windParameters', 'direction'),
        },
        scale: {
            value: windParameters.scale,
            min: 0,
            max: 3,
            step: 0.01,
            onChange: setParam('windParameters', 'scale'),
        },
        strength: {
            value: windParameters.strength,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('windParameters', 'strength'),
        },
        speed: {
            value: windParameters.speed,
            min: 0,
            max: 5,
            step: 0.01,
            onChange: setParam('windParameters', 'speed'),
        },
    })

    useControls('Grass Patches', {
        worldSeed: {
            value: grassPatchParameters.worldSeed,
            step: 1,
            onChange: setParam('grassPatchParameters', 'worldSeed'),
        },
        spacing: {
            value: grassPatchParameters.spacing,
            min: 0.5,
            max: 8,
            step: 0.05,
            onChange: setParam('grassPatchParameters', 'spacing'),
        },
        jitter: {
            value: grassPatchParameters.jitter,
            min: 0,
            max: 0.95,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'jitter'),
        },
        warpScale: {
            value: grassPatchParameters.domainWarpScale,
            min: 0.01,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'domainWarpScale'),
        },
        warpStrength: {
            value: grassPatchParameters.domainWarpStrength,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'domainWarpStrength'),
        },
        patchHeightVariation: {
            value: grassPatchParameters.patchHeightVariation,
            min: 0,
            max: 0.9,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'patchHeightVariation'),
        },
        patchWidthVariation: {
            value: grassPatchParameters.patchWidthVariation,
            min: 0,
            max: 0.9,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'patchWidthVariation'),
        },
        patchColorVariation: {
            value: grassPatchParameters.patchColorVariation,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'patchColorVariation'),
        },
        internalNoiseScale: {
            value: grassPatchParameters.internalNoiseScale,
            min: 0.05,
            max: 4,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'internalNoiseScale'),
        },
        internalHeightVariation: {
            value: grassPatchParameters.internalHeightVariation,
            min: 0,
            max: 0.9,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'internalHeightVariation'),
        },
        internalWidthVariation: {
            value: grassPatchParameters.internalWidthVariation,
            min: 0,
            max: 0.9,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'internalWidthVariation'),
        },
        internalColorVariation: {
            value: grassPatchParameters.internalColorVariation,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'internalColorVariation'),
        },
        internalLeanVariation: {
            value: grassPatchParameters.internalLeanVariation,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'internalLeanVariation'),
        },
        radialLean: {
            value: grassPatchParameters.radialLeanStrength,
            min: 0,
            max: 1.5,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'radialLeanStrength'),
        },
        cameraFacing: {
            value: grassPatchParameters.cameraFacingStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'cameraFacingStrength'),
        },
        orientationVariation: {
            value: grassPatchParameters.orientationVariation,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'orientationVariation'),
        },
        borderWidth: {
            value: grassPatchParameters.borderWidth,
            min: 0.01,
            max: 2,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'borderWidth'),
        },
        borderMinScale: {
            value: grassPatchParameters.borderMinScale,
            min: 0.05,
            max: 1,
            step: 0.01,
            onChange: setParam('grassPatchParameters', 'borderMinScale'),
        },
        tintCyan: {
            value: grassPatchParameters.tintColorCyan,
            onChange: setParam('grassPatchParameters', 'tintColorCyan'),
        },
        tintViolet: {
            value: grassPatchParameters.tintColorViolet,
            onChange: setParam('grassPatchParameters', 'tintColorViolet'),
        },
        tintYellow: {
            value: grassPatchParameters.tintColorYellow,
            onChange: setParam('grassPatchParameters', 'tintColorYellow'),
        },
        tintGreen: {
            value: grassPatchParameters.tintColorGreen,
            onChange: setParam('grassPatchParameters', 'tintColorGreen'),
        },
    })

    useControls('Roads', {
        enabled: {
            value: roadParameters.enabled,
            onChange: setParam('roadParameters', 'enabled'),
        },
        worldSeed: {
            value: roadParameters.worldSeed,
            step: 1,
            onChange: setParam('roadParameters', 'worldSeed'),
        },
        laneSpacing: {
            value: roadParameters.laneSpacing,
            min: 6,
            max: 80,
            step: 0.5,
            onChange: setParam('roadParameters', 'laneSpacing'),
        },
        nodeSpacing: {
            value: roadParameters.nodeSpacing,
            min: 3,
            max: 40,
            step: 0.5,
            onChange: setParam('roadParameters', 'nodeSpacing'),
        },
        meander: {
            value: roadParameters.meanderStrength,
            min: 0,
            max: 20,
            step: 0.1,
            onChange: setParam('roadParameters', 'meanderStrength'),
        },
        width: {
            value: roadParameters.width,
            min: 0.1,
            max: 8,
            step: 0.05,
            onChange: setParam('roadParameters', 'width'),
        },
        softness: {
            value: roadParameters.softness,
            min: 0.01,
            max: 4,
            step: 0.01,
            onChange: setParam('roadParameters', 'softness'),
        },
        grassMinScale: {
            value: roadParameters.grassMinScale,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('roadParameters', 'grassMinScale'),
        },
        groundBrightness: {
            value: roadParameters.groundBrightness,
            min: -1,
            max: 2,
            step: 0.01,
            onChange: setParam('roadParameters', 'groundBrightness'),
        },
        groundNoiseScale: {
            value: roadParameters.groundNoiseScale,
            min: 0.01,
            max: 2,
            step: 0.01,
            onChange: setParam('roadParameters', 'groundNoiseScale'),
        },
        groundNoiseStrength: {
            value: roadParameters.groundNoiseStrength,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('roadParameters', 'groundNoiseStrength'),
        },
        groundEdgeSharpness: {
            value: roadParameters.groundEdgeSharpness,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('roadParameters', 'groundEdgeSharpness'),
        },
    })

    useControls('Objects', {
        enabled: {
            value: objectParameters.enabled,
            onChange: setParam('objectParameters', 'enabled'),
        },
        worldSeed: {
            value: objectParameters.worldSeed,
            step: 1,
            onChange: setParam('objectParameters', 'worldSeed'),
        },
        cellSize: {
            value: objectParameters.cellSize,
            min: 2,
            max: 24,
            step: 0.5,
            onChange: setParam('objectParameters', 'cellSize'),
        },
        groupJitter: {
            value: objectParameters.groupJitter,
            min: 0,
            max: 0.95,
            step: 0.01,
            onChange: setParam('objectParameters', 'groupJitter'),
        },
        density: {
            value: objectParameters.density,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('objectParameters', 'density'),
        },
        roadClearance: {
            value: objectParameters.roadClearance,
            min: 0,
            max: 10,
            step: 0.1,
            onChange: setParam('objectParameters', 'roadClearance'),
        },
        groupScale: {
            value: objectParameters.groupScale,
            min: 0.2,
            max: 3,
            step: 0.05,
            onChange: setParam('objectParameters', 'groupScale'),
        },
        minObjectSpacing: {
            value: objectParameters.minObjectSpacing,
            min: 0.05,
            max: 3,
            step: 0.05,
            onChange: setParam('objectParameters', 'minObjectSpacing'),
        },
        painterly: {
            value: objectParameters.painterlyEnabled,
            onChange: setParam('objectParameters', 'painterlyEnabled'),
        },
        painterlyScale: {
            value: objectParameters.painterlyScale,
            min: 0,
            max: 0.5,
            step: 0.01,
            onChange: setParam('objectParameters', 'painterlyScale'),
        },
        painterlyContrast: {
            value: objectParameters.painterlyContrast,
            min: 0,
            max: 4,
            step: 0.01,
            onChange: setParam('objectParameters', 'painterlyContrast'),
        },
        painterlyBrightness: {
            value: objectParameters.painterlyBrightness,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('objectParameters', 'painterlyBrightness'),
        },
        painterlyTint: {
            value: objectParameters.painterlyColorStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('objectParameters', 'painterlyColorStrength'),
        },
        fadeOffset: {
            value: objectParameters.fadeOffset,
            min: 0,
            max: 8,
            step: 0.1,
            onChange: setParam('objectParameters', 'fadeOffset'),
        },
    })

    const grassLayerControls = (prefix, extra = {}) => ({
        enabled: {
            value: grassParameters[`${prefix}Enabled`],
            onChange: setParam('grassParameters', `${prefix}Enabled`),
        },
        source: {
            value: grassParameters[`${prefix}Source`],
            options: ['Trail', 'Radius'],
            onChange: setParam('grassParameters', `${prefix}Source`),
        },
        radius: {
            value: grassParameters[`${prefix}Radius`],
            min: 0.2,
            max: 12,
            step: 0.05,
            onChange: setParam('grassParameters', `${prefix}Radius`),
        },
        start: {
            value: grassParameters[`${prefix}Start`],
            min: 0,
            max: 1,
            step: 0.005,
            onChange: setParam('grassParameters', `${prefix}Start`),
        },
        end: {
            value: grassParameters[`${prefix}End`],
            min: 0,
            max: 1,
            step: 0.005,
            onChange: setParam('grassParameters', `${prefix}End`),
        },
        rate: {
            value: grassParameters[`${prefix}Rate`],
            min: 0.1,
            max: 6,
            step: 0.05,
            onChange: setParam('grassParameters', `${prefix}Rate`),
        },
        amount: {
            value: grassParameters[`${prefix}Amount`],
            min: -2,
            max: 2,
            step: 0.01,
            onChange: setParam('grassParameters', `${prefix}Amount`),
        },
        ...extra,
    })

    useControls('Grass Trail', {
        enabled: {
            value: grassParameters.trampleEnabled,
            onChange: setParam('grassParameters', 'trampleEnabled'),
        },
        trailStrength: {
            value: grassParameters.trailStrength,
            min: 0,
            max: 4,
            step: 0.01,
            onChange: setParam('grassParameters', 'trailStrength'),
        },
    })

    useControls(
        'GT Dissolve',
        grassLayerControls('dissolve', {
            mode: {
                value: grassParameters.dissolveMode,
                options: ['Alpha', 'Dither'],
                onChange: setParam('grassParameters', 'dissolveMode'),
            },
        })
    )

    useControls(
        'GT Lighten',
        grassLayerControls('lighten', {
            color: {
                value: grassParameters.lightenColor,
                onChange: setParam('grassParameters', 'lightenColor'),
            },
        })
    )

    useControls('GT Scale', grassLayerControls('scale'))

    useControls('GT Lean', grassLayerControls('lean'))

    useControls('Lantern Ground Light', {
        radius: {
            value: lanternGroundLightParameters.radius,
            min: 0.25,
            max: 15,
            step: 0.05,
            onChange: setParam('lanternGroundLightParameters', 'radius'),
        },
        edgeSoftness: {
            value: lanternGroundLightParameters.edgeSoftness,
            min: 0,
            max: 4,
            step: 0.01,
            onChange: setParam('lanternGroundLightParameters', 'edgeSoftness'),
        },
        edgeNoiseScale: {
            value: lanternGroundLightParameters.edgeNoiseScale,
            min: 0.01,
            max: 3,
            step: 0.01,
            onChange: setParam('lanternGroundLightParameters', 'edgeNoiseScale'),
        },
        edgeNoiseStrength: {
            value: lanternGroundLightParameters.edgeNoiseStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternGroundLightParameters', 'edgeNoiseStrength'),
        },
        innerBrightness: {
            value: lanternGroundLightParameters.innerBrightness,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('lanternGroundLightParameters', 'innerBrightness'),
        },
        outerDarkness: {
            value: lanternGroundLightParameters.outerDarkness,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternGroundLightParameters', 'outerDarkness'),
        },
    })

    useControls('Border', {
        fadeMode: {
            value: borderParameters.fadeMode,
            options: ['Color', 'Dither', 'Paintery'],
            onChange: setParam('borderParameters', 'fadeMode'),
        },
        nStrength: {
            value: borderParameters.noiseStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('borderParameters', 'noiseStrength'),
        },
        nScale: {
            value: borderParameters.noiseScale,
            min: 0.01,
            max: 1.0,
            step: 0.01,
            onChange: setParam('borderParameters', 'noiseScale'),
        },
        radius: {
            value: borderParameters.circleRadiusFactor,
            min: 0.1,
            max: 1.0,
            step: 0.01,
            onChange: setParam('borderParameters', 'circleRadiusFactor'),
        },
        edgeFade: {
            value: borderParameters.groundFadeOffset,
            min: 0,
            max: 3.0,
            step: 0.01,
            onChange: setParam('borderParameters', 'groundFadeOffset'),
        },
        grassFade: {
            value: borderParameters.grassFadeOffset,
            min: 0.01,
            max: 5,
            step: 0.01,
            onChange: setParam('borderParameters', 'grassFadeOffset'),
        },
        groundOffset: {
            value: borderParameters.groundOffset,
            min: -3.0,
            max: 3.0,
            step: 0.001,
            onChange: setParam('borderParameters', 'groundOffset'),
        },
        pSize: {
            value: borderParameters.painterySize,
            min: 20,
            max: 2000,
            step: 1,
            onChange: setParam('borderParameters', 'painterySize'),
        },
        pScreenBlend: {
            value: borderParameters.painteryScreenBlend,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('borderParameters', 'painteryScreenBlend'),
        },
        pDrift: {
            value: borderParameters.painteryDrift,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('borderParameters', 'painteryDrift'),
        },
        pLayer2: {
            value: borderParameters.painteryLayer2Scale,
            min: 0,
            max: 6,
            step: 0.05,
            onChange: setParam('borderParameters', 'painteryLayer2Scale'),
        },
        pBleed: {
            value: borderParameters.painteryBleed,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('borderParameters', 'painteryBleed'),
        },
    })

    useControls('Dithering Params', {
        ditherMode: {
            value: ditheringParameters.ditherMode,
            options: ['Diamond', 'Bayer'],
            onChange: setParam('ditheringParameters', 'ditherMode'),
        },
        pixelSize: {
            value: ditheringParameters.pixelSize,
            min: 1,
            max: 10,
            step: 1,
            onChange: setParam('ditheringParameters', 'pixelSize'),
        },
    })

    useControls('Background', {
        mode: {
            value: backgroundParameters.mode,
            options: ['Color', 'Texture', 'NightSky'],
            onChange: setParam('backgroundParameters', 'mode'),
        },
        textureSize: {
            value: backgroundParameters.textureSize,
            min: 20,
            max: 2000,
            step: 1,
            onChange: setParam('backgroundParameters', 'textureSize'),
        },
        textureContrast: {
            value: backgroundParameters.textureContrast,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'textureContrast'),
        },
        textureLayer2: {
            value: backgroundParameters.textureLayer2,
            min: 0,
            max: 6,
            step: 0.05,
            onChange: setParam('backgroundParameters', 'textureLayer2'),
        },
        starCellSize: {
            value: backgroundParameters.starCellSize,
            min: 8,
            max: 120,
            step: 1,
            onChange: setParam('backgroundParameters', 'starCellSize'),
        },
        starDensity: {
            value: backgroundParameters.starDensity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'starDensity'),
        },
        starSize: {
            value: backgroundParameters.starSize,
            min: 0.01,
            max: 0.3,
            step: 0.005,
            onChange: setParam('backgroundParameters', 'starSize'),
        },
        starBrightness: {
            value: backgroundParameters.starBrightness,
            min: 0,
            max: 4,
            step: 0.05,
            onChange: setParam('backgroundParameters', 'starBrightness'),
        },
        starTwinkle: {
            value: backgroundParameters.starTwinkleSpeed,
            min: 0,
            max: 6,
            step: 0.05,
            onChange: setParam('backgroundParameters', 'starTwinkleSpeed'),
        },
        starRays: {
            value: backgroundParameters.starRays,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'starRays'),
        },
        starColor: {
            value: backgroundParameters.starColor,
            onChange: setParam('backgroundParameters', 'starColor'),
        },
    })

    useControls('Painterly Postprocess', {
        enabled: {
            value: painterlyPostParameters.enabled,
            onChange: setParam('painterlyPostParameters', 'enabled'),
        },
        noiseSeed: {
            value: painterlyPostParameters.noiseSeed,
            min: 0,
            max: 100,
            step: 1,
            onChange: setParam('painterlyPostParameters', 'noiseSeed'),
        },
        sensorNoise: {
            value: painterlyPostParameters.sensorNoiseEnabled,
            onChange: setParam('painterlyPostParameters', 'sensorNoiseEnabled'),
        },
        lumaNoise: {
            value: painterlyPostParameters.luminanceNoise,
            min: 0,
            max: 0.2,
            step: 0.001,
            onChange: setParam('painterlyPostParameters', 'luminanceNoise'),
        },
        chromaNoise: {
            value: painterlyPostParameters.chromaNoise,
            min: 0,
            max: 0.1,
            step: 0.001,
            onChange: setParam('painterlyPostParameters', 'chromaNoise'),
        },
        sensorScale: {
            value: painterlyPostParameters.sensorNoiseScale,
            min: 1,
            max: 8,
            step: 1,
            onChange: setParam('painterlyPostParameters', 'sensorNoiseScale'),
        },
        bloom: {
            value: painterlyPostParameters.bloomEnabled,
            onChange: setParam('painterlyPostParameters', 'bloomEnabled'),
        },
        bloomIntensity: {
            value: painterlyPostParameters.bloomIntensity,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('painterlyPostParameters', 'bloomIntensity'),
        },
        bloomThreshold: {
            value: painterlyPostParameters.bloomThreshold,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('painterlyPostParameters', 'bloomThreshold'),
        },
        bloomSmooth: {
            value: painterlyPostParameters.bloomSmoothing,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('painterlyPostParameters', 'bloomSmoothing'),
        },
        bloomRadius: {
            value: painterlyPostParameters.bloomRadius,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('painterlyPostParameters', 'bloomRadius'),
        },
        sharpen: {
            value: painterlyPostParameters.sharpenEnabled,
            onChange: setParam('painterlyPostParameters', 'sharpenEnabled'),
        },
        sharpenStrength: {
            value: painterlyPostParameters.sharpenStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('painterlyPostParameters', 'sharpenStrength'),
        },
    })

    useControls('Paintery Texture', {
        enabled: {
            value: painteryTextureParameters.enabled,
            onChange: setParam('painteryTextureParameters', 'enabled'),
        },
        blur: {
            value: painteryTextureParameters.blur,
            min: 0,
            max: 6,
            step: 0.1,
            onChange: setParam('painteryTextureParameters', 'blur'),
        },
        levelsLow: {
            value: painteryTextureParameters.levelsLow,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('painteryTextureParameters', 'levelsLow'),
        },
        levelsHigh: {
            value: painteryTextureParameters.levelsHigh,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('painteryTextureParameters', 'levelsHigh'),
        },
        contrast: {
            value: painteryTextureParameters.contrast,
            min: 0.2,
            max: 4,
            step: 0.05,
            onChange: setParam('painteryTextureParameters', 'contrast'),
        },
        posterize: {
            value: painteryTextureParameters.posterize,
            min: 0,
            max: 12,
            step: 1,
            onChange: setParam('painteryTextureParameters', 'posterize'),
        },
    })

    useControls('Character', {
        modelScale: {
            value: characterParameters.modelScale,
            min: 0.05,
            max: 2.0,
            step: 0.01,
            onChange: setParam('characterParameters', 'modelScale'),
        },
        modelYOffset: {
            value: characterParameters.modelYOffset,
            min: -2.0,
            max: 2.0,
            step: 0.01,
            onChange: setParam('characterParameters', 'modelYOffset'),
        },
        rotationOffset: {
            value: characterParameters.rotationOffset,
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            onChange: setParam('characterParameters', 'rotationOffset'),
        },
        idleTimeScale: {
            value: characterParameters.idleTimeScale,
            min: 0.1,
            max: 3,
            step: 0.05,
            onChange: setParam('characterParameters', 'idleTimeScale'),
        },
        runTimeScale: {
            value: characterParameters.runTimeScale,
            min: 0.1,
            max: 3,
            step: 0.05,
            onChange: setParam('characterParameters', 'runTimeScale'),
        },
        runBlendInSpeed: {
            value: characterParameters.runBlendInSpeed,
            min: 1,
            max: 30,
            step: 0.5,
            onChange: setParam('characterParameters', 'runBlendInSpeed'),
        },
        runBlendOutSpeed: {
            value: characterParameters.runBlendOutSpeed,
            min: 1,
            max: 30,
            step: 0.5,
            onChange: setParam('characterParameters', 'runBlendOutSpeed'),
        },
    })

    useControls('Character Stylized', {
        debug: {
            value: characterMaterialParameters.debugMode,
            options: stylizedDebugModes,
            onChange: setParam('characterMaterialParameters', 'debugMode'),
        },
        painterly: {
            value: characterMaterialParameters.painterlyEnabled,
            onChange: setParam('characterMaterialParameters', 'painterlyEnabled'),
        },
        pTexture: {
            value: characterMaterialParameters.painterlyTexture,
            options: painterlyTextureOptions,
            onChange: setParam('characterMaterialParameters', 'painterlyTexture'),
        },
        pScale: {
            value: characterMaterialParameters.painterlyScale,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'painterlyScale'),
        },
        pContrast: {
            value: characterMaterialParameters.painterlyContrast,
            min: 0,
            max: 4,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'painterlyContrast'),
        },
        pColor: {
            value: characterMaterialParameters.painterlyColor,
            onChange: setParam('characterMaterialParameters', 'painterlyColor'),
        },
        pTint: {
            value: characterMaterialParameters.painterlyColorStrength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'painterlyColorStrength'),
        },
        pBrightness: {
            value: characterMaterialParameters.painterlyBrightnessVariation,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'painterlyBrightnessVariation'),
        },
        ...mainCharacterMaterialGroups.reduce((controls, group) => {
            controls[`${group.label} Base`] = {
                value: characterMaterialParameters.materials[group.id]?.baseColor ?? group.baseColor,
                onChange: setCharacterMaterialParam(group.id, 'baseColor'),
            }
            return controls
        }, {}),
    })

    useControls('Camera Debug', {
        debugOrbit: {
            value: cameraParameters.debugOrbit,
            onChange: setParam('cameraParameters', 'debugOrbit'),
        },
        debugOrbitAngle: {
            value: cameraParameters.debugOrbitAngle,
            min: -Math.PI,
            max: Math.PI,
            step: 0.01,
            onChange: setParam('cameraParameters', 'debugOrbitAngle'),
        },
        debugOrbitDistance: {
            value: cameraParameters.debugOrbitDistance,
            min: 2,
            max: 30,
            step: 0.1,
            onChange: setParam('cameraParameters', 'debugOrbitDistance'),
        },
        debugOrbitHeight: {
            value: cameraParameters.debugOrbitHeight,
            min: 0.5,
            max: 20,
            step: 0.1,
            onChange: setParam('cameraParameters', 'debugOrbitHeight'),
        },
        debugTargetYOffset: {
            value: cameraParameters.debugTargetYOffset,
            min: -2,
            max: 4,
            step: 0.01,
            onChange: setParam('cameraParameters', 'debugTargetYOffset'),
        },
    })

    return null
}
