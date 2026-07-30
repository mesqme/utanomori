import { gsap } from 'gsap'

import useStore from '../stores/useStore.jsx'
import { GLOBAL_THEMES, applyGlobalTheme } from '../config/colorPresets.js'
import { themeMask } from '../world/state/themeMask.js'

// Smooth day/night (theme) switching — the PORTAL transition: a LIVE in-shader mask where a torn
// paintery circle grows from the screen centre; inside it every themed material shows the new
// palette, outside the old — and the world keeps moving on BOTH sides (no frozen frame).
// See world/state/themeMask.js. All theme-managed colours are UNIFORM-driven, so nothing rebuilds.

// Progress curve of the sweep. 'Fast start' makes the switch respond the moment it's clicked
// (a slow-in ease looked like a delay before anything happened).
const EASING = {
    'Fast start': 'power2.out',
    Smooth: 'power1.inOut',
    'Slow start': 'power2.inOut',
    Linear: 'none',
}

// Snapshot the themed values the dual-palette materials mix FROM during a masked transition.
// EVERY theme-managed value is covered — world surfaces (grass / terrain / props / sky / grade)
// and the small items (hero, sheep, tree eyes, music-stone rim, star tint) alike.
function captureThemeSnapshot() {
    const s = useStore.getState()
    const heroColors = {}
    for (const [slot, m] of Object.entries(s.characterMaterialParameters.materials)) {
        if (m?.baseColor) heroColors[slot] = m.baseColor
    }
    const sheepColors = {}
    for (const [music, groups] of Object.entries(s.sheepMaterialParameters.characters)) {
        sheepColors[music] = {}
        for (const [group, g] of Object.entries(groups)) {
            if (g?.baseColor) sheepColors[music][group] = g.baseColor
        }
    }
    return {
        grassBase: s.grassParameters.colorBase,
        grassBrightness: s.grassParameters.baseBrightness,
        lightenColor: s.grassParameters.lightenColor,
        tintCyan: s.grassPatchParameters.tintColorCyan,
        tintViolet: s.grassPatchParameters.tintColorViolet,
        tintYellow: s.grassPatchParameters.tintColorYellow,
        tintGreen: s.grassPatchParameters.tintColorGreen,
        terrainColor: s.terrainParameters.color,
        terrainBrightness: s.terrainParameters.baseBrightness,
        terrainTextureContrast: s.terrainParameters.groundTextureContrast,
        treeColor: s.objectParameters.treeColor,
        trunkColor: s.objectParameters.treeTrunkColor,
        stoneTint: s.objectParameters.stoneTint,
        mushroomCap: s.objectParameters.mushroomCapColor,
        mushroomLeg: s.objectParameters.mushroomLegColor,
        treeVariation: s.objectParameters.treeColorVariation,
        stoneVariation: s.objectParameters.stoneColorVariation,
        mushroomVariation: s.objectParameters.mushroomColorVariation,
        stoneGradientColor: s.objectParameters.stoneGradientColor,
        rimStone: s.propRimParameters.stoneColor,
        rimTrunk: s.propRimParameters.trunkColor,
        rimMushroom: s.propRimParameters.mushroomColor,
        edgeColor: s.edgeParameters.color,
        bgColor: s.backgroundParameters.backgroundColor,
        skyMixColor: s.backgroundParameters.skyMixColor,
        skyMixAmount: s.backgroundParameters.skyMixAmount,
        starsEnabled: s.backgroundParameters.starsEnabled,
        starColor: s.backgroundParameters.starColor,
        rimMusicStone: s.propRimParameters.musicStoneColor,
        treeEyeColor: s.treeEyesParameters.eyeColor,
        heroColors,
        sheepColors,
        // The RESOLVED active display grade (the themes patch the HIGH preset; LOW isn't themed).
        gradeSaturation: s.colorGradeParameters.highBrightnessMode ? s.colorGradeParameters.highSaturation : s.colorGradeParameters.lowSaturation,
        gradeWarmth: s.colorGradeParameters.highBrightnessMode ? s.colorGradeParameters.highWarmth : s.colorGradeParameters.lowWarmth,
        gradeBrightness: s.colorGradeParameters.highBrightnessMode ? s.colorGradeParameters.highBrightness : s.colorGradeParameters.lowBrightness,
    }
}

// Switch to a theme through the portal. Safe to spam-click: a running transition finishes
// instantly and the new one begins from the live palette.
export function startThemeTransition(name, params = {}) {
    if (!GLOBAL_THEMES[name]) return
    const duration = params.duration ?? 3.0
    const ease = EASING[params.easing] ?? EASING['Fast start']

    // Commit the SELECTION immediately (colours follow over the transition): the day/night icon
    // flips right away, and a mid-transition click reads the new state → it targets the OTHER
    // theme, so rapid clicks bounce back and forth instead of re-running the same switch.
    useStore.setState((s) => ({
        colorPresetParameters: { ...s.colorPresetParameters, theme: name, ...GLOBAL_THEMES[name].presets },
    }))

    if (themeMask.active) {
        gsap.killTweensOf(themeMask)
        themeMask.active = false
        themeMask.old = null
    }

    // Live in-shader mask: snapshot the current palette (BEFORE applying — the materials mix
    // from it), switch the store instantly, then sweep the mask. The world never freezes.
    themeMask.old = captureThemeSnapshot()
    themeMask.progress = 0
    themeMask.active = true
    applyGlobalTheme(name)
    gsap.to(themeMask, {
        progress: 1,
        duration: Math.max(0.1, duration),
        ease,
        onComplete: () => {
            themeMask.active = false
            themeMask.old = null
        },
    })
}
