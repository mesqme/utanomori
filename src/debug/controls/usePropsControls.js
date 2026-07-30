import { folder, useControls } from 'leva'
import { setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import { PAINTERY_TEXTURE_IDS } from '../../config/painteryTextures.js'

export function usePropsControls() {
    const objectParameters = useStore((state) => state.objectParameters)
    const treeEyesParameters = useStore((state) => state.treeEyesParameters)
    const edgeParameters = useStore((state) => state.edgeParameters)
    const propRimParameters = useStore((state) => state.propRimParameters)

    // ======================================================================================
    // Props — the scattered objects: shared placement, then per-type looks, then the shared
    // painterly surface + edge treatments + tree eyes.
    // ======================================================================================
    useControls('Props.Placement', {
        enabled: { value: objectParameters.enabled, onChange: setParam('objectParameters', 'enabled') },
        worldSeed: { value: objectParameters.worldSeed, step: 1, onChange: setParam('objectParameters', 'worldSeed') },
        cellSize: { value: objectParameters.cellSize, min: 2, max: 24, step: 0.5, onChange: setParam('objectParameters', 'cellSize') },
        groupJitter: { value: objectParameters.groupJitter, min: 0, max: 0.95, step: 0.01, onChange: setParam('objectParameters', 'groupJitter') },
        density: { value: objectParameters.density, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'density') },
        roadClearance: { value: objectParameters.roadClearance, min: 0, max: 10, step: 0.1, onChange: setParam('objectParameters', 'roadClearance') },
        groupScale: { value: objectParameters.groupScale, min: 0.2, max: 3, step: 0.05, onChange: setParam('objectParameters', 'groupScale') },
        minObjectSpacing: { value: objectParameters.minObjectSpacing, min: 0.05, max: 3, step: 0.05, onChange: setParam('objectParameters', 'minObjectSpacing') },
        fadeOffset: { value: objectParameters.fadeOffset, min: 0, max: 8, step: 0.1, onChange: setParam('objectParameters', 'fadeOffset') },
        grassFadeDistance: { value: objectParameters.grassFadeDistance, min: 0, max: 5, step: 0.05, onChange: setParam('objectParameters', 'grassFadeDistance') },
        grassLean: { value: objectParameters.grassLean, min: 0, max: 2, step: 0.05, onChange: setParam('objectParameters', 'grassLean') },
    }, { collapsed: true })

    useControls('Props.Trees', {
        treeSize: { value: objectParameters.treeSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'treeSize') },
        treeYOffset: { value: objectParameters.treeYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'treeYOffset') },
        treeColor: { value: objectParameters.treeColor, onChange: setParam('objectParameters', 'treeColor') },
        treeTrunkColor: { value: objectParameters.treeTrunkColor, onChange: setParam('objectParameters', 'treeTrunkColor') },
        treeColorVariation: { value: objectParameters.treeColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'treeColorVariation') },
    }, { collapsed: true })

    useControls('Props.Stones', {
        stoneSize: { value: objectParameters.stoneSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'stoneSize') },
        stoneYOffset: { value: objectParameters.stoneYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'stoneYOffset') },
        stoneTint: { value: objectParameters.stoneTint, onChange: setParam('objectParameters', 'stoneTint') },
        stoneColorVariation: { value: objectParameters.stoneColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'stoneColorVariation') },
        stoneGradientEnabled: { value: objectParameters.stoneGradientEnabled, label: 'stoneGradient', onChange: setParam('objectParameters', 'stoneGradientEnabled') },
        stoneGradientDark: { value: objectParameters.stoneGradientDark, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'stoneGradientDark') },
        stoneGradientColor: { value: objectParameters.stoneGradientColor, onChange: setParam('objectParameters', 'stoneGradientColor') },
        stoneGradientColorStrength: { value: objectParameters.stoneGradientColorStrength, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'stoneGradientColorStrength') },
        stoneGradientHeight: { value: objectParameters.stoneGradientHeight, min: 0.05, max: 1.5, step: 0.01, onChange: setParam('objectParameters', 'stoneGradientHeight') },
    }, { collapsed: true })

    useControls('Props.Mushrooms', {
        mushroomSize: { value: objectParameters.mushroomSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomSize') },
        mushroomYOffset: { value: objectParameters.mushroomYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'mushroomYOffset') },
        mushroomCapColor: { value: objectParameters.mushroomCapColor, onChange: setParam('objectParameters', 'mushroomCapColor') },
        mushroomLegColor: { value: objectParameters.mushroomLegColor, onChange: setParam('objectParameters', 'mushroomLegColor') },
        mushroomColorVariation: { value: objectParameters.mushroomColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'mushroomColorVariation') },
        mushroomLegColorVariation: { value: objectParameters.mushroomLegColorVariation, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'mushroomLegColorVariation') },
        mushroomGrassRadius: { value: objectParameters.mushroomGrassRadius, min: 0.1, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassRadius') },
        mushroomGrassFade: { value: objectParameters.mushroomGrassFade, min: 0, max: 5, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassFade') },
        mushroomGrassLean: { value: objectParameters.mushroomGrassLean, min: 0, max: 2, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassLean') },
        mushroomWiggleRadius: { value: objectParameters.mushroomWiggleRadius, min: 0, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomWiggleRadius') },
        mushroomWiggleAngle: { value: objectParameters.mushroomWiggleAngle, min: 0, max: 1.2, step: 0.02, onChange: setParam('objectParameters', 'mushroomWiggleAngle') },
        mushroomWiggleSpeed: { value: objectParameters.mushroomWiggleSpeed, min: 1, max: 30, step: 0.5, onChange: setParam('objectParameters', 'mushroomWiggleSpeed') },
        mushroomWiggleDecay: { value: objectParameters.mushroomWiggleDecay, min: 0.5, max: 10, step: 0.1, onChange: setParam('objectParameters', 'mushroomWiggleDecay') },
        mushroomLitBoost: { value: objectParameters.mushroomLitBoost, min: 0, max: 3, step: 0.05, onChange: setParam('objectParameters', 'mushroomLitBoost') },
        mushroomSoundVolume: { value: objectParameters.mushroomSoundVolume, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'mushroomSoundVolume') },
    }, { collapsed: true })

    // The shared triplanar painterly brush on every prop's surface.
    useControls('Props.Surface', {
        painterly: { value: objectParameters.painterlyEnabled, onChange: setParam('objectParameters', 'painterlyEnabled') },
        painterlyTexture: { value: objectParameters.textureName, options: PAINTERY_TEXTURE_IDS, onChange: setParam('objectParameters', 'textureName') },
        painterlyScale: { value: objectParameters.painterlyScale, min: 0, max: 0.5, step: 0.01, onChange: setParam('objectParameters', 'painterlyScale') },
        painterlyContrast: { value: objectParameters.painterlyContrast, min: 0, max: 10, step: 0.01, onChange: setParam('objectParameters', 'painterlyContrast') },
        painterlyBrightness: { value: objectParameters.painterlyBrightness, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'painterlyBrightness') },
        painterlyTint: { value: objectParameters.painterlyColorStrength, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'painterlyColorStrength') },
    }, { collapsed: true })

    // Painterly silhouette edge — applied only to the tree leaves (canopy).
    useControls('Props.Leaves Edge', {
        enabled: { value: edgeParameters.enabled, onChange: setParam('edgeParameters', 'enabled') },
        mode: { value: edgeParameters.mode, options: ['Dither', 'Alpha'], onChange: setParam('edgeParameters', 'mode') },
        color: { value: edgeParameters.color, onChange: setParam('edgeParameters', 'color') },
        tint: { value: edgeParameters.tint, min: 0, max: 1, step: 0.01, onChange: setParam('edgeParameters', 'tint') },
        width: { value: edgeParameters.width, min: 0, max: 40, step: 0.5, onChange: setParam('edgeParameters', 'width') },
        bias: { value: edgeParameters.bias, min: 0, max: 2, step: 0.01, onChange: setParam('edgeParameters', 'bias') },
        softness: { value: edgeParameters.softness, min: 0, max: 1, step: 0.01, onChange: setParam('edgeParameters', 'softness') },
        noiseScale: { value: edgeParameters.noiseScale, min: 0.02, max: 4, step: 0.02, onChange: setParam('edgeParameters', 'noiseScale') },
        sharpness: { value: edgeParameters.sharpness, min: 0.2, max: 8, step: 0.1, onChange: setParam('edgeParameters', 'sharpness') },
    }, { collapsed: true })

    // Fresnel colour rim on the hard-surface props (trunks / stones / mushrooms / music stones).
    useControls('Props.Rim Light', {
        enabled: { value: propRimParameters.enabled, onChange: setParam('propRimParameters', 'enabled') },
        stoneColor: { value: propRimParameters.stoneColor, onChange: setParam('propRimParameters', 'stoneColor') },
        trunkColor: { value: propRimParameters.trunkColor, onChange: setParam('propRimParameters', 'trunkColor') },
        mushroomColor: { value: propRimParameters.mushroomColor, onChange: setParam('propRimParameters', 'mushroomColor') },
        musicStoneColor: { value: propRimParameters.musicStoneColor, onChange: setParam('propRimParameters', 'musicStoneColor') },
        strength: { value: propRimParameters.strength, min: 0, max: 3, step: 0.01, onChange: setParam('propRimParameters', 'strength') },
        power: { value: propRimParameters.power, min: 0.2, max: 8, step: 0.1, onChange: setParam('propRimParameters', 'power') },
    }, { collapsed: true })

    useControls('Props.Trees.Tree Eyes', {
        planesPerTree: { value: treeEyesParameters.planesPerTree, min: 0, max: 11, step: 1, onChange: setParam('treeEyesParameters', 'planesPerTree') },
        // Camera-facing fade (transparent edge-on near 90° + on back-facing planes).
        facingThreshold: { value: treeEyesParameters.facingThreshold, min: 0, max: 0.95, step: 0.01, onChange: setParam('treeEyesParameters', 'facingThreshold') },
        facingFalloff: { value: treeEyesParameters.facingFalloff, min: 0.02, max: 0.9, step: 0.01, onChange: setParam('treeEyesParameters', 'facingFalloff') },
        edgeSoftness: { value: treeEyesParameters.edgeSoftness, min: 0.005, max: 0.3, step: 0.005, onChange: setParam('treeEyesParameters', 'edgeSoftness') },
        Eye: folder(
            {
                eyeColor: { value: treeEyesParameters.eyeColor, onChange: setParam('treeEyesParameters', 'eyeColor') },
                eyeRadius: { value: treeEyesParameters.eyeRadius, min: 0.02, max: 0.5, step: 0.005, onChange: setParam('treeEyesParameters', 'eyeRadius') },
                eyeSpacing: { value: treeEyesParameters.eyeSpacing, min: 0, max: 0.9, step: 0.005, onChange: setParam('treeEyesParameters', 'eyeSpacing') },
                eyeOffsetY: { value: treeEyesParameters.eyeOffsetY, min: -0.4, max: 0.4, step: 0.005, onChange: setParam('treeEyesParameters', 'eyeOffsetY') },
                eyeAspect: { value: treeEyesParameters.eyeAspect, min: 0.4, max: 1.6, step: 0.01, onChange: setParam('treeEyesParameters', 'eyeAspect') },
                eyeNoiseScale: { value: treeEyesParameters.eyeNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('treeEyesParameters', 'eyeNoiseScale') },
                eyeNoiseStrength: { value: treeEyesParameters.eyeNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('treeEyesParameters', 'eyeNoiseStrength') },
            },
            { collapsed: true }
        ),
        Pupil: folder(
            {
                pupilColor: { value: treeEyesParameters.pupilColor, onChange: setParam('treeEyesParameters', 'pupilColor') },
                pupilWidth: { value: treeEyesParameters.pupilWidth, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('treeEyesParameters', 'pupilWidth') },
                pupilHeight: { value: treeEyesParameters.pupilHeight, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('treeEyesParameters', 'pupilHeight') },
                pupilNoiseScale: { value: treeEyesParameters.pupilNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('treeEyesParameters', 'pupilNoiseScale') },
                pupilNoiseStrength: { value: treeEyesParameters.pupilNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('treeEyesParameters', 'pupilNoiseStrength') },
            },
            { collapsed: true }
        ),
        'Blink & Glance': folder(
            {
                blinkInterval: { value: treeEyesParameters.blinkInterval, min: 0.5, max: 12, step: 0.1, onChange: setParam('treeEyesParameters', 'blinkInterval') },
                blinkWidth: { value: treeEyesParameters.blinkWidth, min: 0.02, max: 0.4, step: 0.01, onChange: setParam('treeEyesParameters', 'blinkWidth') },
                lookInterval: { value: treeEyesParameters.lookInterval, min: 1, max: 20, step: 0.5, onChange: setParam('treeEyesParameters', 'lookInterval') },
                lookHold: { value: treeEyesParameters.lookHold, min: 0.05, max: 0.8, step: 0.05, onChange: setParam('treeEyesParameters', 'lookHold') },
                lookAmount: { value: treeEyesParameters.lookAmount, min: 0, max: 0.15, step: 0.005, onChange: setParam('treeEyesParameters', 'lookAmount') },
                lookChance: { value: treeEyesParameters.lookChance, min: 0, max: 1, step: 0.05, onChange: setParam('treeEyesParameters', 'lookChance') },
            },
            { collapsed: true }
        ),
    }, { collapsed: true })
}
