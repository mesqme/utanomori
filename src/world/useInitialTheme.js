import { useEffect } from 'react'

import useStore from '../stores/useStore.jsx'
import { applyGlobalTheme } from '../config/colorPresets.js'

// Module scope on purpose: this must run once per real page load, not on every HMR re-mount —
// re-applying the theme mid-session would clobber whatever colours are being tuned live.
let initialThemeApplied = false

/**
 * Paint the scene in the selected colour theme on load.
 *
 * PRODUCTION BEHAVIOUR, not debug. The theme dropdown (and the in-game day/night button) are the
 * source of truth for colours; sceneStyles is only the untouched base they overlay. Without this
 * the game opens in the raw base palette.
 *
 * It is called from the debug panel purely because that is where the theme controls live — which
 * is exactly why the panel must stay mounted even when hidden.
 */
export function useInitialTheme() {
    useEffect(() => {
        if (initialThemeApplied) return
        initialThemeApplied = true
        applyGlobalTheme(useStore.getState().colorPresetParameters.theme)
    }, [])
}
