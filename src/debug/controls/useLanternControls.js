import { folder, useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'

export function useLanternControls() {
    const lanternGroundLightParameters = useStore((state) => state.lanternGroundLightParameters)
    const lanternFireParameters = useStore((state) => state.lanternFireParameters)
    const lanternGrassParameters = useStore((state) => state.lanternGrassParameters)

    // ======================================================================================
    // Lantern — the hero's lantern: flame + glow sprite, its pool of light on the ground,
    // and how the grass reacts under it.
    // ======================================================================================
    useControls('Lantern.Fire & Glow', {
        fireEnabled: { value: lanternFireParameters.enabled, onChange: setParam('lanternFireParameters', 'enabled') },
        Flame: folder(
            {
                fireBoneOffset: { value: lanternFireParameters.fireBoneOffset, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'fireBoneOffset') },
                fireSize: { value: lanternFireParameters.fireSize, min: 0.02, max: 0.6, step: 0.005, onChange: setParam('lanternFireParameters', 'fireSize') },
                fireCore: { value: lanternFireParameters.fireColorCore, onChange: setParam('lanternFireParameters', 'fireColorCore') },
                fireEdge: { value: lanternFireParameters.fireColorEdge, onChange: setParam('lanternFireParameters', 'fireColorEdge') },
                flickerSpeed: { value: lanternFireParameters.flickerSpeed, min: 0, max: 20, step: 0.1, onChange: setParam('lanternFireParameters', 'flickerSpeed') },
                flickerAmount: { value: lanternFireParameters.flickerAmount, min: 0, max: 1, step: 0.01, onChange: setParam('lanternFireParameters', 'flickerAmount') },
            },
            { collapsed: true }
        ),
        Glow: folder(
            {
                glowOffsetX: { value: lanternFireParameters.glowOffsetX, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'glowOffsetX') },
                glowOffsetY: { value: lanternFireParameters.glowOffsetY, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'glowOffsetY') },
                glowOffsetZ: { value: lanternFireParameters.glowOffsetZ, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'glowOffsetZ') },
                glowSize: { value: lanternFireParameters.glowSize, min: 0.1, max: 5, step: 0.01, onChange: setParam('lanternFireParameters', 'glowSize') },
                glowColor: { value: lanternFireParameters.glowColor, onChange: setParam('lanternFireParameters', 'glowColor') },
                glowOpacity: { value: lanternFireParameters.glowOpacity, min: 0, max: 1, step: 0.01, onChange: setParam('lanternFireParameters', 'glowOpacity') },
                glowRadius: { value: lanternFireParameters.glowRadius, min: 0.1, max: 1.5, step: 0.01, onChange: setParam('lanternFireParameters', 'glowRadius') },
                glowBleed: { value: lanternFireParameters.glowBleed, min: 0, max: 0.6, step: 0.005, onChange: setParam('lanternFireParameters', 'glowBleed') },
                glowTextureScale: { value: lanternFireParameters.glowTextureScale, min: 0.02, max: 5, step: 0.01, onChange: setParam('lanternFireParameters', 'glowTextureScale') },
                glowFront: { value: lanternFireParameters.glowFront, min: 0, max: 1.5, step: 0.01, onChange: setParam('lanternFireParameters', 'glowFront') },
            },
            { collapsed: true }
        ),
    }, { collapsed: true })

    useControls('Lantern.Ground Light', {
        radius: { value: lanternGroundLightParameters.radius, min: 0.25, max: 15, step: 0.05, onChange: setParam('lanternGroundLightParameters', 'radius') },
        edgeSoftness: { value: lanternGroundLightParameters.edgeSoftness, min: 0, max: 4, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'edgeSoftness') },
        edgeNoiseScale: { value: lanternGroundLightParameters.edgeNoiseScale, min: 0.01, max: 3, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'edgeNoiseScale') },
        edgeNoiseStrength: { value: lanternGroundLightParameters.edgeNoiseStrength, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'edgeNoiseStrength') },
        innerBrightness: { value: lanternGroundLightParameters.innerBrightness, min: 0, max: 2, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'innerBrightness') },
        outerDarkness: { value: lanternGroundLightParameters.outerDarkness, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'outerDarkness') },
    }, { collapsed: true })

    useControls('Lantern.Grass React', {
        grassEnabled: { value: lanternGrassParameters.enabled, onChange: setParam('lanternGrassParameters', 'enabled') },
        grassRadius: { value: lanternGrassParameters.radius, min: 0, max: 6, step: 0.05, onChange: setParam('lanternGrassParameters', 'radius') },
        grassSoftness: { value: lanternGrassParameters.softness, min: 0, max: 4, step: 0.05, onChange: setParam('lanternGrassParameters', 'softness') },
        grassScale: { value: lanternGrassParameters.scale, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGrassParameters', 'scale') },
        grassAlpha: { value: lanternGrassParameters.alpha, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGrassParameters', 'alpha') },
        grassColor: { value: lanternGrassParameters.color, onChange: setParam('lanternGrassParameters', 'color') },
        grassColorAmount: { value: lanternGrassParameters.colorAmount, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGrassParameters', 'colorAmount') },
    }, { collapsed: true })
}
