import { useEffect } from 'react'
import { LEVA_SECTION_PATHS } from './controls/levaSectionPaths.js'
import { addSeeThroughValues, pushLevaValues, syncLevaFromStore, syncLevaSection } from './controls/levaSync.js'
import useStore from '../stores/useStore.jsx'
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
import { useSeeThroughControls } from './controls/useSeeThroughControls.js'

// ============================================================================================
// Leva debug panel — every tweakable in the game, in 12 sections (see debug/README.md for the
// list and the rules). Registration order == panel order. Controls write straight into the
// zustand store; LEVA_SECTION_PATHS (controls/levaSectionPaths.js) is the reverse map used to
// refresh the panel when the STORE changes from elsewhere (colour presets, the mobile loader
// overlay, HMR-restored state).
//
// NOT optional, despite the folder: this component also performs four things the shipped game
// needs — see debug/README.md. It may be hidden, but it must stay mounted.
// ============================================================================================

export default function DebugPanel() {
    const cameraParameters = useStore((state) => state.cameraParameters)
    const mobileUiParameters = useStore((state) => state.mobileUiParameters)
    const colorPresetParameters = useStore((state) => state.colorPresetParameters)
    const gameUiParameters = useStore((state) => state.gameUiParameters)
    const edgeParameters = useStore((state) => state.edgeParameters)
    const propRimParameters = useStore((state) => state.propRimParameters)


    // Production: paint the scene in the selected theme (see world/useInitialTheme.js) — called
    // before the sync below so the sync reads the applied palette.
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

    // NB: loaderDebugParameters has no panel section any more (the Loader Debug controls were
    // hidden), so there is nothing to mirror — but the group itself is live shipped config that
    // drives the desktop loading ring and the locked hat shot. Do not delete it.

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

    // The Leva sections. CALL ORDER IS PANEL ORDER — moving one of these lines moves that
    // section in the panel.
    useDebugControls() // Debug — first, because it holds the toggles reached most often
    useColorsControls() // Colors
    useWorldControls() // World
    useGrassControls() // Grass
    usePropsControls() // Props
    useCharactersControls() // Characters
    useLanternControls() // Lantern
    useGameControls() // Game
    useAudioControls() // Audio
    useSeeThroughControls() // See-Through
    usePostControls() // Post
    useDesktopControls() // Desktop
    useMobileControls() // Mobile

    return null
}
