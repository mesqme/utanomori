import { useControls } from 'leva'
import useStore from '../stores/useStore.jsx'
import { mainCharacterMaterialGroups, mainCharacterMaterialPresets } from '../config/mainCharacterMaterials.js'
import { sceneStylePresets } from '../config/sceneStyles.js'

const SCENE_STYLE_SECTIONS = new Set([
    'terrainParameters',
    'lanternGroundLightParameters',
    'borderParameters',
    'ditheringParameters',
    'characterParameters',
])

export default function Controls() {
    const sceneStylePreset = useStore((state) => state.sceneStylePreset)
    const terrainParameters = useStore((state) => state.terrainParameters)
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
            lanternGroundLightParameters: { ...preset.lanternGroundLightParameters },
            borderParameters: { ...preset.borderParameters },
            ditheringParameters: { ...preset.ditheringParameters },
            characterParameters: { ...preset.characterParameters },
        })
    }

    const setCharacterMaterialParam = (slotId, param) => (value) => {
        useStore.setState((state) => ({
            characterMaterialParameters: {
                ...state.characterMaterialParameters,
                palettePreset: 'custom',
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

    const setCharacterMaterialPreset = (presetId) => {
        const preset = mainCharacterMaterialPresets[presetId]
        if (!preset) {
            useStore.setState((state) => ({
                characterMaterialParameters: {
                    ...state.characterMaterialParameters,
                    palettePreset: presetId,
                },
            }))
            return
        }

        useStore.setState((state) => ({
            characterMaterialParameters: {
                ...state.characterMaterialParameters,
                palettePreset: presetId,
                materials: Object.fromEntries(
                    Object.entries(preset.materials).map(([id, colors]) => [
                        id,
                        {
                            ...state.characterMaterialParameters.materials[id],
                            ...colors,
                        },
                    ])
                ),
            },
        }))
    }

    useControls('General', {
        perfMonitor: {
            value: perfVisible,
            onChange: (value) => useStore.getState().setPerfVisible(value),
        },
        bgWireframe: {
            value: backgroundWireframe,
            onChange: (value) => useStore.getState().setBackgroundWireframe(value),
        },
    })

    useControls('Scene Style', {
        preset: {
            value: sceneStylePreset,
            options: {
                'Flat Style': 'flatStyle',
                Custom: 'custom',
            },
            onChange: setSceneStylePreset,
        },
    })

    useControls('Terrain', {
        color: {
            value: terrainParameters.color,
            onChange: setParam('terrainParameters', 'color'),
        },
        backgroundColor: {
            value: terrainParameters.backgroundColor,
            onChange: setParam('terrainParameters', 'backgroundColor'),
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

    useControls('Character Toon', {
        palettePreset: {
            value: characterMaterialParameters.palettePreset,
            options: {
                Tuned: 'tuned',
                Previous: 'previous',
                Custom: 'custom',
            },
            onChange: setCharacterMaterialPreset,
        },
        lightDirectionX: {
            value: characterMaterialParameters.lightDirectionX,
            min: -1,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'lightDirectionX'),
        },
        lightDirectionY: {
            value: characterMaterialParameters.lightDirectionY,
            min: -1,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'lightDirectionY'),
        },
        lightDirectionZ: {
            value: characterMaterialParameters.lightDirectionZ,
            min: -1,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'lightDirectionZ'),
        },
        threshold: {
            value: characterMaterialParameters.threshold,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('characterMaterialParameters', 'threshold'),
        },
        softness: {
            value: characterMaterialParameters.softness,
            min: 0,
            max: 0.5,
            step: 0.001,
            onChange: setParam('characterMaterialParameters', 'softness'),
        },
        ...mainCharacterMaterialGroups.reduce((controls, group) => {
            controls[`${group.label} Base`] = {
                value: characterMaterialParameters.materials[group.id]?.baseColor ?? group.baseColor,
                onChange: setCharacterMaterialParam(group.id, 'baseColor'),
            }
            controls[`${group.label} Toon`] = {
                value: characterMaterialParameters.materials[group.id]?.toonColor ?? group.toonColor,
                onChange: setCharacterMaterialParam(group.id, 'toonColor'),
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
