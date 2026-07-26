import { folder, useControls } from 'leva'
import { levaSync, setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import { mainCharacterMaterialGroups } from '../../config/mainCharacterMaterials.js'
import { painterlyTextureOptions, stylizedDebugModes } from '../../config/stylizedMaterialDefaults.js'

export function useCharactersControls() {
    const characterParameters = useStore((state) => state.characterParameters)
    const characterMaterialParameters = useStore((state) => state.characterMaterialParameters)
    const characterEyesParameters = useStore((state) => state.characterEyesParameters)
    const sheepParameters = useStore((state) => state.sheepParameters)
    const sheepMaterialParameters = useStore((state) => state.sheepMaterialParameters)

    const setCharacterMaterialParam = (slotId, param) => (value, _, context) => {
        if (levaSync.active || context?.initial) return

        useStore.setState((state) => ({
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

    const setSheepMaterialParam = (music, groupId) => (value, _, context) => {
        if (levaSync.active || context?.initial) return

        useStore.setState((state) => ({
            sheepMaterialParameters: {
                ...state.sheepMaterialParameters,
                characters: {
                    ...state.sheepMaterialParameters.characters,
                    [music]: {
                        ...state.sheepMaterialParameters.characters[music],
                        [groupId]: { ...state.sheepMaterialParameters.characters[music][groupId], baseColor: value },
                    },
                },
            },
        }))
    }

    // ======================================================================================
    // Characters — the hero (model / material / eyes) and the sheep companions.
    // ======================================================================================
    useControls('Characters.Hero', {
        modelScale: { value: characterParameters.modelScale, min: 0.05, max: 2.0, step: 0.01, onChange: setParam('characterParameters', 'modelScale') },
        modelYOffset: { value: characterParameters.modelYOffset, min: -2.0, max: 2.0, step: 0.01, onChange: setParam('characterParameters', 'modelYOffset') },
        rotationOffset: { value: characterParameters.rotationOffset, min: -Math.PI, max: Math.PI, step: 0.01, onChange: setParam('characterParameters', 'rotationOffset') },
        idleTimeScale: { value: characterParameters.idleTimeScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('characterParameters', 'idleTimeScale') },
        runTimeScale: { value: characterParameters.runTimeScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('characterParameters', 'runTimeScale') },
        runBlendInSpeed: { value: characterParameters.runBlendInSpeed, min: 1, max: 30, step: 0.5, onChange: setParam('characterParameters', 'runBlendInSpeed') },
        runBlendOutSpeed: { value: characterParameters.runBlendOutSpeed, min: 1, max: 30, step: 0.5, onChange: setParam('characterParameters', 'runBlendOutSpeed') },
    })

    useControls('Characters.Hero Material', {
        debug: { value: characterMaterialParameters.debugMode, options: stylizedDebugModes, onChange: setParam('characterMaterialParameters', 'debugMode') },
        painterly: { value: characterMaterialParameters.painterlyEnabled, onChange: setParam('characterMaterialParameters', 'painterlyEnabled') },
        pTexture: { value: characterMaterialParameters.painterlyTexture, options: painterlyTextureOptions, onChange: setParam('characterMaterialParameters', 'painterlyTexture') },
        pScale: { value: characterMaterialParameters.painterlyScale, min: 0, max: 1, step: 0.01, onChange: setParam('characterMaterialParameters', 'painterlyScale') },
        pContrast: { value: characterMaterialParameters.painterlyContrast, min: 0, max: 10, step: 0.01, onChange: setParam('characterMaterialParameters', 'painterlyContrast') },
        pBrightness: { value: characterMaterialParameters.painterlyBrightnessVariation, min: 0, max: 1, step: 0.01, onChange: setParam('characterMaterialParameters', 'painterlyBrightnessVariation') },
        ...mainCharacterMaterialGroups.reduce((controls, group) => {
            controls[`${group.label} Base`] = {
                value: characterMaterialParameters.materials[group.id]?.baseColor ?? group.baseColor,
                onChange: setCharacterMaterialParam(group.id, 'baseColor'),
            }
            return controls
        }, {}),
    })

    useControls('Characters.Hero Eyes', {
        enabled: { value: characterEyesParameters.enabled, onChange: setParam('characterEyesParameters', 'enabled') },
        edgeSoftness: { value: characterEyesParameters.edgeSoftness, min: 0.005, max: 0.3, step: 0.005, onChange: setParam('characterEyesParameters', 'edgeSoftness') },
        // Eyeball (yellow circle, big wobbly border) — laid out in the head's second UV (uv1).
        Eye: folder(
            {
                eyeColor: { value: characterEyesParameters.eyeColor, onChange: setParam('characterEyesParameters', 'eyeColor') },
                eyeRadius: { value: characterEyesParameters.eyeRadius, min: 0.02, max: 0.5, step: 0.005, onChange: setParam('characterEyesParameters', 'eyeRadius') },
                eyeSpacing: { value: characterEyesParameters.eyeSpacing, min: 0, max: 0.9, step: 0.005, onChange: setParam('characterEyesParameters', 'eyeSpacing') },
                eyeOffsetY: { value: characterEyesParameters.eyeOffsetY, min: -0.4, max: 0.4, step: 0.005, onChange: setParam('characterEyesParameters', 'eyeOffsetY') },
                eyeAspect: { value: characterEyesParameters.eyeAspect, min: 0.4, max: 1.6, step: 0.01, onChange: setParam('characterEyesParameters', 'eyeAspect') },
                eyeNoiseScale: { value: characterEyesParameters.eyeNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('characterEyesParameters', 'eyeNoiseScale') },
                eyeNoiseStrength: { value: characterEyesParameters.eyeNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('characterEyesParameters', 'eyeNoiseStrength') },
            },
            { collapsed: true }
        ),
        // Pupil (squished ellipse, perlin border).
        Pupil: folder(
            {
                pupilColor: { value: characterEyesParameters.pupilColor, onChange: setParam('characterEyesParameters', 'pupilColor') },
                pupilWidth: { value: characterEyesParameters.pupilWidth, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilWidth') },
                pupilHeight: { value: characterEyesParameters.pupilHeight, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilHeight') },
                pupilOffsetX: { value: characterEyesParameters.pupilOffsetX, min: -0.15, max: 0.15, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilOffsetX') },
                pupilOffsetY: { value: characterEyesParameters.pupilOffsetY, min: -0.15, max: 0.15, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilOffsetY') },
                pupilNoiseScale: { value: characterEyesParameters.pupilNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('characterEyesParameters', 'pupilNoiseScale') },
                pupilNoiseStrength: { value: characterEyesParameters.pupilNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('characterEyesParameters', 'pupilNoiseStrength') },
            },
            { collapsed: true }
        ),
        Blink: folder(
            {
                blinkInterval: { value: characterEyesParameters.blinkInterval, min: 0.3, max: 10, step: 0.1, onChange: setParam('characterEyesParameters', 'blinkInterval') },
                blinkIntervalRandom: { value: characterEyesParameters.blinkIntervalRandom, min: 0, max: 8, step: 0.1, onChange: setParam('characterEyesParameters', 'blinkIntervalRandom') },
                blinkDuration: { value: characterEyesParameters.blinkDuration, min: 0.04, max: 1, step: 0.01, onChange: setParam('characterEyesParameters', 'blinkDuration') },
            },
            { collapsed: true }
        ),
        // Occasional left/right pupil glance (rarer than blinks).
        Glance: folder(
            {
                pupilLook: { value: characterEyesParameters.pupilLook, onChange: setParam('characterEyesParameters', 'pupilLook') },
                pupilLookAmount: { value: characterEyesParameters.pupilLookAmount, min: 0, max: 0.15, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilLookAmount') },
                pupilLookInterval: { value: characterEyesParameters.pupilLookInterval, min: 1, max: 20, step: 0.5, onChange: setParam('characterEyesParameters', 'pupilLookInterval') },
                pupilLookIntervalRandom: { value: characterEyesParameters.pupilLookIntervalRandom, min: 0, max: 15, step: 0.5, onChange: setParam('characterEyesParameters', 'pupilLookIntervalRandom') },
                pupilLookHold: { value: characterEyesParameters.pupilLookHold, min: 0.1, max: 4, step: 0.1, onChange: setParam('characterEyesParameters', 'pupilLookHold') },
                pupilLookSpeed: { value: characterEyesParameters.pupilLookSpeed, min: 1, max: 20, step: 0.5, onChange: setParam('characterEyesParameters', 'pupilLookSpeed') },
            },
            { collapsed: true }
        ),
    })

    const sheepChars = sheepMaterialParameters.characters
    useControls('Characters.Sheep', {
        // Per-companion colours. char1 = piano (1st), char2 = drums (2nd), char3 = winds (3rd).
        Colours: folder(
            {
                char1Body: { value: sheepChars.piano.orange.baseColor, onChange: setSheepMaterialParam('piano', 'orange') },
                char1Wool: { value: sheepChars.piano.white.baseColor, onChange: setSheepMaterialParam('piano', 'white') },
                char1Leg: { value: sheepChars.piano.brown.baseColor, onChange: setSheepMaterialParam('piano', 'brown') },
                char2Body: { value: sheepChars.drums.orange.baseColor, onChange: setSheepMaterialParam('drums', 'orange') },
                char2Wool: { value: sheepChars.drums.white.baseColor, onChange: setSheepMaterialParam('drums', 'white') },
                char2Leg: { value: sheepChars.drums.brown.baseColor, onChange: setSheepMaterialParam('drums', 'brown') },
                char3Body: { value: sheepChars.winds.orange.baseColor, onChange: setSheepMaterialParam('winds', 'orange') },
                char3Wool: { value: sheepChars.winds.white.baseColor, onChange: setSheepMaterialParam('winds', 'white') },
                char3Leg: { value: sheepChars.winds.brown.baseColor, onChange: setSheepMaterialParam('winds', 'brown') },
            },
            { collapsed: true }
        ),
        'Model & Anim': folder(
            {
                modelScale: { value: sheepParameters.modelScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'modelScale') },
                modelYaw: { value: sheepParameters.modelYaw, min: -180, max: 180, step: 5, onChange: setParam('sheepParameters', 'modelYaw') },
                yOffset: { value: sheepParameters.yOffset, min: -1, max: 1, step: 0.02, onChange: setParam('sheepParameters', 'yOffset') },
                idleTimeScale: { value: sheepParameters.idleTimeScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'idleTimeScale') },
                runTimeScale: { value: sheepParameters.runTimeScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'runTimeScale') },
                runBlendInSpeed: { value: sheepParameters.runBlendInSpeed, min: 1, max: 20, step: 0.5, onChange: setParam('sheepParameters', 'runBlendInSpeed') },
                runBlendOutSpeed: { value: sheepParameters.runBlendOutSpeed, min: 1, max: 20, step: 0.5, onChange: setParam('sheepParameters', 'runBlendOutSpeed') },
            },
            { collapsed: true }
        ),
        // The fur "dance": per-scale twist driven by the motion bones.
        Wobble: folder(
            {
                swayAxis: { value: sheepParameters.swayAxis, options: ['X', 'Y', 'Z'], onChange: setParam('sheepParameters', 'swayAxis') },
                swayGain: { value: sheepParameters.swayGain, min: 0, max: 40, step: 0.5, onChange: setParam('sheepParameters', 'swayGain') },
                swayDamp: { value: sheepParameters.swayDamp, min: 1, max: 30, step: 0.5, onChange: setParam('sheepParameters', 'swayDamp') },
                swayMax: { value: sheepParameters.swayMax, min: 0, max: 1.6, step: 0.05, onChange: setParam('sheepParameters', 'swayMax') },
                scaleColorVariation: { value: sheepParameters.scaleColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('sheepParameters', 'scaleColorVariation') },
            },
            { collapsed: true }
        ),
        Follow: folder(
            {
                followLead: { value: sheepParameters.followLead, min: 0.5, max: 8, step: 0.1, onChange: setParam('sheepParameters', 'followLead') },
                followGap: { value: sheepParameters.followGap, min: 0.5, max: 8, step: 0.1, onChange: setParam('sheepParameters', 'followGap') },
                // Sheep see-through size is the SHARED Debug → See-Through worldRadius (common with the
                // hero); only the per-sheep head-anchor height lives here.
                seeThroughHeight: { value: sheepParameters.seeThroughHeight, min: 0, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'seeThroughHeight') },
            },
            { collapsed: true }
        ),
    })
}
