import { button, useControls } from 'leva'
import { useThree } from '@react-three/fiber'
import { levaSync, setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import usePhases, { PHASES } from '../../stores/usePhases.jsx'
import useCompanions from '../../stores/useCompanions.jsx'

export function useDebugControls() {
    const cameraParameters = useStore((state) => state.cameraParameters)
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

    useControls('Debug.Camera Debug', {
        debugOrbit: { value: cameraParameters.debugOrbit, onChange: setParam('cameraParameters', 'debugOrbit') },
        debugOrbitAngle: { value: cameraParameters.debugOrbitAngle, min: -Math.PI, max: Math.PI, step: 0.01, onChange: setParam('cameraParameters', 'debugOrbitAngle') },
        debugOrbitDistance: { value: cameraParameters.debugOrbitDistance, min: 2, max: 30, step: 0.1, onChange: setParam('cameraParameters', 'debugOrbitDistance') },
        debugOrbitHeight: { value: cameraParameters.debugOrbitHeight, min: 0.5, max: 20, step: 0.1, onChange: setParam('cameraParameters', 'debugOrbitHeight') },
        debugTargetYOffset: { value: cameraParameters.debugTargetYOffset, min: -2, max: 4, step: 0.01, onChange: setParam('cameraParameters', 'debugTargetYOffset') },
    }, { collapsed: true })
}
