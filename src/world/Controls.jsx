import { useControls } from 'leva'
import useStore from '../stores/useStore.jsx'

export default function Controls() {
    const terrainParameters = useStore((state) => state.terrainParameters)
    const borderParameters = useStore((state) => state.borderParameters)
    const ditheringParameters = useStore((state) => state.ditheringParameters)
    const characterParameters = useStore((state) => state.characterParameters)
    const cameraParameters = useStore((state) => state.cameraParameters)
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    const setParam = (section, param) => (value) => {
        useStore.setState((state) => ({
            [section]: {
                ...state[section],
                [param]: value,
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
