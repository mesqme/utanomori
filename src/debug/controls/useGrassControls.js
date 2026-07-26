import { useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'

export function useGrassControls() {
    const grassParameters = useStore((state) => state.grassParameters)
    const grassPatchParameters = useStore((state) => state.grassPatchParameters)

    // ======================================================================================
    // Grass — the blades, the patch layout, and the hero trail's four reaction layers.
    // ======================================================================================
    useControls('Grass.Blades', {
        enabled: { value: grassParameters.enabled, onChange: setParam('grassParameters', 'enabled') },
        count: { value: grassParameters.count, min: 0, max: 10000, step: 100, onChange: setParam('grassParameters', 'count') },
        segments: { value: grassParameters.segmentsCount, min: 1, max: 8, step: 1, onChange: setParam('grassParameters', 'segmentsCount') },
        width: { value: grassParameters.width, min: 0.01, max: 0.5, step: 0.01, onChange: setParam('grassParameters', 'width') },
        height: { value: grassParameters.height, min: 0.05, max: 3, step: 0.01, onChange: setParam('grassParameters', 'height') },
        baseColor: { value: grassParameters.colorBase, onChange: setParam('grassParameters', 'colorBase') },
        baseBrightness: { value: grassParameters.baseBrightness, min: 0, max: 2, step: 0.01, onChange: setParam('grassParameters', 'baseBrightness') },
    }, { collapsed: true })

    useControls('Grass.Patches', {
        worldSeed: { value: grassPatchParameters.worldSeed, step: 1, onChange: setParam('grassPatchParameters', 'worldSeed') },
        spacing: { value: grassPatchParameters.spacing, min: 0.5, max: 8, step: 0.05, onChange: setParam('grassPatchParameters', 'spacing') },
        jitter: { value: grassPatchParameters.jitter, min: 0, max: 0.95, step: 0.01, onChange: setParam('grassPatchParameters', 'jitter') },
        warpScale: { value: grassPatchParameters.domainWarpScale, min: 0.01, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'domainWarpScale') },
        warpStrength: { value: grassPatchParameters.domainWarpStrength, min: 0, max: 2, step: 0.01, onChange: setParam('grassPatchParameters', 'domainWarpStrength') },
        patchHeightVariation: { value: grassPatchParameters.patchHeightVariation, min: 0, max: 0.9, step: 0.01, onChange: setParam('grassPatchParameters', 'patchHeightVariation') },
        patchWidthVariation: { value: grassPatchParameters.patchWidthVariation, min: 0, max: 0.9, step: 0.01, onChange: setParam('grassPatchParameters', 'patchWidthVariation') },
        patchColorVariation: { value: grassPatchParameters.patchColorVariation, min: 0, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'patchColorVariation') },
        internalNoiseScale: { value: grassPatchParameters.internalNoiseScale, min: 0.05, max: 4, step: 0.01, onChange: setParam('grassPatchParameters', 'internalNoiseScale') },
        internalHeightVariation: { value: grassPatchParameters.internalHeightVariation, min: 0, max: 0.9, step: 0.01, onChange: setParam('grassPatchParameters', 'internalHeightVariation') },
        internalWidthVariation: { value: grassPatchParameters.internalWidthVariation, min: 0, max: 0.9, step: 0.01, onChange: setParam('grassPatchParameters', 'internalWidthVariation') },
        internalColorVariation: { value: grassPatchParameters.internalColorVariation, min: 0, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'internalColorVariation') },
        internalLeanVariation: { value: grassPatchParameters.internalLeanVariation, min: 0, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'internalLeanVariation') },
        radialLean: { value: grassPatchParameters.radialLeanStrength, min: 0, max: 1.5, step: 0.01, onChange: setParam('grassPatchParameters', 'radialLeanStrength') },
        cameraFacing: { value: grassPatchParameters.cameraFacingStrength, min: 0, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'cameraFacingStrength') },
        orientationVariation: { value: grassPatchParameters.orientationVariation, min: 0, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'orientationVariation') },
        borderWidth: { value: grassPatchParameters.borderWidth, min: 0.01, max: 2, step: 0.01, onChange: setParam('grassPatchParameters', 'borderWidth') },
        borderMinScale: { value: grassPatchParameters.borderMinScale, min: 0.05, max: 1, step: 0.01, onChange: setParam('grassPatchParameters', 'borderMinScale') },
        tintCyan: { value: grassPatchParameters.tintColorCyan, onChange: setParam('grassPatchParameters', 'tintColorCyan') },
        tintViolet: { value: grassPatchParameters.tintColorViolet, onChange: setParam('grassPatchParameters', 'tintColorViolet') },
        tintYellow: { value: grassPatchParameters.tintColorYellow, onChange: setParam('grassPatchParameters', 'tintColorYellow') },
        tintGreen: { value: grassPatchParameters.tintColorGreen, onChange: setParam('grassPatchParameters', 'tintColorGreen') },
    }, { collapsed: true })

    const grassLayerControls = (prefix, extra = {}) => ({
        enabled: { value: grassParameters[`${prefix}Enabled`], onChange: setParam('grassParameters', `${prefix}Enabled`) },
        source: { value: grassParameters[`${prefix}Source`], options: ['Trail', 'Radius'], onChange: setParam('grassParameters', `${prefix}Source`) },
        radius: { value: grassParameters[`${prefix}Radius`], min: 0.2, max: 12, step: 0.05, onChange: setParam('grassParameters', `${prefix}Radius`) },
        start: { value: grassParameters[`${prefix}Start`], min: 0, max: 1, step: 0.005, onChange: setParam('grassParameters', `${prefix}Start`) },
        end: { value: grassParameters[`${prefix}End`], min: 0, max: 1, step: 0.005, onChange: setParam('grassParameters', `${prefix}End`) },
        rate: { value: grassParameters[`${prefix}Rate`], min: 0.1, max: 6, step: 0.05, onChange: setParam('grassParameters', `${prefix}Rate`) },
        amount: { value: grassParameters[`${prefix}Amount`], min: -2, max: 2, step: 0.01, onChange: setParam('grassParameters', `${prefix}Amount`) },
        ...extra,
    })

    useControls('Grass.Trail', {
        enabled: { value: grassParameters.trampleEnabled, onChange: setParam('grassParameters', 'trampleEnabled') },
        trailStrength: { value: grassParameters.trailStrength, min: 0, max: 4, step: 0.01, onChange: setParam('grassParameters', 'trailStrength') },
    }, { collapsed: true })

    useControls(
        'Grass.Trail.Dissolve',
        grassLayerControls('dissolve', {
            mode: { value: grassParameters.dissolveMode, options: ['Alpha', 'Dither'], onChange: setParam('grassParameters', 'dissolveMode') },
        }),
        { collapsed: true }
    )

    useControls(
        'Grass.Trail.Lighten',
        grassLayerControls('lighten', {
            color: { value: grassParameters.lightenColor, onChange: setParam('grassParameters', 'lightenColor') },
        }),
        { collapsed: true }
    )

    useControls('Grass.Trail.Scale', grassLayerControls('scale'), { collapsed: true })

    useControls('Grass.Trail.Lean', grassLayerControls('lean'), { collapsed: true })
}
