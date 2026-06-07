import { useControls } from 'leva'
import useStore from '../stores/useStore.jsx'
import { mainCharacterMaterialGroups } from '../config/mainCharacterMaterials.js'
import { cloneSceneStyleSection, sceneStylePresets } from '../config/sceneStyles.js'
import { painterlyTextureOptions, stylizedDebugModes } from '../config/stylizedMaterialDefaults.js'

const SCENE_STYLE_SECTIONS = new Set([
    'terrainParameters',
    'grassParameters',
    'grassPatchParameters',
    'roadParameters',
    'windParameters',
    'lanternGroundLightParameters',
    'borderParameters',
    'ditheringParameters',
    'characterParameters',
    'characterMaterialParameters',
])

const sceneStyleOptions = Object.freeze({
    ...Object.fromEntries(Object.entries(sceneStylePresets).map(([id, preset]) => [preset.label, id])),
    Custom: 'custom',
})

export default function Controls() {
    const sceneStylePreset = useStore((state) => state.sceneStylePreset)
    const terrainParameters = useStore((state) => state.terrainParameters)
    const grassParameters = useStore((state) => state.grassParameters)
    const grassPatchParameters = useStore((state) => state.grassPatchParameters)
    const roadParameters = useStore((state) => state.roadParameters)
    const windParameters = useStore((state) => state.windParameters)
    const lanternGroundLightParameters = useStore((state) => state.lanternGroundLightParameters)
    const borderParameters = useStore((state) => state.borderParameters)
    const ditheringParameters = useStore((state) => state.ditheringParameters)
    const characterParameters = useStore((state) => state.characterParameters)
    const characterMaterialParameters = useStore((state) => state.characterMaterialParameters)
    const cameraParameters = useStore((state) => state.cameraParameters)
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    const setParam = (section, param) => (value, _, context) => {
        useStore.setState((state) => ({
            sceneStylePreset: SCENE_STYLE_SECTIONS.has(section) && !context?.initial ? 'custom' : state.sceneStylePreset,
            [section]: {
                ...state[section],
                [param]: value,
            },
        }))
    }

    const setSceneStylePreset = (presetId) => {
        const preset = sceneStylePresets[presetId]

        if (!preset) {
            useStore.setState({ sceneStylePreset: presetId })
            return
        }

        useStore.setState({
            sceneStylePreset: presetId,
            terrainParameters: { ...preset.terrainParameters },
            grassParameters: { ...preset.grassParameters },
            grassPatchParameters: { ...preset.grassPatchParameters },
            roadParameters: { ...preset.roadParameters },
            windParameters: { ...preset.windParameters },
            lanternGroundLightParameters: { ...preset.lanternGroundLightParameters },
            borderParameters: { ...preset.borderParameters },
            ditheringParameters: { ...preset.ditheringParameters },
            characterParameters: { ...preset.characterParameters },
            characterMaterialParameters: cloneSceneStyleSection(preset.characterMaterialParameters),
        })
    }

    const setCharacterMaterialParam = (slotId, param) => (value, _, context) => {
        useStore.setState((state) => ({
            sceneStylePreset: context?.initial ? state.sceneStylePreset : 'custom',
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

    useControls('General', {
        style: {
            value: sceneStylePreset,
            options: sceneStyleOptions,
            onChange: setSceneStylePreset,
        },
        perfMonitor: {
            value: perfVisible,
            onChange: (value) => useStore.getState().setPerfVisible(value),
        },
        bgWireframe: {
            value: backgroundWireframe,
            onChange: (value) => useStore.getState().setBackgroundWireframe(value),
        },
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
