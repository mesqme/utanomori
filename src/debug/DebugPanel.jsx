import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { button, folder, useControls } from 'leva'
import { LEVA_SECTION_PATHS } from './controls/levaSectionPaths.js'
import { addSeeThroughValues, levaSync, pushLevaValues, setParam, syncLevaFromStore, syncLevaSection } from './controls/levaSync.js'
import useStore from '../stores/useStore.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions from '../stores/useCompanions.jsx'
import { useIsMobile } from '../config/mobile.js'
import { seeThrough } from '../world/state/seeThrough.js'
import { useInitialTheme } from '../world/useInitialTheme.js'
import { useSeeThroughDefaults } from '../world/useSeeThroughDefaults.js'
import { useUiCssVariables } from '../ui/useUiCssVariables.js'
import { updateEdgeUniforms } from '../materials/edgeUniforms.js'
import { mainCharacterMaterialGroups } from '../config/mainCharacterMaterials.js'
import { painterlyTextureOptions, stylizedDebugModes } from '../config/stylizedMaterialDefaults.js'
import { PAINTERY_TEXTURE_IDS } from '../config/painteryTextures.js'
import { GROUND_TEXTURE_IDS, BACKGROUND_TEXTURE_IDS } from '../config/surfaceTextures.js'
import { THEME_OPTIONS } from '../config/colorPresets.js'
import { startThemeTransition } from '../game/themeTransition.js'

// ============================================================================================
// Leva debug panel — every tweakable in the game, in 12 sections (see debug/README.md for the
// list and the rules). Registration order == panel order. Controls write straight into the
// zustand store (setParam); LEVA_SECTION_PATHS below is the reverse map (store → Leva) used to
// refresh the panel when the STORE changes from elsewhere (colour presets, the mobile loader
// overlay, HMR-restored state).
//
// NOT optional, despite the folder: this component also performs four things the shipped game
// needs — see debug/README.md. It may be hidden, but it must stay mounted.
// ============================================================================================



// Apply the default colour theme only once per real page load (not on HMR re-mounts, which would
// clobber live tweaks). Module scope so it survives component re-mounts within a session.


export default function DebugPanel() {
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
    const colorPresetParameters = useStore((state) => state.colorPresetParameters)
    const themeTransitionParameters = useStore((state) => state.themeTransitionParameters)
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


    // Mount: apply the selected colour theme so the scene opens in that palette (the theme dropdown /
    // in-game day-night toggle are the source of truth for colours), then force the panel to match the
    // live store. Guarded by a module flag so it runs once on the real page load, not on every HMR
    // re-mount (which would clobber live colour tweaks). sceneStyles stays the untouched base.
    // Production: paint the scene in the selected theme (see world/useInitialTheme.js). Called
    // before the panel sync below so the sync reads the applied palette.
    useInitialTheme()

    useEffect(() => {
        syncLevaFromStore()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // A theme/preset was applied from ANYWHERE (the Colors dropdowns here, or the in-game day/night
    // toggle in the HUD) → refresh every affected picker in the panel.
    useEffect(() => {
        syncLevaFromStore()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorPresetParameters])

    // Store changed elsewhere → refresh the affected panel section.
    useEffect(() => {
        syncLevaSection('Debug.Camera Debug', cameraParameters, LEVA_SECTION_PATHS['Camera Debug'])
    }, [cameraParameters])

    useEffect(() => {
        syncLevaSection('Debug.Loader Debug', loaderDebugParameters, LEVA_SECTION_PATHS['Loader Debug'])
    }, [loaderDebugParameters])

    // The mobile loader overlay (touch −/+ buttons) writes mobileUiParameters — mirror it in the panel.
    useEffect(() => {
        syncLevaSection('Mobile.Loader', mobileUiParameters, LEVA_SECTION_PATHS['Mobile Loader'])
    }, [mobileUiParameters])

    useEffect(() => {
        syncLevaSection('Desktop.UI', gameUiParameters, LEVA_SECTION_PATHS['Game UI'])
    }, [gameUiParameters])

    useEffect(() => {
        updateEdgeUniforms(edgeParameters)
    }, [edgeParameters])

    useEffect(() => {
        syncLevaSection('Props.Rim Light', propRimParameters, LEVA_SECTION_PATHS['Rim Light'])
    }, [propRimParameters])

    // Production: the DOM UI size tokens (see ui/useUiCssVariables.js).
    useUiCssVariables()

    // Production: seed the shared see-through settings (see world/useSeeThroughDefaults.js).
    useSeeThroughDefaults()

    // …then mirror them into the panel so the sliders read back the real values.
    useEffect(() => {
        const values = {}
        addSeeThroughValues(values)
        pushLevaValues(values)
    }, [])

    // ======================================================================================
    // Colors — the global theme (recolours EVERYTHING via the animated transition). The ship
    // set is Night Forest ↔ Daylight (the in-game day/night button) + Amethyst Dusk, which is
    // only reachable from this dropdown. Individual colours live in World / Grass / Props.
    // ======================================================================================
    const selectTheme = (value, _, context) => {
        if (levaSync.active || context?.initial) return
        // Same animated switch as the in-game day/night button; the [colorPresetParameters]
        // effect re-syncs this picker.
        startThemeTransition(value, useStore.getState().themeTransitionParameters)
    }

    useControls('Colors', {
        theme: { value: colorPresetParameters.theme, options: THEME_OPTIONS, label: 'theme (all colors)', onChange: selectTheme },
        // How the theme switch animates (the in-game day/night button + the dropdown above).
        Transition: folder(
            {
                duration: { value: themeTransitionParameters.duration, min: 0.2, max: 4, step: 0.05, onChange: setParam('themeTransitionParameters', 'duration') },
                easing: { value: themeTransitionParameters.easing, options: ['Fast start', 'Smooth', 'Slow start', 'Linear'], onChange: setParam('themeTransitionParameters', 'easing') },
                edgeStyle: { value: themeTransitionParameters.edgeStyle, options: ['Paintery', 'Perlin'], onChange: setParam('themeTransitionParameters', 'edgeStyle') },
                band: { value: themeTransitionParameters.band, min: 0.01, max: 0.8, step: 0.01, label: 'edge band', onChange: setParam('themeTransitionParameters', 'band') },
                bleed: { value: themeTransitionParameters.bleed, min: 0, max: 1, step: 0.01, onChange: setParam('themeTransitionParameters', 'bleed') },
                textureScale: { value: themeTransitionParameters.textureScale, min: 0.05, max: 8, step: 0.05, label: 'paintery scale', onChange: setParam('themeTransitionParameters', 'textureScale') },
                perlinScale: { value: themeTransitionParameters.perlinScale, min: 0.5, max: 40, step: 0.5, onChange: setParam('themeTransitionParameters', 'perlinScale') },
                perlinDetail: { value: themeTransitionParameters.perlinDetail, min: 1, max: 5, step: 1, onChange: setParam('themeTransitionParameters', 'perlinDetail') },
            },
            { collapsed: true }
        ),
    })

    // ======================================================================================
    // World — terrain, sky, world border, roads, wind.
    // ======================================================================================
    useControls('World.Terrain', {
        groundTexture: { value: terrainParameters.groundTextureEnabled, onChange: setParam('terrainParameters', 'groundTextureEnabled') },
        groundTextureName: { value: terrainParameters.groundTextureName, options: GROUND_TEXTURE_IDS, onChange: setParam('terrainParameters', 'groundTextureName') },
        color: { value: terrainParameters.color, onChange: setParam('terrainParameters', 'color') },
        baseBrightness: { value: terrainParameters.baseBrightness, min: 0, max: 2, step: 0.01, onChange: setParam('terrainParameters', 'baseBrightness') },
        shadowRadius: { value: terrainParameters.shadowRadius, min: 0.2, max: 4, step: 0.05, onChange: setParam('terrainParameters', 'shadowRadius') },
        shadowSoftness: { value: terrainParameters.shadowSoftness, min: 0, max: 1, step: 0.01, onChange: setParam('terrainParameters', 'shadowSoftness') },
        shadowDarkness: { value: terrainParameters.shadowDarkness, min: 0, max: 3, step: 0.05, onChange: setParam('terrainParameters', 'shadowDarkness') },
        segments: { value: terrainParameters.segments, min: 1, max: 100, step: 1, onChange: setParam('terrainParameters', 'segments') },
        groundTextureScale: { value: terrainParameters.groundTextureScale, min: 0.01, max: 2.0, step: 0.01, onChange: setParam('terrainParameters', 'groundTextureScale') },
        groundTextureContrast: { value: terrainParameters.groundTextureContrast, min: 0, max: 4.0, step: 0.01, onChange: setParam('terrainParameters', 'groundTextureContrast') },
        chunkSize: { value: terrainParameters.chunkSize, min: 2, max: 50, step: 1, onChange: setParam('terrainParameters', 'chunkSize') },
    })

    useControls('World.Background', {
        backgroundColor: { value: backgroundParameters.backgroundColor, onChange: setParam('backgroundParameters', 'backgroundColor') },
        gradientTop: { value: backgroundParameters.gradientTopColor, onChange: setParam('backgroundParameters', 'gradientTopColor') },
        horizonColor: { value: backgroundParameters.horizonColor, onChange: setParam('backgroundParameters', 'horizonColor') },
        gradientIntensity: { value: backgroundParameters.gradientIntensity, min: 0, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'gradientIntensity') },
        gradientHeight: { value: backgroundParameters.gradientHeight, min: -1, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'gradientHeight') },
        gradientPower: { value: backgroundParameters.gradientPower, min: 0.1, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'gradientPower') },
        textureEnabled: { value: backgroundParameters.textureEnabled, onChange: setParam('backgroundParameters', 'textureEnabled') },
        backgroundTexture: { value: backgroundParameters.textureName, options: BACKGROUND_TEXTURE_IDS, onChange: setParam('backgroundParameters', 'textureName') },
        colorMode: { value: backgroundParameters.colorMode, options: ['Intensity', 'Color Mix', 'Both'], onChange: setParam('backgroundParameters', 'colorMode') },
        textureSize: { value: backgroundParameters.textureSize, min: 20, max: 2000, step: 1, onChange: setParam('backgroundParameters', 'textureSize') },
        textureLayer2: { value: backgroundParameters.textureLayer2, min: 0, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'textureLayer2') },
        textureYawParallax: { value: backgroundParameters.textureYawParallax ?? 400, min: -1500, max: 1500, step: 10, onChange: setParam('backgroundParameters', 'textureYawParallax') },
        texturePitchParallax: { value: backgroundParameters.texturePitchParallax ?? 400, min: -1500, max: 1500, step: 10, onChange: setParam('backgroundParameters', 'texturePitchParallax') },
        textureContrast: { value: backgroundParameters.textureContrast, min: 0, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'textureContrast') },
        textureBrightness: { value: backgroundParameters.textureBrightness, min: 0, max: 4, step: 0.01, onChange: setParam('backgroundParameters', 'textureBrightness') },
        textureMix: { value: backgroundParameters.textureMixIntensity, min: 0, max: 2, step: 0.01, onChange: setParam('backgroundParameters', 'textureMixIntensity') },
    })

    useControls('World.Stars', {
        starsEnabled: { value: backgroundParameters.starsEnabled, onChange: setParam('backgroundParameters', 'starsEnabled') },
        starColor: { value: backgroundParameters.starColor, onChange: setParam('backgroundParameters', 'starColor') },
        starCellSize: { value: backgroundParameters.starCellSize, min: 8, max: 120, step: 1, onChange: setParam('backgroundParameters', 'starCellSize') },
        starDensity: { value: backgroundParameters.starDensity, min: 0, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'starDensity') },
        starSize: { value: backgroundParameters.starSize, min: 0.01, max: 0.3, step: 0.005, onChange: setParam('backgroundParameters', 'starSize') },
        starBrightness: { value: backgroundParameters.starBrightness, min: 0, max: 4, step: 0.05, onChange: setParam('backgroundParameters', 'starBrightness') },
        starTwinkle: { value: backgroundParameters.starTwinkleSpeed, min: 0, max: 6, step: 0.05, onChange: setParam('backgroundParameters', 'starTwinkleSpeed') },
        starRays: { value: backgroundParameters.starRays, min: 0, max: 2, step: 0.01, onChange: setParam('backgroundParameters', 'starRays') },
        starsFadeStart: { value: backgroundParameters.starsFadeStart, min: -1, max: 1, step: 0.01, onChange: setParam('backgroundParameters', 'starsFadeStart') },
        starsFadeWidth: { value: backgroundParameters.starsFadeWidth, min: 0.01, max: 1.5, step: 0.01, onChange: setParam('backgroundParameters', 'starsFadeWidth') },
        skyRotation: { value: backgroundParameters.rotationEnabled, onChange: setParam('backgroundParameters', 'rotationEnabled') },
        skyRotationSpeed: { value: backgroundParameters.rotationSpeed, min: -0.1, max: 0.1, step: 0.001, onChange: setParam('backgroundParameters', 'rotationSpeed') },
    })

    useControls('World.Border', {
        fadeMode: { value: borderParameters.fadeMode, options: ['Color', 'Dither', 'Paintery'], onChange: setParam('borderParameters', 'fadeMode') },
        nStrength: { value: borderParameters.noiseStrength, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'noiseStrength') },
        nScale: { value: borderParameters.noiseScale, min: 0.01, max: 1.0, step: 0.01, onChange: setParam('borderParameters', 'noiseScale') },
        radius: { value: borderParameters.circleRadiusFactor, min: 0.1, max: 1.0, step: 0.01, onChange: setParam('borderParameters', 'circleRadiusFactor') },
        edgeFade: { value: borderParameters.groundFadeOffset, min: 0, max: 3.0, step: 0.01, onChange: setParam('borderParameters', 'groundFadeOffset') },
        grassFade: { value: borderParameters.grassFadeOffset, min: 0.01, max: 5, step: 0.01, onChange: setParam('borderParameters', 'grassFadeOffset') },
        groundOffset: { value: borderParameters.groundOffset, min: -3.0, max: 3.0, step: 0.001, onChange: setParam('borderParameters', 'groundOffset') },
        pSize: { value: borderParameters.painterySize, min: 20, max: 2000, step: 1, onChange: setParam('borderParameters', 'painterySize') },
        pScreenBlend: { value: borderParameters.painteryScreenBlend, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'painteryScreenBlend') },
        pDrift: { value: borderParameters.painteryDrift, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'painteryDrift') },
        pLayer2: { value: borderParameters.painteryLayer2Scale, min: 0, max: 6, step: 0.05, onChange: setParam('borderParameters', 'painteryLayer2Scale') },
        pBleed: { value: borderParameters.painteryBleed, min: 0, max: 1, step: 0.01, onChange: setParam('borderParameters', 'painteryBleed') },
    })

    useControls('World.Roads', {
        enabled: { value: roadParameters.enabled, onChange: setParam('roadParameters', 'enabled') },
        worldSeed: { value: roadParameters.worldSeed, step: 1, onChange: setParam('roadParameters', 'worldSeed') },
        laneSpacing: { value: roadParameters.laneSpacing, min: 6, max: 80, step: 0.5, onChange: setParam('roadParameters', 'laneSpacing') },
        nodeSpacing: { value: roadParameters.nodeSpacing, min: 3, max: 40, step: 0.5, onChange: setParam('roadParameters', 'nodeSpacing') },
        meander: { value: roadParameters.meanderStrength, min: 0, max: 20, step: 0.1, onChange: setParam('roadParameters', 'meanderStrength') },
        width: { value: roadParameters.width, min: 0.1, max: 8, step: 0.05, onChange: setParam('roadParameters', 'width') },
        softness: { value: roadParameters.softness, min: 0.01, max: 4, step: 0.01, onChange: setParam('roadParameters', 'softness') },
        grassMinScale: { value: roadParameters.grassMinScale, min: 0, max: 1, step: 0.01, onChange: setParam('roadParameters', 'grassMinScale') },
        groundBrightness: { value: roadParameters.groundBrightness, min: -1, max: 2, step: 0.01, onChange: setParam('roadParameters', 'groundBrightness') },
        groundNoiseScale: { value: roadParameters.groundNoiseScale, min: 0.01, max: 2, step: 0.01, onChange: setParam('roadParameters', 'groundNoiseScale') },
        groundNoiseStrength: { value: roadParameters.groundNoiseStrength, min: 0, max: 2, step: 0.01, onChange: setParam('roadParameters', 'groundNoiseStrength') },
        groundEdgeSharpness: { value: roadParameters.groundEdgeSharpness, min: 0, max: 1, step: 0.01, onChange: setParam('roadParameters', 'groundEdgeSharpness') },
    })

    // One wind home: the grass field wind + the tree sway (different systems, same weather).
    useControls('World.Wind', {
        direction: { value: windParameters.direction, min: -Math.PI, max: Math.PI, step: 0.01, onChange: setParam('windParameters', 'direction') },
        scale: { value: windParameters.scale, min: 0, max: 3, step: 0.01, onChange: setParam('windParameters', 'scale') },
        strength: { value: windParameters.strength, min: 0, max: 2, step: 0.01, onChange: setParam('windParameters', 'strength') },
        speed: { value: windParameters.speed, min: 0, max: 5, step: 0.01, onChange: setParam('windParameters', 'speed') },
        treeStrength: { value: objectParameters.treeWindStrength, min: 0, max: 0.008, step: 0.0001, onChange: setParam('objectParameters', 'treeWindStrength') },
        treeSpeed: { value: objectParameters.treeWindSpeed, min: 0, max: 4, step: 0.05, onChange: setParam('objectParameters', 'treeWindSpeed') },
        treeGust: { value: objectParameters.treeWindGust, min: 0, max: 1, step: 0.02, onChange: setParam('objectParameters', 'treeWindGust') },
    })

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
    })

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
    })

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
    })

    useControls(
        'Grass.Trail Dissolve',
        grassLayerControls('dissolve', {
            mode: { value: grassParameters.dissolveMode, options: ['Alpha', 'Dither'], onChange: setParam('grassParameters', 'dissolveMode') },
        })
    )

    useControls(
        'Grass.Trail Lighten',
        grassLayerControls('lighten', {
            color: { value: grassParameters.lightenColor, onChange: setParam('grassParameters', 'lightenColor') },
        })
    )

    useControls('Grass.Trail Scale', grassLayerControls('scale'))

    useControls('Grass.Trail Lean', grassLayerControls('lean'))

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
    })

    useControls('Props.Trees', {
        treeSize: { value: objectParameters.treeSize, min: 0.2, max: 4, step: 0.05, onChange: setParam('objectParameters', 'treeSize') },
        treeYOffset: { value: objectParameters.treeYOffset, min: -1, max: 2, step: 0.05, onChange: setParam('objectParameters', 'treeYOffset') },
        treeColor: { value: objectParameters.treeColor, onChange: setParam('objectParameters', 'treeColor') },
        treeTrunkColor: { value: objectParameters.treeTrunkColor, onChange: setParam('objectParameters', 'treeTrunkColor') },
        treeColorVariation: { value: objectParameters.treeColorVariation, min: 0, max: 0.6, step: 0.01, onChange: setParam('objectParameters', 'treeColorVariation') },
    })

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
    })

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
    })

    // The shared triplanar painterly brush on every prop's surface.
    useControls('Props.Surface', {
        painterly: { value: objectParameters.painterlyEnabled, onChange: setParam('objectParameters', 'painterlyEnabled') },
        painterlyTexture: { value: objectParameters.textureName, options: PAINTERY_TEXTURE_IDS, onChange: setParam('objectParameters', 'textureName') },
        painterlyScale: { value: objectParameters.painterlyScale, min: 0, max: 0.5, step: 0.01, onChange: setParam('objectParameters', 'painterlyScale') },
        painterlyContrast: { value: objectParameters.painterlyContrast, min: 0, max: 10, step: 0.01, onChange: setParam('objectParameters', 'painterlyContrast') },
        painterlyBrightness: { value: objectParameters.painterlyBrightness, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'painterlyBrightness') },
        painterlyTint: { value: objectParameters.painterlyColorStrength, min: 0, max: 1, step: 0.01, onChange: setParam('objectParameters', 'painterlyColorStrength') },
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

    // Fresnel colour rim on the hard-surface props (trunks / stones / mushrooms / music stones).
    useControls('Props.Rim Light', {
        enabled: { value: propRimParameters.enabled, onChange: setParam('propRimParameters', 'enabled') },
        stoneColor: { value: propRimParameters.stoneColor, onChange: setParam('propRimParameters', 'stoneColor') },
        trunkColor: { value: propRimParameters.trunkColor, onChange: setParam('propRimParameters', 'trunkColor') },
        mushroomColor: { value: propRimParameters.mushroomColor, onChange: setParam('propRimParameters', 'mushroomColor') },
        musicStoneColor: { value: propRimParameters.musicStoneColor, onChange: setParam('propRimParameters', 'musicStoneColor') },
        strength: { value: propRimParameters.strength, min: 0, max: 3, step: 0.01, onChange: setParam('propRimParameters', 'strength') },
        power: { value: propRimParameters.power, min: 0.2, max: 8, step: 0.1, onChange: setParam('propRimParameters', 'power') },
    })

    useControls('Props.Tree Eyes', {
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
    })

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
        pColor: { value: characterMaterialParameters.painterlyColor, onChange: setParam('characterMaterialParameters', 'painterlyColor') },
        pTint: { value: characterMaterialParameters.painterlyColorStrength, min: 0, max: 1, step: 0.01, onChange: setParam('characterMaterialParameters', 'painterlyColorStrength') },
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
        debugUv1: { value: characterEyesParameters.debugUv1, onChange: setParam('characterEyesParameters', 'debugUv1') },
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
        Material: folder(
            {
                painterlyEnabled: { value: sheepMaterialParameters.painterlyEnabled, onChange: setParam('sheepMaterialParameters', 'painterlyEnabled') },
                painterlyBrightnessVariation: { value: sheepMaterialParameters.painterlyBrightnessVariation, min: 0, max: 1.5, step: 0.02, onChange: setParam('sheepMaterialParameters', 'painterlyBrightnessVariation') },
                painterlyScale: { value: sheepMaterialParameters.painterlyScale, min: 0.01, max: 1, step: 0.01, onChange: setParam('sheepMaterialParameters', 'painterlyScale') },
                painterlyContrast: { value: sheepMaterialParameters.painterlyContrast, min: 0.5, max: 2, step: 0.01, onChange: setParam('sheepMaterialParameters', 'painterlyContrast') },
            },
            { collapsed: true }
        ),
    })

    // ======================================================================================
    // Lantern — the hero's lantern: flame + glow sprite, its pool of light on the ground,
    // and how the grass reacts under it.
    // ======================================================================================
    useControls('Lantern.Fire & Glow', {
        fireEnabled: { value: lanternFireParameters.enabled, onChange: setParam('lanternFireParameters', 'enabled') },
        Flame: folder(
            {
                fireOffsetX: { value: lanternFireParameters.fireOffsetX, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'fireOffsetX') },
                fireOffsetY: { value: lanternFireParameters.fireOffsetY, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'fireOffsetY') },
                fireOffsetZ: { value: lanternFireParameters.fireOffsetZ, min: -1, max: 1, step: 0.005, onChange: setParam('lanternFireParameters', 'fireOffsetZ') },
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
    })

    useControls('Lantern.Ground Light', {
        radius: { value: lanternGroundLightParameters.radius, min: 0.25, max: 15, step: 0.05, onChange: setParam('lanternGroundLightParameters', 'radius') },
        edgeSoftness: { value: lanternGroundLightParameters.edgeSoftness, min: 0, max: 4, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'edgeSoftness') },
        edgeNoiseScale: { value: lanternGroundLightParameters.edgeNoiseScale, min: 0.01, max: 3, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'edgeNoiseScale') },
        edgeNoiseStrength: { value: lanternGroundLightParameters.edgeNoiseStrength, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'edgeNoiseStrength') },
        innerBrightness: { value: lanternGroundLightParameters.innerBrightness, min: 0, max: 2, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'innerBrightness') },
        outerDarkness: { value: lanternGroundLightParameters.outerDarkness, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGroundLightParameters', 'outerDarkness') },
    })

    useControls('Lantern.Grass React', {
        grassEnabled: { value: lanternGrassParameters.enabled, onChange: setParam('lanternGrassParameters', 'enabled') },
        grassRadius: { value: lanternGrassParameters.radius, min: 0, max: 6, step: 0.05, onChange: setParam('lanternGrassParameters', 'radius') },
        grassSoftness: { value: lanternGrassParameters.softness, min: 0, max: 4, step: 0.05, onChange: setParam('lanternGrassParameters', 'softness') },
        grassScale: { value: lanternGrassParameters.scale, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGrassParameters', 'scale') },
        grassAlpha: { value: lanternGrassParameters.alpha, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGrassParameters', 'alpha') },
        grassColor: { value: lanternGrassParameters.color, onChange: setParam('lanternGrassParameters', 'color') },
        grassColorAmount: { value: lanternGrassParameters.colorAmount, min: 0, max: 1, step: 0.01, onChange: setParam('lanternGrassParameters', 'colorAmount') },
    })

    // ======================================================================================
    // Game — the song mini-game staging, companion notes/emotes, the target arrow, and the
    // intro camera travel.
    // ======================================================================================
    useControls('Game.Minigame', {
        'Note colours': folder(
            {
                note1: { value: musicStoneParameters.color0, onChange: setParam('musicStoneParameters', 'color0') },
                note2: { value: musicStoneParameters.color1, onChange: setParam('musicStoneParameters', 'color1') },
                note3: { value: musicStoneParameters.color2, onChange: setParam('musicStoneParameters', 'color2') },
                note4: { value: musicStoneParameters.color3, onChange: setParam('musicStoneParameters', 'color3') },
                note5: { value: musicStoneParameters.color4, onChange: setParam('musicStoneParameters', 'color4') },
                note6: { value: musicStoneParameters.color5, onChange: setParam('musicStoneParameters', 'color5') },
                note7: { value: musicStoneParameters.color6, onChange: setParam('musicStoneParameters', 'color6') },
            },
            { collapsed: true }
        ),
        // Desktop rainbow-arc staging (mobile line/grid staging lives under Mobile → Stones).
        Stones: folder(
            {
                radius: { value: musicStoneParameters.radius, min: 1, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'radius') },
                scale: { value: musicStoneParameters.scale, min: 0.1, max: 3, step: 0.05, onChange: setParam('musicStoneParameters', 'scale') },
                yOffset: { value: musicStoneParameters.yOffset, min: -2, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'yOffset') },
                hoverHeight: { value: musicStoneParameters.hoverHeight, min: 0, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'hoverHeight') },
                bobAmount: { value: musicStoneParameters.bobAmount, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'bobAmount') },
                bobSpeed: { value: musicStoneParameters.bobSpeed, min: 0, max: 5, step: 0.05, onChange: setParam('musicStoneParameters', 'bobSpeed') },
                floatRotate: { value: musicStoneParameters.floatRotate, onChange: setParam('musicStoneParameters', 'floatRotate') },
                floatRotateAmount: { value: musicStoneParameters.floatRotateAmount, min: 0, max: 0.6, step: 0.01, onChange: setParam('musicStoneParameters', 'floatRotateAmount') },
            },
            { collapsed: true }
        ),
        Reactions: folder(
            {
                flashBoost: { value: musicStoneParameters.flashBoost, min: 0, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'flashBoost') },
                flashDuration: { value: musicStoneParameters.flashDuration, min: 0.05, max: 2, step: 0.01, onChange: setParam('musicStoneParameters', 'flashDuration') },
                hoverBoost: { value: musicStoneParameters.hoverBoost, min: 0, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'hoverBoost') },
                hoverScale: { value: musicStoneParameters.hoverScale, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'hoverScale') },
                hoverProxyRadius: { value: musicStoneParameters.hoverProxyRadius, min: 0.5, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'hoverProxyRadius') },
            },
            { collapsed: true }
        ),
        Flow: folder(
            {
                listenTempo: { value: musicStoneParameters.listenTempo, min: 0.5, max: 4, step: 0.05, onChange: setParam('musicStoneParameters', 'listenTempo') },
                notePlayDuration: { value: musicStoneParameters.notePlayDuration, min: 0.2, max: 3, step: 0.05, onChange: setParam('musicStoneParameters', 'notePlayDuration') },
                alwaysSixNotes: { value: musicStoneParameters.alwaysSixNotes, onChange: setParam('musicStoneParameters', 'alwaysSixNotes') },
                roundClearPause: { value: musicStoneParameters.roundClearPause, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'roundClearPause') },
                countdownFrom: { value: musicStoneParameters.countdownFrom, min: 1, max: 5, step: 1, onChange: setParam('musicStoneParameters', 'countdownFrom') },
                countdownStep: { value: musicStoneParameters.countdownStep, min: 0.3, max: 1.5, step: 0.05, onChange: setParam('musicStoneParameters', 'countdownStep') },
                staggerDelay: { value: musicStoneParameters.staggerDelay, min: 0, max: 1, step: 0.01, onChange: setParam('musicStoneParameters', 'staggerDelay') },
                scaleInDuration: { value: musicStoneParameters.scaleInDuration, min: 0.1, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'scaleInDuration') },
                scaleOutDuration: { value: musicStoneParameters.scaleOutDuration, min: 0.1, max: 2, step: 0.05, onChange: setParam('musicStoneParameters', 'scaleOutDuration') },
            },
            { collapsed: true }
        ),
        // Camera lerp + look-at during the game; distances live in Desktop/Mobile → Camera.
        'Camera & Pointer': folder(
            {
                cameraLerp: { value: musicStoneParameters.cameraLerp, min: 0.5, max: 10, step: 0.1, onChange: setParam('musicStoneParameters', 'cameraLerp') },
                dialogueTargetY: { value: musicStoneParameters.dialogueTargetY, min: 0, max: 4, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueTargetY') },
                pointerRadius: { value: musicStoneParameters.pointerRadius, min: 0, max: 6, step: 0.05, onChange: setParam('musicStoneParameters', 'pointerRadius') },
                seeThroughEnabled: { value: musicStoneParameters.seeThroughEnabled, onChange: setParam('musicStoneParameters', 'seeThroughEnabled') },
                seeThroughRadius: { value: musicStoneParameters.seeThroughRadius, min: 1, max: 14, step: 0.1, onChange: setParam('musicStoneParameters', 'seeThroughRadius') },
            },
            { collapsed: true }
        ),
    })

    // Floating notes over a singing companion + the ♥/❗ feedback emotes.
    useControls('Game.Notes & Emotes', {
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

    useControls('Game.Intro Camera', {
        'redo the animation': button(() => replayIntro()),
        spiralDuration: { value: introCameraParameters.spiralDuration, min: 0.3, max: 8, step: 0.05, onChange: setParam('introCameraParameters', 'spiralDuration') },
        orbitDistance: { value: introCameraParameters.orbitDistance, min: 3, max: 40, step: 0.5, onChange: setParam('introCameraParameters', 'orbitDistance') },
    })

    // ======================================================================================
    // Audio — backing-track mixing + the ambient one-shots. (Note SOUNDS belong to the game
    // characters; only volumes/distances live here.)
    // ======================================================================================
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

    // ======================================================================================
    // Post — everything applied to the rendered image: colour grade, painterly camera FX,
    // the shared paintery brush texture bake, and dithering.
    // ======================================================================================
    useControls('Post.Color Grade', {
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

    useControls('Post.Painterly FX', {
        enabled: { value: painterlyPostParameters.enabled, onChange: setParam('painterlyPostParameters', 'enabled') },
        noiseSeed: { value: painterlyPostParameters.noiseSeed, min: 0, max: 100, step: 1, onChange: setParam('painterlyPostParameters', 'noiseSeed') },
        sensorNoise: { value: painterlyPostParameters.sensorNoiseEnabled, onChange: setParam('painterlyPostParameters', 'sensorNoiseEnabled') },
        lumaNoise: { value: painterlyPostParameters.luminanceNoise, min: 0, max: 0.2, step: 0.001, onChange: setParam('painterlyPostParameters', 'luminanceNoise') },
        chromaNoise: { value: painterlyPostParameters.chromaNoise, min: 0, max: 0.1, step: 0.001, onChange: setParam('painterlyPostParameters', 'chromaNoise') },
        sensorScale: { value: painterlyPostParameters.sensorNoiseScale, min: 1, max: 8, step: 1, onChange: setParam('painterlyPostParameters', 'sensorNoiseScale') },
    })

    useControls('Post.Brush Texture', {
        enabled: { value: painteryTextureParameters.enabled, onChange: setParam('painteryTextureParameters', 'enabled') },
        texture: { value: painteryTextureParameters.textureName, options: PAINTERY_TEXTURE_IDS, onChange: setParam('painteryTextureParameters', 'textureName') },
        blur: { value: painteryTextureParameters.blur, min: 0, max: 6, step: 0.1, onChange: setParam('painteryTextureParameters', 'blur') },
        levelsLow: { value: painteryTextureParameters.levelsLow, min: 0, max: 1, step: 0.01, onChange: setParam('painteryTextureParameters', 'levelsLow') },
        levelsHigh: { value: painteryTextureParameters.levelsHigh, min: 0, max: 1, step: 0.01, onChange: setParam('painteryTextureParameters', 'levelsHigh') },
        contrast: { value: painteryTextureParameters.contrast, min: 0.2, max: 12, step: 0.05, onChange: setParam('painteryTextureParameters', 'contrast') },
        posterize: { value: painteryTextureParameters.posterize, min: 0, max: 12, step: 1, onChange: setParam('painteryTextureParameters', 'posterize') },
    })

    useControls('Post.Dithering', {
        pixelSize: { value: ditheringParameters.pixelSize, min: 1, max: 10, step: 1, onChange: setParam('ditheringParameters', 'pixelSize') },
    })

    // ======================================================================================
    // Desktop — the desktop DOM-UI skin + camera distances.
    // ======================================================================================
    // The whole in-game UI skin (SpeechBubble + InteractionPrompt + SongGame HUD + key chips). Each
    // value is written to a CSS custom property on :root (see the effect above) so the DOM UI restyles
    // live.
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
            { collapsed: true }
        ),
        'Key chips': folder(
            {
                chipSize: { value: gameUiParameters.chipSize, min: 1, max: 6, step: 0.05, onChange: setParam('gameUiParameters', 'chipSize') },
                chipPadX: { value: gameUiParameters.chipPadX, min: 0, max: 3, step: 0.05, onChange: setParam('gameUiParameters', 'chipPadX') },
                chipBorder: { value: gameUiParameters.chipBorder, min: 0, max: 4, step: 0.25, onChange: setParam('gameUiParameters', 'chipBorder') },
                chipNudge: { value: gameUiParameters.chipNudge, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'chipNudge') },
                chipNudgeX: { value: gameUiParameters.chipNudgeX, min: -0.25, max: 0.25, step: 0.005, onChange: setParam('gameUiParameters', 'chipNudgeX') },
            },
            { collapsed: true }
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
    })

    // ALL desktop camera distances in one place — gameplay walk, the two dialogue framings, and the
    // mini-game top-down shot (the minigame/talk values live in musicStoneParameters).
    useControls('Desktop.Camera', {
        followDistance: { value: cameraParameters.followDistance, label: 'walk distance', min: 6, max: 32, step: 0.1, onChange: setParam('cameraParameters', 'followDistance') },
        followHeight: { value: cameraParameters.followHeight, label: 'walk height', min: 4, max: 28, step: 0.1, onChange: setParam('cameraParameters', 'followHeight') },
        frontDistance: { value: cameraParameters.frontDistance, label: 'intro-talk dist', min: 6, max: 32, step: 0.1, onChange: setParam('cameraParameters', 'frontDistance') },
        frontHeight: { value: cameraParameters.frontHeight, label: 'intro-talk height', min: 0.5, max: 16, step: 0.1, onChange: setParam('cameraParameters', 'frontHeight') },
        minigameDistance: { value: musicStoneParameters.cameraDistance, label: 'minigame dist', min: 4, max: 30, step: 0.5, onChange: setParam('musicStoneParameters', 'cameraDistance') },
        minigameHeight: { value: musicStoneParameters.cameraHeight, label: 'minigame height', min: 2, max: 30, step: 0.5, onChange: setParam('musicStoneParameters', 'cameraHeight') },
        talkDistance: { value: musicStoneParameters.dialogueCameraDistance, label: 'char-talk dist', min: 2, max: 20, step: 0.5, onChange: setParam('musicStoneParameters', 'dialogueCameraDistance') },
        talkHeight: { value: musicStoneParameters.dialogueCameraHeight, label: 'char-talk height', min: 0.5, max: 14, step: 0.1, onChange: setParam('musicStoneParameters', 'dialogueCameraHeight') },
    })

    // ======================================================================================
    // Mobile — everything specific to the touch experience.
    // ======================================================================================
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
        marginX: { value: joystickParameters.marginX, min: 0, max: 200, step: 2, label: 'marginX (landscape)', onChange: setParam('joystickParameters', 'marginX') },
        marginY: { value: joystickParameters.marginY, min: 0, max: 200, step: 2, label: 'marginY (landscape)', onChange: setParam('joystickParameters', 'marginY') },
        marginYPortrait: { value: joystickParameters.marginYPortrait, min: 0, max: 200, step: 2, label: 'marginY (portrait)', onChange: setParam('joystickParameters', 'marginYPortrait') },
        opacity: { value: joystickParameters.opacity, min: 0.1, max: 1, step: 0.05, onChange: setParam('joystickParameters', 'opacity') },
        deadzone: { value: joystickParameters.deadzone, min: 0, max: 0.5, step: 0.01, onChange: setParam('joystickParameters', 'deadzone') },
        // max > 1 on purpose: the default 1.01 DISABLES run (mag caps at 1.0). A max of 1 would make
        // Leva clamp the initial value to 1.0 on registration → run re-engages at full stick push.
        runThreshold: { value: joystickParameters.runThreshold, min: 0.5, max: 1.2, step: 0.01, onChange: setParam('joystickParameters', 'runThreshold') },
        baseColor: { value: joystickParameters.baseColor, onChange: setParam('joystickParameters', 'baseColor') },
        knobColor: { value: joystickParameters.knobColor, onChange: setParam('joystickParameters', 'knobColor') },
    })

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

    return null
}
