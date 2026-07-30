import { folder, useControls } from 'leva'
import { levaSync, setParam } from './levaSync.js'
import useStore from '../../stores/useStore.jsx'
import { THEME_OPTIONS } from '../../config/colorPresets.js'
import { startThemeTransition } from '../../game/themeTransition.js'

export function useColorsControls() {
    const colorPresetParameters = useStore((state) => state.colorPresetParameters)
    const themeTransitionParameters = useStore((state) => state.themeTransitionParameters)

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
                textureScale: { value: themeTransitionParameters.textureScale, min: 0.05, max: 8, step: 0.05, label: 'paintery scale', onChange: setParam('themeTransitionParameters', 'textureScale') },
                perlinScale: { value: themeTransitionParameters.perlinScale, min: 0.5, max: 40, step: 0.5, onChange: setParam('themeTransitionParameters', 'perlinScale') },
                perlinDetail: { value: themeTransitionParameters.perlinDetail, min: 1, max: 5, step: 1, onChange: setParam('themeTransitionParameters', 'perlinDetail') },
            },
            { collapsed: true }
        ),
    }, { collapsed: true })
}
