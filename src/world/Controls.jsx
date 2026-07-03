import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { button, folder, levaStore, useControls } from 'leva'
import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import { useIsMobile } from '../config/mobile.js'
import { seeThrough, applySeeThroughParameters } from './utils/seeThrough.js'
import { updateEdgeUniforms } from '../materials/edgeUniforms.js'
import { mainCharacterMaterialGroups } from '../config/mainCharacterMaterials.js'
import { defaultSceneStyle } from '../config/sceneStyles.js'
import { painterlyTextureOptions, stylizedDebugModes } from '../config/stylizedMaterialDefaults.js'
import { PAINTERY_TEXTURE_IDS } from '../config/painteryTextures.js'
import { GROUND_TEXTURE_IDS, BACKGROUND_TEXTURE_IDS } from '../config/surfaceTextures.js'

const LEVA_SECTION_PATHS = Object.freeze({
    Terrain: {
        groundTexture: 'groundTextureEnabled',
        groundTextureName: 'groundTextureName',
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
        stoneGradientEnabled: 'stoneGradientEnabled',
        stoneGradientDark: 'stoneGradientDark',
        stoneGradientColor: 'stoneGradientColor',
        stoneGradientColorStrength: 'stoneGradientColorStrength',
        stoneGradientHeight: 'stoneGradientHeight',
        mushroomSize: 'mushroomSize',
        mushroomYOffset: 'mushroomYOffset',
        mushroomCapColor: 'mushroomCapColor',
        mushroomLegColor: 'mushroomLegColor',
        stoneColorVariation: 'stoneColorVariation',
        mushroomColorVariation: 'mushroomColorVariation',
        mushroomLegColorVariation: 'mushroomLegColorVariation',
        treeColorVariation: 'treeColorVariation',
        mushroomGrassRadius: 'mushroomGrassRadius',
        mushroomGrassFade: 'mushroomGrassFade',
        mushroomGrassLean: 'mushroomGrassLean',
        mushroomWiggleRadius: 'mushroomWiggleRadius',
        mushroomWiggleAngle: 'mushroomWiggleAngle',
        mushroomWiggleSpeed: 'mushroomWiggleSpeed',
        mushroomWiggleDecay: 'mushroomWiggleDecay',
        mushroomLitBoost: 'mushroomLitBoost',
        mushroomSoundVolume: 'mushroomSoundVolume',
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
        backgroundTexture: 'textureName',
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
        stoneColor: 'stoneColor',
        trunkColor: 'trunkColor',
        mushroomColor: 'mushroomColor',
        musicStoneColor: 'musicStoneColor',
        strength: 'strength',
        power: 'power',
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
    // Keys are the Leva control PATHS under "Game.Game UI" (incl. the subfolders the controls live in,
    // so the store→Leva reverse-sync hits the real fields); values are the gameUiParameters keys.
    'Game UI': {
        'Text & scale.uiScale': 'uiScale',
        'Text & scale.sizeFloor': 'sizeFloor',
        'Text & scale.sizeCeil': 'sizeCeil',
        'Text & scale.bubbleWidth': 'bubbleWidth',
        'Corners & frame.panelRadius': 'panelRadius',
        'Corners & frame.chipRadius': 'chipRadius',
        'Corners & frame.borderWidth': 'borderWidth',
        'Sound HUD.soundControlSize': 'soundControlSize',
        'Sound HUD.volFrameHeight': 'volFrameHeight',
        'Sound HUD.volSliderHeight': 'volSliderHeight',
        'Sound HUD.volSliderTrack': 'volSliderTrack',
        'Sound HUD.volSliderThumb': 'volSliderThumb',
        'Sound HUD.volEmptyOpacity': 'volEmptyOpacity',
        'Speech bubble.bubblePadX': 'bubblePadX',
        'Speech bubble.bubblePadY': 'bubblePadY',
        'Countdown.countSize': 'countSize',
        'Countdown.countBox': 'countBox',
        'Countdown.countBorder': 'countBorder',
        'Countdown.countNudge': 'countNudge',
        'Key chips.chipSize': 'chipSize',
        'Key chips.chipPadX': 'chipPadX',
        'Key chips.chipBorder': 'chipBorder',
        'Key chips.chipNudge': 'chipNudge',
        'Key chips.chipNudgeX': 'chipNudgeX',
        'Start button.startBtnSize': 'startBtnSize',
        'Start button.startBtnPadX': 'startBtnPadX',
        'Start button.startBtnPadY': 'startBtnPadY',
        'Credits buttons.creditsBtnSize': 'creditsBtnSize',
        'Credits buttons.creditsBtnPadX': 'creditsBtnPadX',
        'Credits buttons.creditsBtnPadY': 'creditsBtnPadY',
        'Credits buttons.creditsBtnOffset': 'creditsBtnOffset',
        'Dialogue reveal.wordStagger': 'wordStagger',
        'Dialogue reveal.wordFade': 'wordFade',
        'Tutorial.tutorialEnabled': 'tutorialEnabled',
        'Tutorial.tutorialImageSize': 'tutorialImageSize',
        'Tutorial.tutorialImageFrame': 'tutorialImageFrame',
        'Tutorial.tutorialFrameRadius': 'tutorialFrameRadius',
        'Tutorial.tutorialImageRadius': 'tutorialImageRadius',
        'Tutorial.tutorialPadding': 'tutorialPadding',
        'Tutorial.tutorialButtonOutside': 'tutorialButtonOutside',
        previewUI: 'previewUI',
    },
})

function addLevaSectionValues(values, folder, section, paths) {
    Object.entries(paths).forEach(([control, parameter]) => {
        values[`${folder}.${control}`] = section[parameter]
    })
}

function addSeeThroughValues(values) {
    values['Debug.See-Through.enabled'] = seeThrough.enabled
    values['Debug.See-Through.grassEnabled'] = seeThrough.grassEnabled
    values['Debug.See-Through.worldRadius'] = seeThrough.worldRadius
    values['Debug.See-Through.inner'] = seeThrough.inner
    values['Debug.See-Through.depthBias'] = seeThrough.depthBias
    values['Debug.See-Through.opacityIntensity'] = seeThrough.opacityIntensity
    values['Debug.See-Through.textureContrast'] = seeThrough.textureContrast
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
    const joystickParameters = useStore((state) => state.joystickParameters)
    const mobileCameraParameters = useStore((state) => state.mobileCameraParameters)
    const mobileStoneParameters = useStore((state) => state.mobileStoneParameters)
    const mobileUiParameters = useStore((state) => state.mobileUiParameters)
    const mobile = useIsMobile()
    const colorGradeParameters = useStore((state) => state.colorGradeParameters)
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

        addLevaSectionValues(values, 'World.Terrain', terrainParameters, LEVA_SECTION_PATHS.Terrain)
        addLevaSectionValues(values, 'Grass.Grass', grassParameters, LEVA_SECTION_PATHS.Grass)
        addLevaSectionValues(values, 'Grass.Wind', windParameters, LEVA_SECTION_PATHS.Wind)
        addLevaSectionValues(values, 'Grass.Grass Patches', grassPatchParameters, LEVA_SECTION_PATHS['Grass Patches'])
        addLevaSectionValues(values, 'Grass.Roads', roadParameters, LEVA_SECTION_PATHS.Roads)
        addLevaSectionValues(values, 'Props.Objects', objectParameters, LEVA_SECTION_PATHS.Objects)
        addLevaSectionValues(values, 'Grass.Grass Trail', grassParameters, LEVA_SECTION_PATHS['Grass Trail'])
        addLevaSectionValues(values, 'Grass.GT Dissolve', grassParameters, LEVA_SECTION_PATHS['GT Dissolve'])
        addLevaSectionValues(values, 'Grass.GT Lighten', grassParameters, LEVA_SECTION_PATHS['GT Lighten'])
        addLevaSectionValues(values, 'Grass.GT Scale', grassParameters, LEVA_SECTION_PATHS['GT Scale'])
        addLevaSectionValues(values, 'Grass.GT Lean', grassParameters, LEVA_SECTION_PATHS['GT Lean'])
        addLevaSectionValues(values, 'Lantern.Lantern Ground Light', lanternGroundLightParameters, LEVA_SECTION_PATHS['Lantern Ground Light'])
        addLevaSectionValues(values, 'World.Border', borderParameters, LEVA_SECTION_PATHS.Border)
        addLevaSectionValues(values, 'World.Dithering Params', ditheringParameters, LEVA_SECTION_PATHS['Dithering Params'])
        addLevaSectionValues(values, 'World.Background', backgroundParameters, LEVA_SECTION_PATHS.Background)
        addLevaSectionValues(values, 'World.Painterly Postprocess', painterlyPostParameters, LEVA_SECTION_PATHS['Painterly Postprocess'])
        addLevaSectionValues(values, 'Props.Leaves Edge', edgeParameters, LEVA_SECTION_PATHS['Leaves Edge'])
        addLevaSectionValues(values, 'Characters.Character', characterParameters, LEVA_SECTION_PATHS.Character)
        addLevaSectionValues(values, 'Characters.Character Stylized', characterMaterialParameters, LEVA_SECTION_PATHS['Character Stylized'])
        addLevaSectionValues(values, 'Debug.Loader Debug', loaderDebugParameters, LEVA_SECTION_PATHS['Loader Debug'])

        mainCharacterMaterialGroups.forEach((group) => {
            values[`Characters.Character Stylized.${group.label} Base`] =
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
        addLevaSectionValues(values, 'Game.Camera Debug', cameraParameters, LEVA_SECTION_PATHS['Camera Debug'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [cameraParameters])

    useEffect(() => {
        const values = {}
        addLevaSectionValues(values, 'Debug.Loader Debug', loaderDebugParameters, LEVA_SECTION_PATHS['Loader Debug'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [loaderDebugParameters])

    useEffect(() => {
        const values = {}
        addLevaSectionValues(values, 'Game.Game UI', gameUiParameters, LEVA_SECTION_PATHS['Game UI'])

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
        addLevaSectionValues(values, 'Props.Props Edge', propRimParameters, LEVA_SECTION_PATHS['Props Edge'])

        syncingLeva.current = true
        try {
            levaStore.set(values, false)
        } finally {
            syncingLeva.current = false
        }
    }, [propRimParameters])

    // Push the UI design tokens onto :root so the whole DOM UI (bubble, prompts, HUD, chips) restyles
    // live. style.css keys every size/corner/border off these vars. One effect for the lot.
    useEffect(() => {
        const root = document.documentElement.style
        const p = gameUiParameters
        // Sizes route through --ui-vmin (a floored vmin) so they re-evaluate live when --ui-scale or the
        // floor change, and never shrink past the floor at extreme aspect ratios.
        const vm = (n) => `calc(${n} * var(--ui-vmin) * var(--ui-scale))`
        // Mobile bumps the whole DOM UI up (bigger touch targets), tunable via mobileUi.uiScale.
        root.setProperty('--ui-scale', String(mobile ? mobileUiParameters.uiScale : p.uiScale ?? 1.3))
        // Speech-bubble max width: fixed on desktop, but on mobile it scales with the UI + caps to the
        // viewport so it doesn't overflow a narrow phone (the desktop 460px would).
        root.setProperty('--dlg-width', mobile ? 'min(92vw, calc(30 * var(--ui-vmin) * var(--ui-scale)))' : '460px')
        // Mobile uses its own floor/ceil (the desktop floor is too tall for a phone's small vmin).
        root.setProperty('--ui-size-floor', `${mobile ? mobileUiParameters.sizeFloor : p.sizeFloor ?? 6.5}px`)
        root.setProperty('--ui-size-ceil', `${mobile ? mobileUiParameters.sizeCeil : p.sizeCeil ?? 10.8}px`)
        root.setProperty('--ui-radius', vm(p.panelRadius ?? 0.93))
        root.setProperty('--ui-radius-chip', vm(p.chipRadius ?? 0.53))
        root.setProperty('--ui-border', `${p.borderWidth ?? 2}px`)
        root.setProperty('--ui-bubble-pad-y', vm(p.bubblePadY ?? 1.7))
        root.setProperty('--ui-bubble-pad-x', vm(p.bubblePadX ?? 2.5))
        root.setProperty('--ui-count-size', vm(p.countSize ?? 5.2))
        root.setProperty('--ui-count-box', vm(p.countBox ?? 9.2))
        root.setProperty('--ui-count-border', `${p.countBorder ?? 2}px`)
        root.setProperty('--ui-count-nudge', `${p.countNudge ?? 0.04}em`)
        root.setProperty('--ui-chip-size', vm(p.chipSize ?? 2.3))
        root.setProperty('--ui-chip-pad-x', vm(p.chipPadX ?? 0.6))
        root.setProperty('--ui-chip-border', `${p.chipBorder ?? 1}px`)
        root.setProperty('--ui-chip-nudge', `${p.chipNudge ?? 0.05}em`)
        root.setProperty('--ui-chip-nudge-x', `${p.chipNudgeX ?? 0}em`)
        root.setProperty('--start-btn-size', vm(p.startBtnSize ?? 2.0))
        root.setProperty('--start-btn-pad-y', vm(p.startBtnPadY ?? 0.7))
        root.setProperty('--start-btn-pad-x', vm(p.startBtnPadX ?? 2.0))
        root.setProperty('--credits-btn-size', vm(p.creditsBtnSize ?? 2.0))
        root.setProperty('--credits-btn-pad-y', vm(p.creditsBtnPadY ?? 1.2))
        root.setProperty('--credits-btn-pad-x', vm(p.creditsBtnPadX ?? 4.0))
        root.setProperty('--credits-btn-offset', `${p.creditsBtnOffset ?? 9}%`)
        // Tutorial tip cards. Image size is a vh (independent of --ui-vmin so it reads as "% of screen
        // height"); the image frame toggles by driving its border width to 0.
        root.setProperty('--tut-image-size', `${p.tutorialImageSize ?? 44}vh`)
        root.setProperty('--tut-image-border-width', `${(p.tutorialImageFrame ?? true) ? (p.borderWidth ?? 2) : 0}px`)
        root.setProperty('--tut-frame-radius', `${p.tutorialFrameRadius ?? 14}px`)
        root.setProperty('--tut-image-radius', `${p.tutorialImageRadius ?? 14}px`)
        root.setProperty('--tut-pad', vm(p.tutorialPadding ?? 2.0))
        // Top-left sound HUD.
        root.setProperty('--hud-ctrl', vm(p.soundControlSize ?? 3.8))
        root.setProperty('--vol-frame-h', vm(p.volFrameHeight ?? 10.5))
        root.setProperty('--vol-h', vm(p.volSliderHeight ?? 9))
        root.setProperty('--vol-track', vm(p.volSliderTrack ?? 0.5))
        root.setProperty('--vol-thumb', vm(p.volSliderThumb ?? 1.3))
        root.setProperty('--vol-empty', String(p.volEmptyOpacity ?? 0.25))
        // Height the bottom-centre PORTRAIT joystick occupies (margin + stick + a gap) — bottom-centre
        // UI (the "Talk to…" prompt) sits above this in portrait so they never overlap.
        root.setProperty('--joy-clearance', `${(joystickParameters.marginY ?? 40) + (joystickParameters.size ?? 130) + 24}px`)
        // Portrait-only touch UI positions (consumed inside `@media (orientation:portrait) and (pointer:coarse)`;
        // inert on desktop). "Talk to…" prompt centre + the "Round n/3" banner's bottom offset.
        root.setProperty('--prompt-x', `${mobileUiParameters.promptPortraitX ?? 50}%`)
        root.setProperty('--prompt-y', `${mobileUiParameters.promptPortraitY ?? 50}%`)
        root.setProperty('--round-y', `${mobileUiParameters.roundPortraitY ?? 16}%`)
        // Landscape-only intro tuning (consumed in `@media (orientation:landscape) and (pointer:coarse)`).
        root.setProperty('--dlg-width-landscape', `${mobileUiParameters.bubbleWidthLandscape ?? 560}px`)
        root.setProperty('--name-top-landscape', `${mobileUiParameters.nameTopLandscape ?? 7}%`)
        root.setProperty('--dlg-bottom-landscape', `${mobileUiParameters.bubbleBottomLandscape ?? 12}%`)
        root.setProperty('--dlg-start-offset-landscape', `${mobileUiParameters.startOffsetLandscape ?? 0}px`)
    }, [gameUiParameters, mobile, mobileUiParameters, joystickParameters])

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

    // The whole in-game UI skin (SpeechBubble + InteractionPrompt + SongGame HUD + key chips). Each
    // value is written to a CSS custom property on :root (see the effect below) so the DOM UI restyles
    // live. Toggle previewUI to splay every overlay on screen at once while dialing these in.
    useControls('Desktop.UI', {
        'Text & scale': folder(
            {
                uiScale: { value: gameUiParameters.uiScale, min: 0.5, max: 3, step: 0.05, onChange: setParam('gameUiParameters', 'uiScale') },
                sizeFloor: { value: gameUiParameters.sizeFloor, min: 0, max: 16, step: 0.5, label: 'sizeFloor (px)', onChange: setParam('gameUiParameters', 'sizeFloor') },
                sizeCeil: { value: gameUiParameters.sizeCeil, min: 7, max: 40, step: 0.1, label: 'sizeCeil (px)', onChange: setParam('gameUiParameters', 'sizeCeil') },
                bubbleWidth: { value: gameUiParameters.bubbleWidth, min: 200, max: 1600, step: 10, onChange: setParam('gameUiParameters', 'bubbleWidth') },
            },
            { collapsed: false }
        ),
        'Corners & frame': folder(
            {
                panelRadius: { value: gameUiParameters.panelRadius, min: 0, max: 4, step: 0.02, label: 'panelRadius (vmin)', onChange: setParam('gameUiParameters', 'panelRadius') },
                chipRadius: { value: gameUiParameters.chipRadius, min: 0, max: 3, step: 0.02, label: 'chipRadius (vmin)', onChange: setParam('gameUiParameters', 'chipRadius') },
                borderWidth: { value: gameUiParameters.borderWidth, min: 0, max: 6, step: 0.5, onChange: setParam('gameUiParameters', 'borderWidth') },
            },
            { collapsed: false }
        ),
        'Sound HUD': folder(
            {
                soundControlSize: { value: gameUiParameters.soundControlSize, min: 2, max: 6, step: 0.05, label: 'button/counter size', onChange: setParam('gameUiParameters', 'soundControlSize') },
                volFrameHeight: { value: gameUiParameters.volFrameHeight, min: 3, max: 20, step: 0.1, label: 'frame height', onChange: setParam('gameUiParameters', 'volFrameHeight') },
                volSliderHeight: { value: gameUiParameters.volSliderHeight, min: 3, max: 18, step: 0.1, label: 'bar length', onChange: setParam('gameUiParameters', 'volSliderHeight') },
                volSliderTrack: { value: gameUiParameters.volSliderTrack, min: 0.1, max: 2, step: 0.05, label: 'bar width', onChange: setParam('gameUiParameters', 'volSliderTrack') },
                volSliderThumb: { value: gameUiParameters.volSliderThumb, min: 0.4, max: 3, step: 0.05, label: 'thumb size', onChange: setParam('gameUiParameters', 'volSliderThumb') },
                volEmptyOpacity: { value: gameUiParameters.volEmptyOpacity, min: 0, max: 1, step: 0.01, label: 'empty opacity', onChange: setParam('gameUiParameters', 'volEmptyOpacity') },
            },
            { collapsed: true }
        ),
        'Speech bubble': folder(
            {
                bubblePadX: { value: gameUiParameters.bubblePadX, min: 0, max: 8, step: 0.1, onChange: setParam('gameUiParameters', 'bubblePadX') },
                bubblePadY: { value: gameUiParameters.bubblePadY, min: 0, max: 8, step: 0.1, onChange: setParam('gameUiParameters', 'bubblePadY') },
            },
            { collapsed: true }
        ),
        'Countdown': folder(
            {
                countSize: { value: gameUiParameters.countSize, min: 2, max: 12, step: 0.1, onChange: setParam('gameUiParameters', 'countSize') },
                countBox: { value: gameUiParameters.countBox, min: 4, max: 20, step: 0.1, onChange: setParam('gameUiParameters', 'countBox') },
                countBorder: { value: gameUiParameters.countBorder, min: 0, max: 8, step: 0.5, label: 'countBorder (px)', onChange: setParam('gameUiParameters', 'countBorder') },
                countNudge: { value: gameUiParameters.countNudge, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'countNudge') },
            },
            { collapsed: false }
        ),
        'Key chips': folder(
            {
                chipSize: { value: gameUiParameters.chipSize, min: 1, max: 6, step: 0.05, onChange: setParam('gameUiParameters', 'chipSize') },
                chipPadX: { value: gameUiParameters.chipPadX, min: 0, max: 3, step: 0.05, onChange: setParam('gameUiParameters', 'chipPadX') },
                chipBorder: { value: gameUiParameters.chipBorder, min: 0, max: 4, step: 0.25, onChange: setParam('gameUiParameters', 'chipBorder') },
                chipNudge: { value: gameUiParameters.chipNudge, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'chipNudge') },
                chipNudgeX: { value: gameUiParameters.chipNudgeX, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'chipNudgeX') },
            },
            { collapsed: false }
        ),
        'Start button': folder(
            {
                startBtnSize: { value: gameUiParameters.startBtnSize, min: 1, max: 5, step: 0.05, onChange: setParam('gameUiParameters', 'startBtnSize') },
                startBtnPadX: { value: gameUiParameters.startBtnPadX, min: 0, max: 8, step: 0.1, onChange: setParam('gameUiParameters', 'startBtnPadX') },
                startBtnPadY: { value: gameUiParameters.startBtnPadY, min: 0, max: 5, step: 0.1, onChange: setParam('gameUiParameters', 'startBtnPadY') },
            },
            { collapsed: true }
        ),
        'Credits buttons': folder(
            {
                creditsBtnSize: { value: gameUiParameters.creditsBtnSize, min: 1, max: 5, step: 0.05, onChange: setParam('gameUiParameters', 'creditsBtnSize') },
                creditsBtnPadX: { value: gameUiParameters.creditsBtnPadX, min: 0, max: 10, step: 0.1, onChange: setParam('gameUiParameters', 'creditsBtnPadX') },
                creditsBtnPadY: { value: gameUiParameters.creditsBtnPadY, min: 0, max: 5, step: 0.1, onChange: setParam('gameUiParameters', 'creditsBtnPadY') },
                creditsBtnOffset: { value: gameUiParameters.creditsBtnOffset, min: 0, max: 45, step: 0.5, label: 'creditsBtnOffset (%)', onChange: setParam('gameUiParameters', 'creditsBtnOffset') },
            },
            { collapsed: true }
        ),
        'Dialogue reveal': folder(
            {
                wordStagger: { value: gameUiParameters.wordStagger, min: 0, max: 300, step: 5, onChange: setParam('gameUiParameters', 'wordStagger') },
                wordFade: { value: gameUiParameters.wordFade, min: 80, max: 1200, step: 10, onChange: setParam('gameUiParameters', 'wordFade') },
            },
            { collapsed: true }
        ),
        'Tutorial': folder(
            {
                tutorialEnabled: { value: gameUiParameters.tutorialEnabled, label: 'enabled', onChange: setParam('gameUiParameters', 'tutorialEnabled') },
                tutorialImageSize: { value: gameUiParameters.tutorialImageSize, min: 15, max: 75, step: 1, label: 'imageSize (vh)', onChange: setParam('gameUiParameters', 'tutorialImageSize') },
                tutorialImageFrame: { value: gameUiParameters.tutorialImageFrame, label: 'image frame', onChange: setParam('gameUiParameters', 'tutorialImageFrame') },
                tutorialFrameRadius: { value: gameUiParameters.tutorialFrameRadius, min: 0, max: 40, step: 1, label: 'frameRadius (px)', onChange: setParam('gameUiParameters', 'tutorialFrameRadius') },
                tutorialImageRadius: { value: gameUiParameters.tutorialImageRadius, min: 0, max: 40, step: 1, label: 'imageRadius (px)', onChange: setParam('gameUiParameters', 'tutorialImageRadius') },
                tutorialPadding: { value: gameUiParameters.tutorialPadding, min: 0, max: 8, step: 0.1, label: 'image↔frame pad', onChange: setParam('gameUiParameters', 'tutorialPadding') },
                tutorialButtonOutside: { value: gameUiParameters.tutorialButtonOutside, label: 'button outside', onChange: setParam('gameUiParameters', 'tutorialButtonOutside') },
            },
            { collapsed: true }
        ),
        previewUI: { value: gameUiParameters.previewUI, label: '🐞 preview all UI', onChange: setParam('gameUiParameters', 'previewUI') },
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
    })

    // Fresnel colour rim — applied to the hard-surface props (trunks / stones / mushrooms).
    useControls('Props.Props Edge', {
        enabled: { value: propRimParameters.enabled, onChange: setParam('propRimParameters', 'enabled') },
        stoneColor: { value: propRimParameters.stoneColor, onChange: setParam('propRimParameters', 'stoneColor') },
        trunkColor: { value: propRimParameters.trunkColor, onChange: setParam('propRimParameters', 'trunkColor') },
        mushroomColor: { value: propRimParameters.mushroomColor, onChange: setParam('propRimParameters', 'mushroomColor') },
        musicStoneColor: { value: propRimParameters.musicStoneColor, onChange: setParam('propRimParameters', 'musicStoneColor') },
        strength: { value: propRimParameters.strength, min: 0, max: 3, step: 0.01, onChange: setParam('propRimParameters', 'strength') },
        power: { value: propRimParameters.power, min: 0.2, max: 8, step: 0.1, onChange: setParam('propRimParameters', 'power') },
    })

    // The 7 song-mini-game stones (colours = the 7 notes) + their staging / camera tweaks.
    useControls('Audio.Music Stones', {
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
        // cameraHeight/cameraDistance + dialogueCamera* live in Game → Camera Distance (all camera distances in one place).
        cameraLerp: { value: musicStoneParameters.cameraLerp, min: 0.5, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'cameraLerp') },
        dialogueTargetY: { value: musicStoneParameters.dialogueTargetY, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueTargetY') },
        pointerColor: { value: musicStoneParameters.pointerColor, onChange: setParam('musicStoneParameters', 'pointerColor') },
        pointerRadius: { value: musicStoneParameters.pointerRadius, min: 0, max: 6, step: 0.05, onChange: setParam('musicStoneParameters', 'pointerRadius') },
        seeThroughEnabled: { value: musicStoneParameters.seeThroughEnabled, onChange: setParam('musicStoneParameters', 'seeThroughEnabled') },
        seeThroughRadius: { value: musicStoneParameters.seeThroughRadius, min: 1, max: 14, step: 0.1, onChange: setParam('musicStoneParameters', 'seeThroughRadius') },
    })

    useControls('Audio.Music', {
        hearNear: { value: musicParameters.hearNear, min: 0, max: 30, step: 0.5, onChange: setParam('musicParameters', 'hearNear') },
        hearFar: { value: musicParameters.hearFar, min: 5, max: 100, step: 1, onChange: setParam('musicParameters', 'hearFar') },
        nearVolume: { value: musicParameters.nearVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'nearVolume') },
        farVolume: { value: musicParameters.farVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'farVolume') },
        distanceFalloff: { value: musicParameters.distanceFalloff, min: 1, max: 5, step: 0.1, onChange: setParam('musicParameters', 'distanceFalloff') },
        collectedVolume: { value: musicParameters.collectedVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'collectedVolume') },
        creditsVolume: { value: musicParameters.creditsVolume, min: 0, max: 1, step: 0.01, onChange: setParam('musicParameters', 'creditsVolume') },
        volumeLerp: { value: musicParameters.volumeLerp, min: 0.2, max: 10, step: 0.1, onChange: setParam('musicParameters', 'volumeLerp') },
    })

    useControls('Audio.Ambient SFX', {
        cicadaVolume: { value: ambientSoundParameters.cicadaVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'cicadaVolume') },
        owlVolume: { value: ambientSoundParameters.owlVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'owlVolume') },
        owlGapMin: { value: ambientSoundParameters.owlGapMin, min: 0, max: 30, step: 0.5, onChange: setParam('ambientSoundParameters', 'owlGapMin') },
        owlGapMax: { value: ambientSoundParameters.owlGapMax, min: 1, max: 60, step: 0.5, onChange: setParam('ambientSoundParameters', 'owlGapMax') },
        owlFade: { value: ambientSoundParameters.owlFade, min: 0.1, max: 5, step: 0.1, onChange: setParam('ambientSoundParameters', 'owlFade') },
        footstepVolume: { value: ambientSoundParameters.footstepVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'footstepVolume') },
        footstepInterval: { value: ambientSoundParameters.footstepInterval, min: 0.12, max: 0.8, step: 0.01, onChange: setParam('ambientSoundParameters', 'footstepInterval') },
        footstepSpeedThreshold: { value: ambientSoundParameters.footstepSpeedThreshold, min: 0, max: 4, step: 0.05, onChange: setParam('ambientSoundParameters', 'footstepSpeedThreshold') },
        mumbleVolume: { value: ambientSoundParameters.mumbleVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'mumbleVolume') },
        sadVolume: { value: ambientSoundParameters.sadVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'sadVolume') },
        sighVolume: { value: ambientSoundParameters.sighVolume, min: 0, max: 1, step: 0.01, onChange: setParam('ambientSoundParameters', 'sighVolume') },
    })

    const sheepChars = sheepMaterialParameters.characters
    useControls('Characters.Sheep', {
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

    useControls('World.Terrain', {
        groundTexture: {
            value: terrainParameters.groundTextureEnabled,
            onChange: setParam('terrainParameters', 'groundTextureEnabled'),
        },
        groundTextureName: {
            value: terrainParameters.groundTextureName,
            options: GROUND_TEXTURE_IDS,
            onChange: setParam('terrainParameters', 'groundTextureName'),
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
            max: 4.0,
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

    useControls('Grass.Grass', {
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

    useControls('Grass.Wind', {
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

    useControls('Grass.Grass Patches', {
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

    useControls('Grass.Roads', {
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

    useControls('Props.Objects', {
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
        stoneGradientEnabled: { value: objectParameters.stoneGradientEnabled, label: 'stoneGradient', onChange: setParam('objectParameters', 'stoneGradientEnabled') },
        stoneGradientDark: { value: objectParameters.stoneGradientDark, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'stoneGradientDark') },
        stoneGradientColor: { value: objectParameters.stoneGradientColor, onChange: setParam('objectParameters', 'stoneGradientColor') },
        stoneGradientColorStrength: { value: objectParameters.stoneGradientColorStrength, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'stoneGradientColorStrength') },
        stoneGradientHeight: { value: objectParameters.stoneGradientHeight, min: 0.05, max: 1.5, step: 0.01, onChange: setParam('objectParameters', 'stoneGradientHeight') },
        mushroomSize: { value: objectParameters.mushroomSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomSize') },
        mushroomYOffset: { value: objectParameters.mushroomYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'mushroomYOffset') },
        mushroomCapColor: { value: objectParameters.mushroomCapColor, onChange: setParam('objectParameters', 'mushroomCapColor') },
        mushroomLegColor: { value: objectParameters.mushroomLegColor, onChange: setParam('objectParameters', 'mushroomLegColor') },
        stoneColorVariation: { value: objectParameters.stoneColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'stoneColorVariation') },
        mushroomColorVariation: { value: objectParameters.mushroomColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'mushroomColorVariation') },
        mushroomLegColorVariation: { value: objectParameters.mushroomLegColorVariation, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'mushroomLegColorVariation') },
        treeColorVariation: { value: objectParameters.treeColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'treeColorVariation') },
        mushroomGrassRadius: { value: objectParameters.mushroomGrassRadius, min: 0.1, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassRadius') },
        mushroomGrassFade: { value: objectParameters.mushroomGrassFade, min: 0, max: 5, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassFade') },
        mushroomGrassLean: { value: objectParameters.mushroomGrassLean, min: 0, max: 2, step: 0.05, onChange: setParam('objectParameters', 'mushroomGrassLean') },
        mushroomWiggleRadius: { value: objectParameters.mushroomWiggleRadius, min: 0, max: 4, step: 0.05, onChange: setParam('objectParameters', 'mushroomWiggleRadius') },
        mushroomWiggleAngle: { value: objectParameters.mushroomWiggleAngle, min: 0, max: 1.2, step: 0.02, onChange: setParam('objectParameters', 'mushroomWiggleAngle') },
        mushroomWiggleSpeed: { value: objectParameters.mushroomWiggleSpeed, min: 1, max: 30, step: 0.5, onChange: setParam('objectParameters', 'mushroomWiggleSpeed') },
        mushroomWiggleDecay: { value: objectParameters.mushroomWiggleDecay, min: 0.5, max: 10, step: 0.1, onChange: setParam('objectParameters', 'mushroomWiggleDecay') },
        mushroomLitBoost: { value: objectParameters.mushroomLitBoost, min: 0, max: 3, step: 0.05, onChange: setParam('objectParameters', 'mushroomLitBoost') },
        mushroomSoundVolume: { value: objectParameters.mushroomSoundVolume, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'mushroomSoundVolume') },
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

    useControls('Grass.Grass Trail', {
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
        'Grass.GT Dissolve',
        grassLayerControls('dissolve', {
            mode: {
                value: grassParameters.dissolveMode,
                options: ['Alpha', 'Dither'],
                onChange: setParam('grassParameters', 'dissolveMode'),
            },
        })
    )

    useControls(
        'Grass.GT Lighten',
        grassLayerControls('lighten', {
            color: {
                value: grassParameters.lightenColor,
                onChange: setParam('grassParameters', 'lightenColor'),
            },
        })
    )

    useControls('Grass.GT Scale', grassLayerControls('scale'))

    useControls('Grass.GT Lean', grassLayerControls('lean'))

    useControls('Lantern.Lantern Ground Light', {
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

    useControls('Lantern.Lantern Fire', {
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

    useControls('Lantern.Lantern Grass', {
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

    useControls('World.Border', {
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

    useControls('World.Dithering Params', {
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

    useControls('World.Background', {
        backgroundColor: {
            value: backgroundParameters.backgroundColor,
            onChange: setParam('backgroundParameters', 'backgroundColor'),
        },
        backgroundTexture: {
            value: backgroundParameters.textureName,
            options: BACKGROUND_TEXTURE_IDS,
            onChange: setParam('backgroundParameters', 'textureName'),
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

    useControls('Game.Target Arrow', {
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

    useControls('Game.Song Game', {
        interactRadius: { value: songGameParameters.interactRadius, min: 1, max: 12, step: 0.1, onChange: setParam('songGameParameters', 'interactRadius') },
        noteDuration: { value: songGameParameters.noteDuration, min: 0.4, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteDuration') },
        noteGrow: { value: songGameParameters.noteGrow, min: 0.5, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteGrow') },
        noteScale: { value: songGameParameters.noteScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'noteScale') },
        noteRiseWorld: { value: songGameParameters.noteRiseWorld, min: 0, max: 4, step: 0.05, onChange: setParam('songGameParameters', 'noteRiseWorld') },
        noteWobbleWorld: { value: songGameParameters.noteWobbleWorld, min: 0, max: 1.5, step: 0.01, onChange: setParam('songGameParameters', 'noteWobbleWorld') },
        noteColor: { value: songGameParameters.noteColor, onChange: setParam('songGameParameters', 'noteColor') },
        heartScale: { value: songGameParameters.heartScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'heartScale') },
        markScale: { value: songGameParameters.markScale, min: 0.02, max: 1, step: 0.01, onChange: setParam('songGameParameters', 'markScale') },
    })

    useControls('World.Painterly Postprocess', {
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

    useControls('World.Paintery Texture', {
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

    useControls('Characters.Character', {
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

    useControls('Characters.Character Stylized', {
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

    useControls('Characters.Character Eyes', {
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

    useControls('Characters.Tree Eyes', {
        planesPerTree: { value: treeEyesParameters.planesPerTree, min: 0, max: 11, step: 1, onChange: setParam('treeEyesParameters', 'planesPerTree') },
        // Camera-facing fade (transparent edge-on near 90° + on back-facing planes).
        facingThreshold: { value: treeEyesParameters.facingThreshold, min: 0, max: 0.95, step: 0.01, onChange: setParam('treeEyesParameters', 'facingThreshold') },
        facingFalloff: { value: treeEyesParameters.facingFalloff, min: 0.02, max: 0.9, step: 0.01, onChange: setParam('treeEyesParameters', 'facingFalloff') },
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

    useControls('Game.Color Grade', {
        highBrightnessMode: {
            value: colorGradeParameters.highBrightnessMode,
            label: '☀ HIGH brightness',
            onChange: setParam('colorGradeParameters', 'highBrightnessMode'),
        },
        'LOW (eye-safety)': folder(
            {
                lowSaturation: { value: colorGradeParameters.lowSaturation, min: 0, max: 2, step: 0.01, onChange: setParam('colorGradeParameters', 'lowSaturation') },
                lowWarmth: { value: colorGradeParameters.lowWarmth, min: -0.3, max: 0.3, step: 0.005, onChange: setParam('colorGradeParameters', 'lowWarmth') },
                lowBrightness: { value: colorGradeParameters.lowBrightness, min: 0.5, max: 1.5, step: 0.01, onChange: setParam('colorGradeParameters', 'lowBrightness') },
            },
            { collapsed: true }
        ),
        'HIGH (normal display)': folder(
            {
                highSaturation: { value: colorGradeParameters.highSaturation, min: 0, max: 2, step: 0.01, onChange: setParam('colorGradeParameters', 'highSaturation') },
                highWarmth: { value: colorGradeParameters.highWarmth, min: -0.3, max: 0.3, step: 0.005, onChange: setParam('colorGradeParameters', 'highWarmth') },
                highBrightness: { value: colorGradeParameters.highBrightness, min: 0.5, max: 1.5, step: 0.01, onChange: setParam('colorGradeParameters', 'highBrightness') },
            },
            { collapsed: false }
        ),
    })

    useControls('Mobile.UI', {
        uiScale: { value: mobileUiParameters.uiScale, min: 0.5, max: 4, step: 0.05, onChange: setParam('mobileUiParameters', 'uiScale') },
        sizeFloor: { value: mobileUiParameters.sizeFloor, min: 0, max: 12, step: 0.1, onChange: setParam('mobileUiParameters', 'sizeFloor') },
        sizeCeil: { value: mobileUiParameters.sizeCeil, min: 4, max: 24, step: 0.1, onChange: setParam('mobileUiParameters', 'sizeCeil') },
        promptPortraitX: { value: mobileUiParameters.promptPortraitX, min: 0, max: 100, step: 1, label: 'talk X (%)', onChange: setParam('mobileUiParameters', 'promptPortraitX') },
        promptPortraitY: { value: mobileUiParameters.promptPortraitY, min: 0, max: 100, step: 1, label: 'talk Y (%)', onChange: setParam('mobileUiParameters', 'promptPortraitY') },
        roundPortraitY: { value: mobileUiParameters.roundPortraitY, min: 0, max: 100, step: 1, label: 'round bottom (%)', onChange: setParam('mobileUiParameters', 'roundPortraitY') },
        bubbleWidthLandscape: { value: mobileUiParameters.bubbleWidthLandscape, min: 200, max: 1600, step: 10, label: 'bubble W landscape', onChange: setParam('mobileUiParameters', 'bubbleWidthLandscape') },
        nameTopLandscape: { value: mobileUiParameters.nameTopLandscape, min: 0, max: 45, step: 1, label: 'name top landscape (%)', onChange: setParam('mobileUiParameters', 'nameTopLandscape') },
        bubbleBottomLandscape: { value: mobileUiParameters.bubbleBottomLandscape, min: 0, max: 80, step: 1, label: 'bubble bottom L (%)', onChange: setParam('mobileUiParameters', 'bubbleBottomLandscape') },
        startOffsetLandscape: { value: mobileUiParameters.startOffsetLandscape, min: -200, max: 300, step: 2, label: 'start offset L (px)', onChange: setParam('mobileUiParameters', 'startOffsetLandscape') },
    })

    useControls('Mobile.Loader', {
        loaderRadius: { value: mobileUiParameters.loaderRadius, min: 20, max: 160, step: 1, onChange: setParam('mobileUiParameters', 'loaderRadius') },
        loaderRingWidth: { value: mobileUiParameters.loaderRingWidth, min: 2, max: 30, step: 0.5, onChange: setParam('mobileUiParameters', 'loaderRingWidth') },
        loaderCameraHeight: { value: mobileUiParameters.loaderCameraHeight, min: 10, max: 80, step: 0.5, onChange: setParam('mobileUiParameters', 'loaderCameraHeight') },
        loaderTargetX: { value: mobileUiParameters.loaderTargetX, min: -10, max: 20, step: 0.01, onChange: setParam('mobileUiParameters', 'loaderTargetX') },
        loaderTargetZ: { value: mobileUiParameters.loaderTargetZ, min: -10, max: 10, step: 0.01, onChange: setParam('mobileUiParameters', 'loaderTargetZ') },
    })

    useControls('Mobile.Stones', {
        lineWidth: { value: mobileStoneParameters.lineWidth, min: 1, max: 12, step: 0.1, onChange: setParam('mobileStoneParameters', 'lineWidth') },
        lineHeight: { value: mobileStoneParameters.lineHeight, min: 0, max: 8, step: 0.1, onChange: setParam('mobileStoneParameters', 'lineHeight') },
        scale: { value: mobileStoneParameters.scale, min: 0.1, max: 2, step: 0.02, onChange: setParam('mobileStoneParameters', 'scale') },
        arrowDrop: { value: mobileStoneParameters.arrowDrop, min: 0, max: 6, step: 0.05, onChange: setParam('mobileStoneParameters', 'arrowDrop') },
        colGap: { value: mobileStoneParameters.colGap, label: 'grid col gap', min: 0.5, max: 6, step: 0.1, onChange: setParam('mobileStoneParameters', 'colGap') },
        rowGap: { value: mobileStoneParameters.rowGap, label: 'grid row gap', min: 0.5, max: 6, step: 0.1, onChange: setParam('mobileStoneParameters', 'rowGap') },
        gridHeight: { value: mobileStoneParameters.gridHeight, label: 'grid height', min: 0, max: 8, step: 0.1, onChange: setParam('mobileStoneParameters', 'gridHeight') },
        gridScale: { value: mobileStoneParameters.gridScale, label: 'grid scale', min: 0.1, max: 2, step: 0.02, onChange: setParam('mobileStoneParameters', 'gridScale') },
    })

    useControls('Mobile.Camera', {
        followDistance: { value: mobileCameraParameters.followDistance, label: 'walk distance', min: 6, max: 40, step: 0.1, onChange: setParam('mobileCameraParameters', 'followDistance') },
        followHeight: { value: mobileCameraParameters.followHeight, label: 'walk height', min: 4, max: 34, step: 0.1, onChange: setParam('mobileCameraParameters', 'followHeight') },
        frontDistance: { value: mobileCameraParameters.frontDistance, label: 'intro-talk dist', min: 6, max: 40, step: 0.1, onChange: setParam('mobileCameraParameters', 'frontDistance') },
        frontHeight: { value: mobileCameraParameters.frontHeight, label: 'intro-talk height', min: 0.5, max: 20, step: 0.1, onChange: setParam('mobileCameraParameters', 'frontHeight') },
        cameraDistance: { value: mobileCameraParameters.cameraDistance, label: 'minigame dist', min: 4, max: 40, step: 0.5, onChange: setParam('mobileCameraParameters', 'cameraDistance') },
        cameraHeight: { value: mobileCameraParameters.cameraHeight, label: 'minigame height', min: 2, max: 34, step: 0.5, onChange: setParam('mobileCameraParameters', 'cameraHeight') },
        dialogueCameraDistance: { value: mobileCameraParameters.dialogueCameraDistance, label: 'char-talk dist', min: 2, max: 26, step: 0.5, onChange: setParam('mobileCameraParameters', 'dialogueCameraDistance') },
        dialogueCameraHeight: { value: mobileCameraParameters.dialogueCameraHeight, label: 'char-talk height', min: 0.5, max: 20, step: 0.1, onChange: setParam('mobileCameraParameters', 'dialogueCameraHeight') },
    })

    useControls('Mobile.Joystick', {
        side: { value: joystickParameters.side, options: ['left', 'right'], onChange: setParam('joystickParameters', 'side') },
        size: { value: joystickParameters.size, min: 60, max: 260, step: 2, onChange: setParam('joystickParameters', 'size') },
        knobSize: { value: joystickParameters.knobSize, min: 24, max: 140, step: 2, onChange: setParam('joystickParameters', 'knobSize') },
        marginX: { value: joystickParameters.marginX, min: 0, max: 200, step: 2, onChange: setParam('joystickParameters', 'marginX') },
        marginY: { value: joystickParameters.marginY, min: 0, max: 200, step: 2, onChange: setParam('joystickParameters', 'marginY') },
        opacity: { value: joystickParameters.opacity, min: 0.1, max: 1, step: 0.05, onChange: setParam('joystickParameters', 'opacity') },
        deadzone: { value: joystickParameters.deadzone, min: 0, max: 0.5, step: 0.01, onChange: setParam('joystickParameters', 'deadzone') },
        // max > 1 on purpose: the default 1.01 DISABLES run (mag caps at 1.0). A max of 1 would make
        // Leva clamp the initial value to 1.0 on registration → run re-engages at full stick push.
        runThreshold: { value: joystickParameters.runThreshold, min: 0.5, max: 1.2, step: 0.01, onChange: setParam('joystickParameters', 'runThreshold') },
        baseColor: { value: joystickParameters.baseColor, onChange: setParam('joystickParameters', 'baseColor') },
        knobColor: { value: joystickParameters.knobColor, onChange: setParam('joystickParameters', 'knobColor') },
    })

    useControls('Desktop.Camera', {
        followDistance: {
            value: cameraParameters.followDistance,
            label: 'walk distance',
            min: 6,
            max: 32,
            step: 0.1,
            onChange: setParam('cameraParameters', 'followDistance'),
        },
        followHeight: {
            value: cameraParameters.followHeight,
            label: 'walk height',
            min: 4,
            max: 28,
            step: 0.1,
            onChange: setParam('cameraParameters', 'followHeight'),
        },
        frontDistance: {
            value: cameraParameters.frontDistance,
            label: 'intro-talk dist',
            min: 6,
            max: 32,
            step: 0.1,
            onChange: setParam('cameraParameters', 'frontDistance'),
        },
        frontHeight: {
            value: cameraParameters.frontHeight,
            label: 'intro-talk height',
            min: 0.5,
            max: 16,
            step: 0.1,
            onChange: setParam('cameraParameters', 'frontHeight'),
        },
        minigameDistance: {
            value: musicStoneParameters.cameraDistance,
            label: 'minigame dist',
            min: 4,
            max: 30,
            step: 0.5,
            onChange: setParam('musicStoneParameters', 'cameraDistance'),
        },
        minigameHeight: {
            value: musicStoneParameters.cameraHeight,
            label: 'minigame height',
            min: 2,
            max: 30,
            step: 0.5,
            onChange: setParam('musicStoneParameters', 'cameraHeight'),
        },
        talkDistance: {
            value: musicStoneParameters.dialogueCameraDistance,
            label: 'char-talk dist',
            min: 2,
            max: 20,
            step: 0.5,
            onChange: setParam('musicStoneParameters', 'dialogueCameraDistance'),
        },
        talkHeight: {
            value: musicStoneParameters.dialogueCameraHeight,
            label: 'char-talk height',
            min: 0.5,
            max: 14,
            step: 0.1,
            onChange: setParam('musicStoneParameters', 'dialogueCameraHeight'),
        },
    })

    useControls('Game.Camera Debug', {
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

    useControls('Debug.Loader Debug', {
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

    useControls('Game.Intro Camera', {
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
