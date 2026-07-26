import { button, useControls } from 'leva'
import { useThree } from '@react-three/fiber'
import { levaSync, setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import usePhases, { PHASES } from '../../stores/usePhases.jsx'
import useCompanions from '../../stores/useCompanions.jsx'
import { seeThrough } from '../../world/state/seeThrough.js'

export function useDebugControls() {
    const cameraParameters = useStore((state) => state.cameraParameters)
    const loaderDebugParameters = useStore((state) => state.loaderDebugParameters)
    const setDpr = useThree((state) => state.setDpr)
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    // ======================================================================================
    // Debug — dev shortcuts and alignment tools. Nothing here ships as player-facing.
    // ======================================================================================
    useControls('Debug.General', {
        toFinale: button(() => {
            // Dev: complete the party and jump to the finale (closing line → credits).
            useCompanions.getState().fillParty()
            usePhases.getState().setCreditsShown(true) // don't auto-retrigger on Continue
            usePhases.getState().setPhase(PHASES.finale)
        }),
        toCredits: button(() => {
            // Dev: gather the full party behind the hero and jump straight into the credits run.
            useCompanions.getState().fillParty()
            usePhases.getState().setCreditsShown(true) // don't auto-retrigger on Continue
            usePhases.getState().setPhase(PHASES.credits)
        }),
        perfMonitor: {
            value: perfVisible,
            onChange: (value, _, context) => {
                if (!context?.initial && !levaSync.active) useStore.getState().setPerfVisible(value)
            },
        },
        bgWireframe: {
            value: backgroundWireframe,
            onChange: (value, _, context) => {
                if (!context?.initial && !levaSync.active) useStore.getState().setBackgroundWireframe(value)
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

    useControls('Debug.See-Through', {
        enabled: {
            value: seeThrough.enabled,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.enabled = value
            },
        },
        grassEnabled: {
            value: seeThrough.grassEnabled,
            onChange: (value, _, context) => {
                if (!context?.initial) seeThrough.grassEnabled = value
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

    useControls('Debug.Camera Debug', {
        debugOrbit: { value: cameraParameters.debugOrbit, onChange: setParam('cameraParameters', 'debugOrbit') },
        debugOrbitAngle: { value: cameraParameters.debugOrbitAngle, min: -Math.PI, max: Math.PI, step: 0.01, onChange: setParam('cameraParameters', 'debugOrbitAngle') },
        debugOrbitDistance: { value: cameraParameters.debugOrbitDistance, min: 2, max: 30, step: 0.1, onChange: setParam('cameraParameters', 'debugOrbitDistance') },
        debugOrbitHeight: { value: cameraParameters.debugOrbitHeight, min: 0.5, max: 20, step: 0.1, onChange: setParam('cameraParameters', 'debugOrbitHeight') },
        debugTargetYOffset: { value: cameraParameters.debugTargetYOffset, min: -2, max: 4, step: 0.01, onChange: setParam('cameraParameters', 'debugTargetYOffset') },
    })

    useControls('Debug.Loader Debug', {
        enabled: { value: loaderDebugParameters.enabled, onChange: setParam('loaderDebugParameters', 'enabled') },
        targetX: { value: loaderDebugParameters.targetX, min: -12, max: 12, step: 0.001, onChange: setParam('loaderDebugParameters', 'targetX') },
        targetZ: { value: loaderDebugParameters.targetZ, min: -12, max: 12, step: 0.001, onChange: setParam('loaderDebugParameters', 'targetZ') },
        step: { value: loaderDebugParameters.nudgeStep, min: 0.001, max: 0.25, step: 0.001, onChange: setParam('loaderDebugParameters', 'nudgeStep') },
        circleRadius: { value: loaderDebugParameters.circleRadius, min: 40, max: 220, step: 0.5, onChange: setParam('loaderDebugParameters', 'circleRadius') },
        ringWidth: { value: loaderDebugParameters.ringWidth, min: 1, max: 40, step: 0.5, onChange: setParam('loaderDebugParameters', 'ringWidth') },
        cameraY: { value: loaderDebugParameters.cameraHeight, min: 1, max: 40, step: 0.05, onChange: setParam('loaderDebugParameters', 'cameraHeight') },
    })
}
