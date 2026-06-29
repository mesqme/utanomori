import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { button, levaStore, useControls } from 'leva'
import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import { seeThrough, applySeeThroughParameters } from './utils/seeThrough.js'
import { updateEdgeUniforms } from '../materials/edgeUniforms.js'
import { mainCharacterMaterialGroups } from '../config/mainCharacterMaterials.js'
import { defaultSceneStyle } from '../config/sceneStyles.js'
import { painterlyTextureOptions, stylizedDebugModes } from '../config/stylizedMaterialDefaults.js'
import { PAINTERY_TEXTURE_IDS } from '../config/painteryTextures.js'

const LEVA_SECTION_PATHS = Object.freeze({
    Terrain: {
        groundTexture: 'groundTextureEnabled',
        color: 'color',
        baseBrightness: 'baseBrightness',
        segments: 'segments',
        scale: 'scale',
        amplitude: 'amplitude',
        groundTextureScale: 'groundTextureScale',
        groundTextureContrast: 'groundTextureContrast',
        chunkSize: 'chunkSize',
        shadowRadius: 'shadowRadius',
        shadowSoftness: 'shadowSoftness',
        shadowDarkness: 'shadowDarkness',
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
        painterlyTexture: 'textureName',
        worldSeed: 'worldSeed',
        cellSize: 'cellSize',
        groupJitter: 'groupJitter',
        density: 'density',
        roadClearance: 'roadClearance',
        groupScale: 'groupScale',
        minObjectSpacing: 'minObjectSpacing',
        treeSize: 'treeSize',
        treeYOffset: 'treeYOffset',
        treeColor: 'treeColor',
        treeTrunkColor: 'treeTrunkColor',
        treeWindStrength: 'treeWindStrength',
        treeWindSpeed: 'treeWindSpeed',
        treeWindGust: 'treeWindGust',
        stoneSize: 'stoneSize',
        stoneYOffset: 'stoneYOffset',
        stoneTint: 'stoneTint',
        mushroomSize: 'mushroomSize',
        mushroomYOffset: 'mushroomYOffset',
        mushroomCapColor: 'mushroomCapColor',
        mushroomLegColor: 'mushroomLegColor',
        stoneColorVariation: 'stoneColorVariation',
        mushroomColorVariation: 'mushroomColorVariation',
        treeColorVariation: 'treeColorVariation',
        mushroomGrassRadius: 'mushroomGrassRadius',
        mushroomGrassFade: 'mushroomGrassFade',
        mushroomGrassLean: 'mushroomGrassLean',
        mushroomWiggleRadius: 'mushroomWiggleRadius',
        mushroomWiggleAngle: 'mushroomWiggleAngle',
        mushroomWiggleSpeed: 'mushroomWiggleSpeed',
        mushroomWiggleDecay: 'mushroomWiggleDecay',
        grassFadeDistance: 'grassFadeDistance',
        grassLean: 'grassLean',
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
        backgroundColor: 'backgroundColor',
        gradientTop: 'gradientTopColor',
        horizonColor: 'horizonColor',
        gradientIntensity: 'gradientIntensity',
        gradientHeight: 'gradientHeight',
        gradientPower: 'gradientPower',
        textureEnabled: 'textureEnabled',
        colorMode: 'colorMode',
        textureSize: 'textureSize',
        textureLayer2: 'textureLayer2',
        textureYawParallax: 'textureYawParallax',
        texturePitchParallax: 'texturePitchParallax',
        textureContrast: 'textureContrast',
        textureBrightness: 'textureBrightness',
        textureMix: 'textureMixIntensity',
        starsEnabled: 'starsEnabled',
        starStyle: 'starStyle',
        starCellSize: 'starCellSize',
        starDensity: 'starDensity',
        starSize: 'starSize',
        starBrightness: 'starBrightness',
        starTwinkle: 'starTwinkleSpeed',
        starRays: 'starRays',
        starColor: 'starColor',
        starsFadeStart: 'starsFadeStart',
        starsFadeWidth: 'starsFadeWidth',
        constellations: 'constellationsEnabled',
        constellationDensity: 'constellationDensity',
        constellationBrightness: 'constellationBrightness',
        constellationWidth: 'constellationWidth',
        skyRotation: 'rotationEnabled',
        skyRotationSpeed: 'rotationSpeed',
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
    'Leaves Edge': {
        enabled: 'enabled',
        mode: 'mode',
        color: 'color',
        tint: 'tint',
        width: 'width',
        bias: 'bias',
        softness: 'softness',
        noiseScale: 'noiseScale',
        sharpness: 'sharpness',
    },
    'Props Edge': {
        enabled: 'enabled',
        color: 'color',
        strength: 'strength',
        power: 'power',
    },
    'Music Stones': {
        note1: 'color0',
        note2: 'color1',
        note3: 'color2',
        note4: 'color3',
        note5: 'color4',
        note6: 'color5',
        note7: 'color6',
        radius: 'radius',
        scale: 'scale',
        yOffset: 'yOffset',
        hoverHeight: 'hoverHeight',
        bobAmount: 'bobAmount',
        bobSpeed: 'bobSpeed',
        flashBoost: 'flashBoost',
        hoverBoost: 'hoverBoost',
        flashDuration: 'flashDuration',
        listenTempo: 'listenTempo',
        staggerDelay: 'staggerDelay',
        scaleInDuration: 'scaleInDuration',
        scaleOutDuration: 'scaleOutDuration',
        grassFade: 'grassFade',
        cameraHeight: 'cameraHeight',
        cameraDistance: 'cameraDistance',
        cameraLerp: 'cameraLerp',
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
    'Loader Debug': {
        enabled: 'enabled',
        targetX: 'targetX',
        targetZ: 'targetZ',
        step: 'nudgeStep',
        circleRadius: 'circleRadius',
        ringWidth: 'ringWidth',
        cameraY: 'cameraHeight',
        cssA: 'cssColorA',
        cssB: 'cssColorB',
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
    values['See-Through.grassEnabled'] = seeThrough.grassEnabled
    values['See-Through.worldRadius'] = seeThrough.worldRadius
    values['See-Through.inner'] = seeThrough.inner
    values['See-Through.depthBias'] = seeThrough.depthBias
    values['See-Through.opacityIntensity'] = seeThrough.opacityIntensity
    values['See-Through.textureContrast'] = seeThrough.textureContrast
}

export default function Controls() {
    const syncingLeva = useRef(false)
    const terrainParameters = useStore((state) => state.terrainParameters)
    const grassParameters = useStore((state) => state.grassParameters)
    const grassPatchParameters = useStore((state) => state.grassPatchParameters)
    const roadParameters = useStore((state) => state.roadParameters)
    const objectParameters = useStore((state) => state.objectParameters)
    const backgroundParameters = useStore((state) => state.backgroundParameters)
    const windParameters = useStore((state) => state.windParameters)
    const lanternGroundLightParameters = useStore((state) => state.lanternGroundLightParameters)
    const lanternFireParameters = useStore((state) => state.lanternFireParameters)
    const lanternGrassParameters = useStore((state) => state.lanternGrassParameters)
    const borderParameters = useStore((state) => state.borderParameters)
    const ditheringParameters = useStore((state) => state.ditheringParameters)
    const painterlyPostParameters = useStore((state) => state.painterlyPostParameters)
    const characterParameters = useStore((state) => state.characterParameters)
    const characterMaterialParameters = useStore((state) => state.characterMaterialParameters)
    const cameraParameters = useStore((state) => state.cameraParameters)
    const loaderDebugParameters = useStore((state) => state.loaderDebugParameters)
    const introCameraParameters = useStore((state) => state.introCameraParameters)
    const replayIntro = useStore((state) => state.replayIntro)
    const arrowParameters = useStore((state) => state.arrowParameters)
    const songGameParameters = useStore((state) => state.songGameParameters)
    const musicStoneParameters = useStore((state) => state.musicStoneParameters)
    const musicParameters = useStore((state) => state.musicParameters)
    const ambientSoundParameters = useStore((state) => state.ambientSoundParameters)
    const characterEyesParameters = useStore((state) => state.characterEyesParameters)
    const treeEyesParameters = useStore((state) => state.treeEyesParameters)
    const sheepParameters = useStore((state) => state.sheepParameters)
    const sheepMaterialParameters = useStore((state) => state.sheepMaterialParameters)
    const gameUiParameters = useStore((state) => state.gameUiParameters)
    const painteryTextureParameters = useStore((state) => state.painteryTextureParameters)
    const edgeParameters = useStore((state) => state.edgeParameters)
    const propRimParameters = useStore((state) => state.propRimParameters)
    const setDpr = useThree((state) => state.setDpr)
    const perfVisible = useStore((state) => state.perfVisible)
    const backgroundWireframe = useStore((state) => state.backgroundWireframe)

    const setParam = (section, param) => (value, _, context) => {
        if (syncingLeva.current || context?.initial) return

        useStore.setState((state) => ({
            [section]: {
                ...state[section],
                [param]: value,
            },
        }))
    }

    const setCharacterMaterialParam = (slotId, param) => (value, _, context) => {
        if (syncingLeva.current || context?.initial) return

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
        if (syncingLeva.current || context?.initial) return

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

    useEffect(() => {
        const values = {
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
        addLevaSectionValues(values, 'Leaves Edge', edgeParameters, LEVA_SECTION_PATHS['Leaves Edge'])
        addLevaSectionValues(values, 'Character', characterParameters, LEVA_SECTION_PATHS.Character)
        addLevaSectionValues(values, 'Character Stylized', characterMaterialParameters, LEVA_SECTION_PATHS['Character Stylized'])
        addLevaSectionValues(values, 'Loader Debug', loaderDebugParameters, LEVA_SECTION_PATHS['Loader Debug'])

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
    }, [])

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
        addLevaSectionValues(values, 'Loader Debug', loaderDebugParameters, LEVA_SECTION_PATHS['Loader Debug'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [loaderDebugParameters])

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

    useEffect(() => {
        const values = {}
        addLevaSectionValues(values, 'Props Edge', propRimParameters, LEVA_SECTION_PATHS['Props Edge'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [propRimParameters])

    useEffect(() => {
        const params = defaultSceneStyle.seeThroughParameters
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
    }, [])

    useControls('General', {
        toCredits: button(() => {
            // Dev: gather the full party behind the hero and jump straight into the credits run.
            useCompanions.getState().fillParty()
            usePhases.getState().setCreditsShown(true) // don't auto-retrigger on Continue
            usePhases.getState().setPhase(PHASES.credits)
        }),
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
        wordStagger: { value: gameUiParameters.wordStagger, min: 0, max: 300, step: 5, onChange: setParam('gameUiParameters', 'wordStagger') },
        wordFade: { value: gameUiParameters.wordFade, min: 80, max: 1200, step: 10, onChange: setParam('gameUiParameters', 'wordFade') },
    })

    useControls('See-Through', {
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

    // Painterly silhouette edge — applied only to the tree leaves (canopy).
    useControls('Leaves Edge', {
        enabled: { value: edgeParameters.enabled, onChange: setParam('edgeParameters', 'enabled') },
        mode: { value: edgeParameters.mode, options: ['Dither', 'Alpha'], onChange: setParam('edgeParameters', 'mode') },
        color: { value: edgeParameters.color, onChange: setParam('edgeParameters', 'color') },
        tint: { value: edgeParameters.tint, min: 0, max: 1, step: 0.01, onChange: setParam('edgeParameters', 'tint') },
        width: { value: edgeParameters.width, min: 0, max: 40, step: 0.5, onChange: setParam('edgeParameters', 'width') },
        bias: { value: edgeParameters.bias, min: 0, max: 2, step: 0.01, onChange: setParam('edgeParameters', 'bias') },
        softness: { value: edgeParameters.softness, min: 0, max: 1, step: 0.01, onChange: setParam('edgeParameters', 'softness') },
        noiseScale: { value: edgeParameters.noiseScale, min: 0.02, max: 4, step: 0.02, onChange: setParam('edgeParameters', 'noiseScale') },
        sharpness: { value: edgeParameters.sharpness, min: 0.2, max: 8, step: 0.1, onChange: setParam('edgeParameters', 'sharpness') },
    })

    // Fresnel colour rim — applied to the hard-surface props (trunks / stones / mushrooms).
    useControls('Props Edge', {
        enabled: { value: propRimParameters.enabled, onChange: setParam('propRimParameters', 'enabled') },
        color: { value: propRimParameters.color, onChange: setParam('propRimParameters', 'color') },
        strength: { value: propRimParameters.strength, min: 0, max: 3, step: 0.01, onChange: setParam('propRimParameters', 'strength') },
        power: { value: propRimParameters.power, min: 0.2, max: 8, step: 0.1, onChange: setParam('propRimParameters', 'power') },
    })

    // The 7 song-mini-game stones (colours = the 7 notes) + their staging / camera tweaks.
    useControls('Music Stones', {
        note1: { value: musicStoneParameters.color0, onChange: setParam('musicStoneParameters', 'color0') },
        note2: { value: musicStoneParameters.color1, onChange: setParam('musicStoneParameters', 'color1') },
        note3: { value: musicStoneParameters.color2, onChange: setParam('musicStoneParameters', 'color2') },
        note4: { value: musicStoneParameters.color3, onChange: setParam('musicStoneParameters', 'color3') },
        note5: { value: musicStoneParameters.color4, onChange: setParam('musicStoneParameters', 'color4') },
        note6: { value: musicStoneParameters.color5, onChange: setParam('musicStoneParameters', 'color5') },
        note7: { value: musicStoneParameters.color6, onChange: setParam('musicStoneParameters', 'color6') },
        radius: { value: musicStoneParameters.radius, min: 1, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'radius') },
        scale: { value: musicStoneParameters.scale, min: 0.1, max: 3, step: 0.05, onChange: setParam('musicStoneParameters', 'scale') },
        yOffset: { value: musicStoneParameters.yOffset, min: -2, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'yOffset') },
        hoverHeight: { value: musicStoneParameters.hoverHeight, min: 0, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'hoverHeight') },
        bobAmount: { value: musicStoneParameters.bobAmount, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'bobAmount') },
        bobSpeed: { value: musicStoneParameters.bobSpeed, min: 0, max: 5, step: 0.05, onChange: setParam('musicStoneParameters', 'bobSpeed') },
        floatRotate: { value: musicStoneParameters.floatRotate, onChange: setParam('musicStoneParameters', 'floatRotate') },
        floatRotateAmount: { value: musicStoneParameters.floatRotateAmount, min: 0, max: 0.6, step: 0.01, onChange: setParam('musicStoneParameters', 'floatRotateAmount') },
        flashBoost: { value: musicStoneParameters.flashBoost, min: 0, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'flashBoost') },
        hoverBoost: { value: musicStoneParameters.hoverBoost, min: 0, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'hoverBoost') },
        hoverScale: { value: musicStoneParameters.hoverScale, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'hoverScale') },
        hoverProxyRadius: { value: musicStoneParameters.hoverProxyRadius, min: 0.5, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'hoverProxyRadius') },
        flashDuration: { value: musicStoneParameters.flashDuration, min: 0.05, max: 2, step: 0.01, onChange: setParam('musicStoneParameters', 'flashDuration') },
        listenTempo: { value: musicStoneParameters.listenTempo, min: 0.5, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'listenTempo') },
        notePlayDuration: { value: musicStoneParameters.notePlayDuration, min: 0.2, max: 3, step: 0.05, onChange: setParam('musicStoneParameters', 'notePlayDuration') },
        alwaysSixNotes: { value: musicStoneParameters.alwaysSixNotes, onChange: setParam('musicStoneParameters', 'alwaysSixNotes') },
        roundClearPause: { value: musicStoneParameters.roundClearPause, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'roundClearPause') },
        countdownFrom: { value: musicStoneParameters.countdownFrom, min: 1, max: 5, step: 1, onChange: setParam('musicStoneParameters', 'countdownFrom') },
        countdownStep: { value: musicStoneParameters.countdownStep, min: 0.3, max: 1.5, step: 0.05, onChange: setParam('musicStoneParameters', 'countdownStep') },
        staggerDelay: { value: musicStoneParameters.staggerDelay, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'staggerDelay') },
        scaleInDuration: { value: musicStoneParameters.scaleInDuration, min: 0.1, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'scaleInDuration') },
        scaleOutDuration: { value: musicStoneParameters.scaleOutDuration, min: 0.1, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'scaleOutDuration') },
        grassFade: { value: musicStoneParameters.grassFade, min: 0, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'grassFade') },
        cameraHeight: { value: musicStoneParameters.cameraHeight, min: 3, max: 30, step: 0.5, onChange: setParam('musicStoneParameters', 'cameraHeight') },
        cameraDistance: { value: musicStoneParameters.cameraDistance, min: 0, max: 20, step: 0.5, onChange: setParam('musicStoneParameters', 'cameraDistance') },
        cameraLerp: { value: musicStoneParameters.cameraLerp, min: 0.5, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'cameraLerp') },
        dialogueCameraHeight: { value: musicStoneParameters.dialogueCameraHeight, min: 0.5, max: 12, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueCameraHeight') },
        dialogueCameraDistance: { value: musicStoneParameters.dialogueCameraDistance, min: 2, max: 18, step: 0.5, onChange: setParam('musicStoneParameters', 'dialogueCameraDistance') },
        dialogueTargetY: { value: musicStoneParameters.dialogueTargetY, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueTargetY') },
        pointerColor: { value: musicStoneParameters.pointerColor, onChange: setParam('musicStoneParameters', 'pointerColor') },
        pointerRadius: { value: musicStoneParameters.pointerRadius, min: 0, max: 6, step: 0.05, onChange: setParam('musicStoneParameters', 'pointerRadius') },
        seeThroughEnabled: { value: musicStoneParameters.seeThroughEnabled, onChange: setParam('musicStoneParameters', 'seeThroughEnabled') },
        seeThroughRadius: { value: musicStoneParameters.seeThroughRadius, min: 1, max: 14, step: 0.1, onChange: setParam('musicStoneParameters', 'seeThroughRadius') },
    })

    useControls('Music', {
        hearNear: { value: musicParameters.hearNear, min: 0, max: 30, step: 0.5, onChange: setParam('musicParameters', 'hearNear') },
        hearFar: { value: musicParameters.hearFar, min: 5, max: 100, step: 1, onChange: setParam('musicParameters', 'hearFar') },
        nearVolume: { value: musicParameters.nearVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'nearVolume') },
        farVolume: { value: musicParameters.farVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'farVolume') },
        distanceFalloff: { value: musicParameters.distanceFalloff, min: 1, max: 5, step: 0.1, onChange: setParam('musicParameters', 'distanceFalloff') },
        collectedVolume: { value: musicParameters.collectedVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'collectedVolume') },
        volumeLerp: { value: musicParameters.volumeLerp, min: 0.2, max: 10, step: 0.1, onChange: setParam('musicParameters', 'volumeLerp') },
    })

    useControls('Ambient SFX', {
        windVolume: { value: ambientSoundParameters.windVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'windVolume') },
        windDialogueVolume: { value: ambientSoundParameters.windDialogueVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'windDialogueVolume') },
        cicadaVolume: { value: ambientSoundParameters.cicadaVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'cicadaVolume') },
        owlVolume: { value: ambientSoundParameters.owlVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'owlVolume') },
        owlGapMin: { value: ambientSoundParameters.owlGapMin, min: 0, max: 30, step: 0.5, onChange: setParam('ambientSoundParameters', 'owlGapMin') },
        owlGapMax: { value: ambientSoundParameters.owlGapMax, min: 1, max: 60, step: 0.5, onChange: setParam('ambientSoundParameters', 'owlGapMax') },
        owlFade: { value: ambientSoundParameters.owlFade, min: 0.1, max: 5, step: 0.1, onChange: setParam('ambientSoundParameters', 'owlFade') },
        footstepGrass: { value: ambientSoundParameters.footstepGrass, onChange: setParam('ambientSoundParameters', 'footstepGrass') },
        footstepVolume: { value: ambientSoundParameters.footstepVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'footstepVolume') },
        footstepInterval: { value: ambientSoundParameters.footstepInterval, min: 0.12, max: 0.8, step: 0.01, onChange: setParam('ambientSoundParameters', 'footstepInterval') },
        footstepSpeedThreshold: { value: ambientSoundParameters.footstepSpeedThreshold, min: 0, max: 4, step: 0.05, onChange: setParam('ambientSoundParameters', 'footstepSpeedThreshold') },
        mumbleVolume: { value: ambientSoundParameters.mumbleVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'mumbleVolume') },
        sadVolume: { value: ambientSoundParameters.sadVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'sadVolume') },
        sighSound: { value: ambientSoundParameters.sighSound, options: { 'Sigh 1': 0, 'Sigh 2': 1, 'Sigh 3': 2, 'Sigh 4': 3 }, onChange: setParam('ambientSoundParameters', 'sighSound') },
        sighVolume: { value: ambientSoundParameters.sighVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'sighVolume') },
    })

    const sheepChars = sheepMaterialParameters.characters
    useControls('Sheep', {
        // Per-companion colours. char1 = piano (1st), char2 = drums (2nd), char3 = winds (3rd).
        char1Body: { value: sheepChars.piano.orange.baseColor, onChange: setSheepMaterialParam('piano', 'orange') },
        char1Wool: { value: sheepChars.piano.white.baseColor, onChange: setSheepMaterialParam('piano', 'white') },
        char1Leg: { value: sheepChars.piano.brown.baseColor, onChange: setSheepMaterialParam('piano', 'brown') },
        char2Body: { value: sheepChars.drums.orange.baseColor, onChange: setSheepMaterialParam('drums', 'orange') },
        char2Wool: { value: sheepChars.drums.white.baseColor, onChange: setSheepMaterialParam('drums', 'white') },
        char2Leg: { value: sheepChars.drums.brown.baseColor, onChange: setSheepMaterialParam('drums', 'brown') },
        char3Body: { value: sheepChars.winds.orange.baseColor, onChange: setSheepMaterialParam('winds', 'orange') },
        char3Wool: { value: sheepChars.winds.white.baseColor, onChange: setSheepMaterialParam('winds', 'white') },
        char3Leg: { value: sheepChars.winds.brown.baseColor, onChange: setSheepMaterialParam('winds', 'brown') },
        modelScale: { value: sheepParameters.modelScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'modelScale') },
        modelYaw: { value: sheepParameters.modelYaw, min: -180, max: 180, step: 5, onChange: setParam('sheepParameters', 'modelYaw') },
        yOffset: { value: sheepParameters.yOffset, min: -1, max: 1, step: 0.02, onChange: setParam('sheepParameters', 'yOffset') },
        idleTimeScale: { value: sheepParameters.idleTimeScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'idleTimeScale') },
        runTimeScale: { value: sheepParameters.runTimeScale, min: 0.1, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'runTimeScale') },
        runBlendInSpeed: { value: sheepParameters.runBlendInSpeed, min: 1, max: 20, step: 0.5, onChange: setParam('sheepParameters', 'runBlendInSpeed') },
        runBlendOutSpeed: { value: sheepParameters.runBlendOutSpeed, min: 1, max: 20, step: 0.5, onChange: setParam('sheepParameters', 'runBlendOutSpeed') },
        swayAxis: { value: sheepParameters.swayAxis, options: ['X', 'Y', 'Z'], onChange: setParam('sheepParameters', 'swayAxis') },
        swayGain: { value: sheepParameters.swayGain, min: 0, max: 40, step: 0.5, onChange: setParam('sheepParameters', 'swayGain') },
        swayDamp: { value: sheepParameters.swayDamp, min: 1, max: 30, step: 0.5, onChange: setParam('sheepParameters', 'swayDamp') },
        swayMax: { value: sheepParameters.swayMax, min: 0, max: 1.6, step: 0.05, onChange: setParam('sheepParameters', 'swayMax') },
        scaleColorVariation: { value: sheepParameters.scaleColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('sheepParameters', 'scaleColorVariation') },
        followLead: { value: sheepParameters.followLead, min: 0.5, max: 8, step: 0.1, onChange: setParam('sheepParameters', 'followLead') },
        followGap: { value: sheepParameters.followGap, min: 0.5, max: 8, step: 0.1, onChange: setParam('sheepParameters', 'followGap') },
        // Sheep see-through size is now the SHARED See-Through.worldRadius (common with the hero);
        // only the per-sheep head-anchor height stays here.
        seeThroughHeight: { value: sheepParameters.seeThroughHeight, min: 0, max: 3, step: 0.05, onChange: setParam('sheepParameters', 'seeThroughHeight') },
        painterlyEnabled: { value: sheepMaterialParameters.painterlyEnabled, onChange: setParam('sheepMaterialParameters', 'painterlyEnabled') },
        painterlyBrightnessVariation: { value: sheepMaterialParameters.painterlyBrightnessVariation, min: 0, max: 1.5, step: 0.02, onChange: setParam('sheepMaterialParameters', 'painterlyBrightnessVariation') },
        painterlyScale: { value: sheepMaterialParameters.painterlyScale, min: 0.01, max: 1, step: 0.01, onChange: setParam('sheepMaterialParameters', 'painterlyScale') },
        painterlyContrast: { value: sheepMaterialParameters.painterlyContrast, min: 0.5, max: 2, step: 0.01, onChange: setParam('sheepMaterialParameters', 'painterlyContrast') },
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
        baseBrightness: {
            value: terrainParameters.baseBrightness,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('terrainParameters', 'baseBrightness'),
        },
        shadowRadius: {
            value: terrainParameters.shadowRadius,
            min: 0.2,
            max: 4,
            step: 0.05,
            onChange: setParam('terrainParameters', 'shadowRadius'),
        },
        shadowSoftness: {
            value: terrainParameters.shadowSoftness,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('terrainParameters', 'shadowSoftness'),
        },
        shadowDarkness: {
            value: terrainParameters.shadowDarkness,
            min: 0,
            max: 3,
            step: 0.05,
            onChange: setParam('terrainParameters', 'shadowDarkness'),
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
        treeSize: { value: objectParameters.treeSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'treeSize') },
        treeYOffset: { value: objectParameters.treeYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'treeYOffset') },
        treeColor: { value: objectParameters.treeColor, onChange: setParam('objectParameters', 'treeColor') },
        treeTrunkColor: { value: objectParameters.treeTrunkColor, onChange: setParam('objectParameters', 'treeTrunkColor') },
        treeWindStrength: { value: objectParameters.treeWindStrength, min: 0, max: 0.008, step: 0.0001, onChange: setParam('objectParameters', 'treeWindStrength') },
        treeWindSpeed: { value: objectParameters.treeWindSpeed, min: 0, max: 4, step: 0.05, onChange: setParam('objectParameters', 'treeWindSpeed') },
        treeWindGust: { value: objectParameters.treeWindGust, min: 0, max: 1, step: 0.02, onChange: setParam('objectParameters', 'treeWindGust') },
        stoneSize: { value: objectParameters.stoneSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'stoneSize') },
        stoneYOffset: { value: objectParameters.stoneYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'stoneYOffset') },
        stoneTint: { value: objectParameters.stoneTint, onChange: setParam('objectParameters', 'stoneTint') },
        mushroomSize: { value: objectParameters.mushroomSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomSize') },
        mushroomYOffset: { value: objectParameters.mushroomYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'mushroomYOffset') },
        mushroomCapColor: { value: objectParameters.mushroomCapColor, onChange: setParam('objectParameters', 'mushroomCapColor') },
        mushroomLegColor: { value: objectParameters.mushroomLegColor, onChange: setParam('objectParameters', 'mushroomLegColor') },
        stoneColorVariation: { value: objectParameters.stoneColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'stoneColorVariation') },
        mushroomColorVariation: { value: objectParameters.mushroomColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'mushroomColorVariation') },
        treeColorVariation: { value: objectParameters.treeColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'treeColorVariation') },
        mushroomGrassRadius: { value: objectParameters.mushroomGrassRadius, min: 0.1, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassRadius') },
        mushroomGrassFade: { value: objectParameters.mushroomGrassFade, min: 0, max: 5, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassFade') },
        mushroomGrassLean: { value: objectParameters.mushroomGrassLean, min: 0, max: 2, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassLean') },
        mushroomWiggleRadius: { value: objectParameters.mushroomWiggleRadius, min: 0, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomWiggleRadius') },
        mushroomWiggleAngle: { value: objectParameters.mushroomWiggleAngle, min: 0, max: 1.2, step: 0.02, onChange: setParam('objectParameters', 'mushroomWiggleAngle') },
        mushroomWiggleSpeed: { value: objectParameters.mushroomWiggleSpeed, min: 1, max: 30, step: 0.5, onChange: setParam('objectParameters', 'mushroomWiggleSpeed') },
        mushroomWiggleDecay: { value: objectParameters.mushroomWiggleDecay, min: 0.5, max: 10, step: 0.1, onChange: setParam('objectParameters', 'mushroomWiggleDecay') },
        grassFadeDistance: { value: objectParameters.grassFadeDistance, min: 0, max: 5, step: 0.05, onChange: setParam('objectParameters', 'grassFadeDistance') },
        grassLean: { value: objectParameters.grassLean, min: 0, max: 2, step: 0.05, onChange: setParam('objectParameters', 'grassLean') },
        painterly: {
            value: objectParameters.painterlyEnabled,
            onChange: setParam('objectParameters', 'painterlyEnabled'),
        },
        painterlyTexture: {
            value: objectParameters.textureName,
            options: PAINTERY_TEXTURE_IDS,
            onChange: setParam('objectParameters', 'textureName'),
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
            max: 10,
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

    useControls('Lantern Fire', {
        fireEnabled: {
            value: lanternFireParameters.enabled,
            onChange: setParam('lanternFireParameters', 'enabled'),
        },
        fireOffsetX: {
            value: lanternFireParameters.fireOffsetX,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'fireOffsetX'),
        },
        fireOffsetY: {
            value: lanternFireParameters.fireOffsetY,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'fireOffsetY'),
        },
        fireOffsetZ: {
            value: lanternFireParameters.fireOffsetZ,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'fireOffsetZ'),
        },
        fireBoneOffset: {
            value: lanternFireParameters.fireBoneOffset,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'fireBoneOffset'),
        },
        fireSize: {
            value: lanternFireParameters.fireSize,
            min: 0.02,
            max: 0.6,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'fireSize'),
        },
        fireCore: {
            value: lanternFireParameters.fireColorCore,
            onChange: setParam('lanternFireParameters', 'fireColorCore'),
        },
        fireEdge: {
            value: lanternFireParameters.fireColorEdge,
            onChange: setParam('lanternFireParameters', 'fireColorEdge'),
        },
        flickerSpeed: {
            value: lanternFireParameters.flickerSpeed,
            min: 0,
            max: 20,
            step: 0.1,
            onChange: setParam('lanternFireParameters', 'flickerSpeed'),
        },
        flickerAmount: {
            value: lanternFireParameters.flickerAmount,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternFireParameters', 'flickerAmount'),
        },
        glowOffsetX: {
            value: lanternFireParameters.glowOffsetX,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'glowOffsetX'),
        },
        glowOffsetY: {
            value: lanternFireParameters.glowOffsetY,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'glowOffsetY'),
        },
        glowOffsetZ: {
            value: lanternFireParameters.glowOffsetZ,
            min: -1,
            max: 1,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'glowOffsetZ'),
        },
        glowSize: {
            value: lanternFireParameters.glowSize,
            min: 0.1,
            max: 5,
            step: 0.01,
            onChange: setParam('lanternFireParameters', 'glowSize'),
        },
        glowColor: {
            value: lanternFireParameters.glowColor,
            onChange: setParam('lanternFireParameters', 'glowColor'),
        },
        glowOpacity: {
            value: lanternFireParameters.glowOpacity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternFireParameters', 'glowOpacity'),
        },
        glowRadius: {
            value: lanternFireParameters.glowRadius,
            min: 0.1,
            max: 1.5,
            step: 0.01,
            onChange: setParam('lanternFireParameters', 'glowRadius'),
        },
        glowBleed: {
            value: lanternFireParameters.glowBleed,
            min: 0,
            max: 0.6,
            step: 0.005,
            onChange: setParam('lanternFireParameters', 'glowBleed'),
        },
        glowTextureScale: {
            value: lanternFireParameters.glowTextureScale,
            min: 0.02,
            max: 5,
            step: 0.01,
            onChange: setParam('lanternFireParameters', 'glowTextureScale'),
        },
        glowFront: {
            value: lanternFireParameters.glowFront,
            min: 0,
            max: 1.5,
            step: 0.01,
            onChange: setParam('lanternFireParameters', 'glowFront'),
        },
    })

    useControls('Lantern Grass', {
        grassEnabled: {
            value: lanternGrassParameters.enabled,
            onChange: setParam('lanternGrassParameters', 'enabled'),
        },
        grassRadius: {
            value: lanternGrassParameters.radius,
            min: 0,
            max: 6,
            step: 0.05,
            onChange: setParam('lanternGrassParameters', 'radius'),
        },
        grassSoftness: {
            value: lanternGrassParameters.softness,
            min: 0,
            max: 4,
            step: 0.05,
            onChange: setParam('lanternGrassParameters', 'softness'),
        },
        grassScale: {
            value: lanternGrassParameters.scale,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternGrassParameters', 'scale'),
        },
        grassAlpha: {
            value: lanternGrassParameters.alpha,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternGrassParameters', 'alpha'),
        },
        grassColor: {
            value: lanternGrassParameters.color,
            onChange: setParam('lanternGrassParameters', 'color'),
        },
        grassColorAmount: {
            value: lanternGrassParameters.colorAmount,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('lanternGrassParameters', 'colorAmount'),
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
        backgroundColor: {
            value: backgroundParameters.backgroundColor,
            onChange: setParam('backgroundParameters', 'backgroundColor'),
        },
        gradientTop: {
            value: backgroundParameters.gradientTopColor,
            onChange: setParam('backgroundParameters', 'gradientTopColor'),
        },
        horizonColor: {
            value: backgroundParameters.horizonColor,
            onChange: setParam('backgroundParameters', 'horizonColor'),
        },
        gradientIntensity: {
            value: backgroundParameters.gradientIntensity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'gradientIntensity'),
        },
        gradientHeight: {
            value: backgroundParameters.gradientHeight,
            min: -1,
            max: 1,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'gradientHeight'),
        },
        gradientPower: {
            value: backgroundParameters.gradientPower,
            min: 0.1,
            max: 6,
            step: 0.05,
            onChange: setParam('backgroundParameters', 'gradientPower'),
        },
        textureEnabled: {
            value: backgroundParameters.textureEnabled,
            onChange: setParam('backgroundParameters', 'textureEnabled'),
        },
        colorMode: {
            value: backgroundParameters.colorMode,
            options: ['Intensity', 'Color Mix', 'Both'],
            onChange: setParam('backgroundParameters', 'colorMode'),
        },
        textureSize: {
            value: backgroundParameters.textureSize,
            min: 20,
            max: 2000,
            step: 1,
            onChange: setParam('backgroundParameters', 'textureSize'),
        },
        textureLayer2: {
            value: backgroundParameters.textureLayer2,
            min: 0,
            max: 6,
            step: 0.05,
            onChange: setParam('backgroundParameters', 'textureLayer2'),
        },
        textureYawParallax: {
            value: backgroundParameters.textureYawParallax ?? 400,
            min: -1500,
            max: 1500,
            step: 10,
            onChange: setParam('backgroundParameters', 'textureYawParallax'),
        },
        texturePitchParallax: {
            value: backgroundParameters.texturePitchParallax ?? 400,
            min: -1500,
            max: 1500,
            step: 10,
            onChange: setParam('backgroundParameters', 'texturePitchParallax'),
        },
        textureContrast: {
            value: backgroundParameters.textureContrast,
            min: 0,
            max: 6,
            step: 0.05,
            onChange: setParam('backgroundParameters', 'textureContrast'),
        },
        textureBrightness: {
            value: backgroundParameters.textureBrightness,
            min: 0,
            max: 4,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'textureBrightness'),
        },
        textureMix: {
            value: backgroundParameters.textureMixIntensity,
            min: 0,
            max: 2,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'textureMixIntensity'),
        },
        starsEnabled: {
            value: backgroundParameters.starsEnabled,
            onChange: setParam('backgroundParameters', 'starsEnabled'),
        },
        starStyle: {
            value: backgroundParameters.starStyle,
            options: ['Stylized', 'Natural'],
            onChange: setParam('backgroundParameters', 'starStyle'),
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
        starsFadeStart: {
            value: backgroundParameters.starsFadeStart,
            min: -1,
            max: 1,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'starsFadeStart'),
        },
        starsFadeWidth: {
            value: backgroundParameters.starsFadeWidth,
            min: 0.01,
            max: 1.5,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'starsFadeWidth'),
        },
        constellations: {
            value: backgroundParameters.constellationsEnabled,
            onChange: setParam('backgroundParameters', 'constellationsEnabled'),
        },
        constellationDensity: {
            value: backgroundParameters.constellationDensity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'constellationDensity'),
        },
        constellationBrightness: {
            value: backgroundParameters.constellationBrightness,
            min: 0,
            max: 3,
            step: 0.01,
            onChange: setParam('backgroundParameters', 'constellationBrightness'),
        },
        constellationWidth: {
            value: backgroundParameters.constellationWidth,
            min: 0.005,
            max: 0.2,
            step: 0.005,
            onChange: setParam('backgroundParameters', 'constellationWidth'),
        },
        skyRotation: {
            value: backgroundParameters.rotationEnabled,
            onChange: setParam('backgroundParameters', 'rotationEnabled'),
        },
        skyRotationSpeed: {
            value: backgroundParameters.rotationSpeed,
            min: -0.1,
            max: 0.1,
            step: 0.001,
            onChange: setParam('backgroundParameters', 'rotationSpeed'),
        },
    })

    useControls('Target Arrow', {
        distance: { value: arrowParameters.distance, min: 0.5, max: 12, step: 0.1, onChange: setParam('arrowParameters', 'distance') },
        yOffset: { value: arrowParameters.yOffset, min: 0, max: 4, step: 0.05, onChange: setParam('arrowParameters', 'yOffset') },
        scale: { value: arrowParameters.scale, min: 0.05, max: 2, step: 0.01, onChange: setParam('arrowParameters', 'scale') },
        modelYaw: { value: arrowParameters.modelYaw, min: 0, max: 360, step: 1, onChange: setParam('arrowParameters', 'modelYaw') },
        closeRadius: { value: arrowParameters.closeRadius, min: 0, max: 20, step: 0.1, onChange: setParam('arrowParameters', 'closeRadius') },
        closeBand: { value: arrowParameters.closeBand, min: 0.1, max: 12, step: 0.1, onChange: setParam('arrowParameters', 'closeBand') },
        overheadHeight: { value: arrowParameters.overheadHeight, min: 0, max: 8, step: 0.1, onChange: setParam('arrowParameters', 'overheadHeight') },
        spinSpeed: { value: arrowParameters.spinSpeed, min: 0, max: 8, step: 0.05, onChange: setParam('arrowParameters', 'spinSpeed') },
        floatAmount: { value: arrowParameters.floatAmount, min: 0, max: 2, step: 0.02, onChange: setParam('arrowParameters', 'floatAmount') },
        floatSpeed: { value: arrowParameters.floatSpeed, min: 0, max: 8, step: 0.1, onChange: setParam('arrowParameters', 'floatSpeed') },
        color: { value: arrowParameters.color, onChange: setParam('arrowParameters', 'color') },
    })

    useControls('Song Game', {
        interactRadius: { value: songGameParameters.interactRadius, min: 1, max: 12, step: 0.1, onChange: setParam('songGameParameters', 'interactRadius') },
        wheelRadius: { value: songGameParameters.wheelRadius, min: 60, max: 320, step: 1, onChange: setParam('songGameParameters', 'wheelRadius') },
        buttonSize: { value: songGameParameters.buttonSize, min: 24, max: 140, step: 1, onChange: setParam('songGameParameters', 'buttonSize') },
        songVolume: { value: songGameParameters.songVolume, min: 0, max: 0.5, step: 0.01, onChange: setParam('songGameParameters', 'songVolume') },
        hearNear: { value: songGameParameters.hearNear, min: 0, max: 20, step: 0.5, onChange: setParam('songGameParameters', 'hearNear') },
        hearFar: { value: songGameParameters.hearFar, min: 4, max: 80, step: 1, onChange: setParam('songGameParameters', 'hearFar') },
        noteDuration: { value: songGameParameters.noteDuration, min: 0.4, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteDuration') },
        noteGrow: { value: songGameParameters.noteGrow, min: 0.5, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteGrow') },
        noteScale: { value: songGameParameters.noteScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'noteScale') },
        noteRiseWorld: { value: songGameParameters.noteRiseWorld, min: 0, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteRiseWorld') },
        noteWobbleWorld: { value: songGameParameters.noteWobbleWorld, min: 0, max: 1.5, step: 0.01, onChange: setParam('songGameParameters', 'noteWobbleWorld') },
        noteColor: { value: songGameParameters.noteColor, onChange: setParam('songGameParameters', 'noteColor') },
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
        texture: {
            value: painteryTextureParameters.textureName,
            options: PAINTERY_TEXTURE_IDS,
            onChange: setParam('painteryTextureParameters', 'textureName'),
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
            max: 12,
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
            max: 10,
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

    useControls('Character Eyes', {
        enabled: { value: characterEyesParameters.enabled, onChange: setParam('characterEyesParameters', 'enabled') },
        debugUv1: { value: characterEyesParameters.debugUv1, onChange: setParam('characterEyesParameters', 'debugUv1') },
        // Eyeball (yellow circle, big wobbly border) — laid out in the head's second UV (uv1).
        eyeColor: { value: characterEyesParameters.eyeColor, onChange: setParam('characterEyesParameters', 'eyeColor') },
        eyeRadius: { value: characterEyesParameters.eyeRadius, min: 0.02, max: 0.5, step: 0.005, onChange: setParam('characterEyesParameters', 'eyeRadius') },
        eyeSpacing: { value: characterEyesParameters.eyeSpacing, min: 0, max: 0.9, step: 0.005, onChange: setParam('characterEyesParameters', 'eyeSpacing') },
        eyeOffsetY: { value: characterEyesParameters.eyeOffsetY, min: -0.4, max: 0.4, step: 0.005, onChange: setParam('characterEyesParameters', 'eyeOffsetY') },
        eyeAspect: { value: characterEyesParameters.eyeAspect, min: 0.4, max: 1.6, step: 0.01, onChange: setParam('characterEyesParameters', 'eyeAspect') },
        eyeNoiseScale: { value: characterEyesParameters.eyeNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('characterEyesParameters', 'eyeNoiseScale') },
        eyeNoiseStrength: { value: characterEyesParameters.eyeNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('characterEyesParameters', 'eyeNoiseStrength') },
        // Pupil (squished ellipse, perlin border).
        pupilColor: { value: characterEyesParameters.pupilColor, onChange: setParam('characterEyesParameters', 'pupilColor') },
        pupilWidth: { value: characterEyesParameters.pupilWidth, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilWidth') },
        pupilHeight: { value: characterEyesParameters.pupilHeight, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilHeight') },
        pupilOffsetX: { value: characterEyesParameters.pupilOffsetX, min: -0.15, max: 0.15, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilOffsetX') },
        pupilOffsetY: { value: characterEyesParameters.pupilOffsetY, min: -0.15, max: 0.15, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilOffsetY') },
        pupilNoiseScale: { value: characterEyesParameters.pupilNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('characterEyesParameters', 'pupilNoiseScale') },
        pupilNoiseStrength: { value: characterEyesParameters.pupilNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('characterEyesParameters', 'pupilNoiseStrength') },
        edgeSoftness: { value: characterEyesParameters.edgeSoftness, min: 0.005, max: 0.3, step: 0.005, onChange: setParam('characterEyesParameters', 'edgeSoftness') },
        // Blink.
        blinkInterval: { value: characterEyesParameters.blinkInterval, min: 0.3, max: 10, step: 0.1, onChange: setParam('characterEyesParameters', 'blinkInterval') },
        blinkIntervalRandom: { value: characterEyesParameters.blinkIntervalRandom, min: 0, max: 8, step: 0.1, onChange: setParam('characterEyesParameters', 'blinkIntervalRandom') },
        blinkDuration: { value: characterEyesParameters.blinkDuration, min: 0.04, max: 1, step: 0.01, onChange: setParam('characterEyesParameters', 'blinkDuration') },
        // Occasional left/right pupil glance (rarer than blinks).
        pupilLook: { value: characterEyesParameters.pupilLook, onChange: setParam('characterEyesParameters', 'pupilLook') },
        pupilLookAmount: { value: characterEyesParameters.pupilLookAmount, min: 0, max: 0.15, step: 0.005, onChange: setParam('characterEyesParameters', 'pupilLookAmount') },
        pupilLookInterval: { value: characterEyesParameters.pupilLookInterval, min: 1, max: 20, step: 0.5, onChange: setParam('characterEyesParameters', 'pupilLookInterval') },
        pupilLookIntervalRandom: { value: characterEyesParameters.pupilLookIntervalRandom, min: 0, max: 15, step: 0.5, onChange: setParam('characterEyesParameters', 'pupilLookIntervalRandom') },
        pupilLookHold: { value: characterEyesParameters.pupilLookHold, min: 0.1, max: 4, step: 0.1, onChange: setParam('characterEyesParameters', 'pupilLookHold') },
        pupilLookSpeed: { value: characterEyesParameters.pupilLookSpeed, min: 1, max: 20, step: 0.5, onChange: setParam('characterEyesParameters', 'pupilLookSpeed') },
    })

    useControls('Tree Eyes', {
        planesPerTree: { value: treeEyesParameters.planesPerTree, min: 0, max: 11, step: 1, onChange: setParam('treeEyesParameters', 'planesPerTree') },
        // Eyeball (drawn in the plane's [0,1] UV).
        eyeColor: { value: treeEyesParameters.eyeColor, onChange: setParam('treeEyesParameters', 'eyeColor') },
        eyeRadius: { value: treeEyesParameters.eyeRadius, min: 0.02, max: 0.5, step: 0.005, onChange: setParam('treeEyesParameters', 'eyeRadius') },
        eyeSpacing: { value: treeEyesParameters.eyeSpacing, min: 0, max: 0.9, step: 0.005, onChange: setParam('treeEyesParameters', 'eyeSpacing') },
        eyeOffsetY: { value: treeEyesParameters.eyeOffsetY, min: -0.4, max: 0.4, step: 0.005, onChange: setParam('treeEyesParameters', 'eyeOffsetY') },
        eyeAspect: { value: treeEyesParameters.eyeAspect, min: 0.4, max: 1.6, step: 0.01, onChange: setParam('treeEyesParameters', 'eyeAspect') },
        eyeNoiseScale: { value: treeEyesParameters.eyeNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('treeEyesParameters', 'eyeNoiseScale') },
        eyeNoiseStrength: { value: treeEyesParameters.eyeNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('treeEyesParameters', 'eyeNoiseStrength') },
        // Pupil.
        pupilColor: { value: treeEyesParameters.pupilColor, onChange: setParam('treeEyesParameters', 'pupilColor') },
        pupilWidth: { value: treeEyesParameters.pupilWidth, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('treeEyesParameters', 'pupilWidth') },
        pupilHeight: { value: treeEyesParameters.pupilHeight, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('treeEyesParameters', 'pupilHeight') },
        pupilNoiseScale: { value: treeEyesParameters.pupilNoiseScale, min: 0.5, max: 12, step: 0.1, onChange: setParam('treeEyesParameters', 'pupilNoiseScale') },
        pupilNoiseStrength: { value: treeEyesParameters.pupilNoiseStrength, min: 0, max: 0.6, step: 0.01, onChange: setParam('treeEyesParameters', 'pupilNoiseStrength') },
        edgeSoftness: { value: treeEyesParameters.edgeSoftness, min: 0.005, max: 0.3, step: 0.005, onChange: setParam('treeEyesParameters', 'edgeSoftness') },
        // Blink + glance.
        blinkInterval: { value: treeEyesParameters.blinkInterval, min: 0.5, max: 12, step: 0.1, onChange: setParam('treeEyesParameters', 'blinkInterval') },
        blinkWidth: { value: treeEyesParameters.blinkWidth, min: 0.02, max: 0.4, step: 0.01, onChange: setParam('treeEyesParameters', 'blinkWidth') },
        lookInterval: { value: treeEyesParameters.lookInterval, min: 1, max: 20, step: 0.5, onChange: setParam('treeEyesParameters', 'lookInterval') },
        lookHold: { value: treeEyesParameters.lookHold, min: 0.05, max: 0.8, step: 0.05, onChange: setParam('treeEyesParameters', 'lookHold') },
        lookAmount: { value: treeEyesParameters.lookAmount, min: 0, max: 0.15, step: 0.005, onChange: setParam('treeEyesParameters', 'lookAmount') },
        lookChance: { value: treeEyesParameters.lookChance, min: 0, max: 1, step: 0.05, onChange: setParam('treeEyesParameters', 'lookChance') },
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

    useControls('Loader Debug', {
        enabled: {
            value: loaderDebugParameters.enabled,
            onChange: setParam('loaderDebugParameters', 'enabled'),
        },
        targetX: {
            value: loaderDebugParameters.targetX,
            min: -12,
            max: 12,
            step: 0.001,
            onChange: setParam('loaderDebugParameters', 'targetX'),
        },
        targetZ: {
            value: loaderDebugParameters.targetZ,
            min: -12,
            max: 12,
            step: 0.001,
            onChange: setParam('loaderDebugParameters', 'targetZ'),
        },
        step: {
            value: loaderDebugParameters.nudgeStep,
            min: 0.001,
            max: 0.25,
            step: 0.001,
            onChange: setParam('loaderDebugParameters', 'nudgeStep'),
        },
        circleRadius: {
            value: loaderDebugParameters.circleRadius,
            min: 40,
            max: 220,
            step: 0.5,
            onChange: setParam('loaderDebugParameters', 'circleRadius'),
        },
        ringWidth: {
            value: loaderDebugParameters.ringWidth,
            min: 1,
            max: 40,
            step: 0.5,
            onChange: setParam('loaderDebugParameters', 'ringWidth'),
        },
        cameraY: {
            value: loaderDebugParameters.cameraHeight,
            min: 1,
            max: 40,
            step: 0.05,
            onChange: setParam('loaderDebugParameters', 'cameraHeight'),
        },
        cssA: {
            value: loaderDebugParameters.cssColorA,
            onChange: setParam('loaderDebugParameters', 'cssColorA'),
        },
        cssB: {
            value: loaderDebugParameters.cssColorB,
            onChange: setParam('loaderDebugParameters', 'cssColorB'),
        },
    })

    useControls('Intro Camera', {
        'redo the animation': button(() => replayIntro()),
        riseHeight: {
            value: introCameraParameters.riseHeight,
            min: 0,
            max: 20,
            step: 0.1,
            onChange: setParam('introCameraParameters', 'riseHeight'),
        },
        riseDuration: {
            value: introCameraParameters.riseDuration,
            min: 0,
            max: 3,
            step: 0.05,
            onChange: setParam('introCameraParameters', 'riseDuration'),
        },
        spiralDuration: {
            value: introCameraParameters.spiralDuration,
            min: 0.3,
            max: 8,
            step: 0.05,
            onChange: setParam('introCameraParameters', 'spiralDuration'),
        },
        orbitDistance: {
            value: introCameraParameters.orbitDistance,
            min: 3,
            max: 40,
            step: 0.5,
            onChange: setParam('introCameraParameters', 'orbitDistance'),
        },
        revealReduce: {
            value: introCameraParameters.revealReduce,
            min: 0,
            max: 0.3,
            step: 0.005,
            onChange: setParam('introCameraParameters', 'revealReduce'),
        },
    })

    return null
}
