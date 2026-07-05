import * as THREE from 'three'
import { gsap } from 'gsap'

import useStore from '../stores/useStore.jsx'
import { GLOBAL_THEMES, applyGlobalTheme } from '../config/colorPresets.js'
import { themeMask } from '../world/utils/themeMask.js'

// Smooth day/night (theme) switching, selectable styles (themeTransitionParameters.mode):
//   'Fade'    — every changing value crossfades in the store; the scene morphs in place.
//   'Portal'  — LIVE in-shader mask: a torn paintery circle grows from the screen centre; inside
//               it every themed material shows the new palette, outside the old — and the world
//               keeps moving on BOTH sides (no frozen frame). See utils/themeMask.js.
//   'Wipe'    — same live mask, sweeping right → left.
//   'Dissolve'— same live mask, the whole screen erodes at once (rust-like).
// 'Instant' applies immediately.

// All theme-managed colours are UNIFORM-driven (grass palette + prop type colours moved out of the
// baked instance data), so the fade can lerp every value per frame — nothing rebuilds.
const isColor = (v) => typeof v === 'string' && v.startsWith('#')

// Progress curve for both the masked sweep and the value fade. 'Fast start' makes the switch
// respond the moment it's clicked (a slow-in ease looked like a delay before anything happened).
const EASING = {
    'Fast start': 'power2.out',
    Smooth: 'power1.inOut',
    'Slow start': 'power2.inOut',
    Linear: 'none',
}
const lerp = (a, b, t) => a + (b - a) * t
const _cA = new THREE.Color()
const _cB = new THREE.Color()
const lerpColor = (from, to, t) => '#' + _cA.set(from).lerp(_cB.set(to), t).getHexString()

let fadeTween = null

function killFade() {
    if (fadeTween) {
        fadeTween.kill()
        fadeTween = null
    }
}

// Value crossfade: lerp every param the target theme would change, from its LIVE value (so rapid
// back-and-forth clicks reverse smoothly mid-flight) to the theme's value.
function runFade(name, duration, ease) {
    const theme = GLOBAL_THEMES[name]
    const state = useStore.getState()

    // Flat patch entries. Booleans/enums snap at the midpoint.
    const entries = []
    for (const [group, values] of Object.entries(theme.patch)) {
        for (const [key, to] of Object.entries(values)) {
            const from = state[group]?.[key]
            if (from === undefined || from === to) continue
            const kind = isColor(to) ? 'color' : typeof to === 'number' ? 'number' : 'snap'
            entries.push({ group, key, from, to, kind })
        }
    }
    // Nested hero + sheep base colours (uniform-driven → free to lerp per frame).
    const hero = Object.entries(theme.heroMaterials ?? {})
        .map(([slot, to]) => ({ slot, from: state.characterMaterialParameters.materials[slot]?.baseColor, to }))
        .filter((entry) => entry.from && entry.from !== entry.to)
    const sheep = []
    for (const [music, groups] of Object.entries(theme.sheepColors ?? {})) {
        for (const [group, to] of Object.entries(groups)) {
            const from = state.sheepMaterialParameters.characters[music]?.[group]?.baseColor
            if (from && from !== to) sheep.push({ music, group, from, to })
        }
    }

    const anim = { t: 0 }
    let snapped = false

    fadeTween = gsap.to(anim, {
        t: 1,
        duration,
        ease,
        onUpdate: () => {
            const t = anim.t
            const doSnap = !snapped && t >= 0.5
            if (doSnap) snapped = true

            const next = {}
            for (const entry of entries) {
                if (entry.kind === 'snap') {
                    if (doSnap) (next[entry.group] ??= {})[entry.key] = entry.to
                } else {
                    ;(next[entry.group] ??= {})[entry.key] =
                        entry.kind === 'color' ? lerpColor(entry.from, entry.to, t) : lerp(entry.from, entry.to, t)
                }
            }

            useStore.setState((s) => {
                const merged = {}
                for (const [group, values] of Object.entries(next)) merged[group] = { ...s[group], ...values }
                if (hero.length) {
                    const materials = { ...s.characterMaterialParameters.materials }
                    for (const entry of hero) materials[entry.slot] = { ...materials[entry.slot], baseColor: lerpColor(entry.from, entry.to, t) }
                    merged.characterMaterialParameters = { ...s.characterMaterialParameters, materials }
                }
                if (sheep.length) {
                    const characters = { ...s.sheepMaterialParameters.characters }
                    for (const entry of sheep) {
                        characters[entry.music] = {
                            ...characters[entry.music],
                            [entry.group]: { ...characters[entry.music][entry.group], baseColor: lerpColor(entry.from, entry.to, t) },
                        }
                    }
                    merged.sheepMaterialParameters = { ...s.sheepMaterialParameters, characters }
                }
                return merged
            })
        },
        onComplete: () => {
            fadeTween = null
            applyGlobalTheme(name) // exact final values + the remembered preset selections
        },
    })
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
        gradTop: s.backgroundParameters.gradientTopColor,
        horizon: s.backgroundParameters.horizonColor,
        gradIntensity: s.backgroundParameters.gradientIntensity,
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

// Switch to a theme using the configured transition. Safe to spam-click: a running fade reverses
// from its live values; a running masked transition finishes instantly and the new one begins.
export function startThemeTransition(name, params = {}) {
    if (!GLOBAL_THEMES[name]) return
    const { mode = 'Fade', duration = 1.2 } = params
    const ease = EASING[params.easing] ?? EASING['Fast start']

    // Commit the SELECTION immediately (colours follow over the transition): the day/night icon
    // flips right away, and a mid-transition click reads the new state → it targets the OTHER
    // theme, so rapid clicks bounce back and forth instead of re-running the same switch.
    useStore.setState((s) => ({
        colorPresetParameters: { ...s.colorPresetParameters, theme: name, ...GLOBAL_THEMES[name].presets },
    }))

    killFade()
    if (themeMask.active) {
        gsap.killTweensOf(themeMask)
        themeMask.active = false
        themeMask.old = null
    }

    if (mode === 'Portal' || mode === 'Wipe' || mode === 'Dissolve') {
        // Live in-shader mask: snapshot the current palette (BEFORE applying — the materials mix
        // from it), switch the store instantly, then sweep the mask. The world never freezes.
        themeMask.old = captureThemeSnapshot()
        themeMask.shape = mode === 'Wipe' ? 1 : mode === 'Dissolve' ? 2 : 0
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
    } else if (mode === 'Fade') {
        runFade(name, Math.max(0.1, duration), ease)
    } else {
        applyGlobalTheme(name)
    }
}
