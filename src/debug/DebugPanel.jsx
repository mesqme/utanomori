import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { folder } from 'leva'
import { LEVA_SECTION_PATHS } from './controls/levaSectionPaths.js'
import { addSeeThroughValues, pushLevaValues, setParam, syncLevaFromStore, syncLevaSection } from './controls/levaSync.js'
import useStore from '../stores/useStore.jsx'
import { useIsMobile } from '../config/mobile.js'
import { useInitialTheme } from '../world/useInitialTheme.js'
import { useSeeThroughDefaults } from '../world/useSeeThroughDefaults.js'
import { useUiCssVariables } from '../ui/useUiCssVariables.js'
import { updateEdgeUniforms } from '../materials/edgeUniforms.js'
import { useColorsControls } from './controls/useColorsControls.js'
import { useWorldControls } from './controls/useWorldControls.js'
import { useGrassControls } from './controls/useGrassControls.js'
import { usePropsControls } from './controls/usePropsControls.js'
import { useCharactersControls } from './controls/useCharactersControls.js'
import { useLanternControls } from './controls/useLanternControls.js'
import { useGameControls } from './controls/useGameControls.js'
import { useAudioControls } from './controls/useAudioControls.js'
import { usePostControls } from './controls/usePostControls.js'
import { useDesktopControls } from './controls/useDesktopControls.js'
import { useMobileControls } from './controls/useMobileControls.js'
import { useDebugControls } from './controls/useDebugControls.js'

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

    // The twelve Leva sections. CALL ORDER IS PANEL ORDER — moving one of these lines
    // moves that section in the panel.
    useColorsControls() // Colors
    useWorldControls() // World
    useGrassControls() // Grass
    usePropsControls() // Props
    useCharactersControls() // Characters
    useLanternControls() // Lantern
    useGameControls() // Game
    useAudioControls() // Audio
    usePostControls() // Post
    useDesktopControls() // Desktop
    useMobileControls() // Mobile
    useDebugControls() // Debug

    return null
}
