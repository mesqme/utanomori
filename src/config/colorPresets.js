import { defaultSceneStyle } from './sceneStyles.js'
import { DEFAULT_COLOR_GRADE_PARAMETERS } from './parameterDefaults.js'
import useStore from '../stores/useStore.jsx'

// Colour patches (store-group → partial params) that the GLOBAL themes below are assembled from.
// The default entries reference defaultSceneStyle, so applying them restores the authored look
// exactly. The ship set is THREE themes: Night Forest (default) ↔ Daylight on the in-game
// day/night button, plus Amethyst Dusk selectable from the debug panel's theme dropdown.
//
// The scene is authored as a dark purple magic forest and viewed through the colour-grade post pass
// (HIGH desaturates slightly + warms) — all values are tuned to read well through that.

const d = defaultSceneStyle

// Merge several group-patches into one (later patches win per key).
export function mergeColorPatches(...patches) {
    const out = {}
    for (const patch of patches) {
        for (const [group, values] of Object.entries(patch)) {
            out[group] = { ...(out[group] ?? {}), ...values }
        }
    }
    return out
}

// ---- Grass: blade base + the four patch tints (the tints dominate — patches use full internal
// colour variation) + the trail lighten colour. -------------------------------------------------
export const GRASS_PRESETS = {
    'Violet Night': {
        grassParameters: { colorBase: d.grassParameters.colorBase, lightenColor: d.grassParameters.lightenColor },
        grassPatchParameters: {
            tintColorCyan: d.grassPatchParameters.tintColorCyan,
            tintColorViolet: d.grassPatchParameters.tintColorViolet,
            tintColorYellow: d.grassPatchParameters.tintColorYellow,
            tintColorGreen: d.grassPatchParameters.tintColorGreen,
        },
    },
    // Neutral-grey base so the four blue-violet patch tints carry the colour (internalColorVariation 1).
    'Frost Violet': {
        grassParameters: { colorBase: '#bbbbbb', lightenColor: '#ff00e6' },
        grassPatchParameters: { tintColorCyan: '#0040ff', tintColorViolet: '#0022ff', tintColorYellow: '#4800ff', tintColorGreen: '#2c00ff' },
    },
}

// ---- Stones: body tint + bottom-gradient tint + fresnel rim. -----------------------------------
export const STONE_PRESETS = {
    Periwinkle: {
        objectParameters: { stoneTint: d.objectParameters.stoneTint, stoneGradientColor: d.objectParameters.stoneGradientColor },
        propRimParameters: { stoneColor: d.propRimParameters.stoneColor },
    },
}

// ---- Trees: canopy + trunk + trunk rim + the painterly leaves-edge colour. ---------------------
export const TREE_PRESETS = {
    'Indigo Canopy': {
        objectParameters: { treeColor: d.objectParameters.treeColor, treeTrunkColor: d.objectParameters.treeTrunkColor },
        propRimParameters: { trunkColor: d.propRimParameters.trunkColor },
        edgeParameters: { color: d.edgeParameters.color },
    },
}

// ---- Global themes: recolour EVERYTHING — sky, ground, grass, props, rims, grade. Each theme
// names the per-group presets it reuses ('Custom' where it carries its own values) so the child
// dropdowns read back sensibly. -------------------------------------------------------------------
const g = DEFAULT_COLOR_GRADE_PARAMETERS

// Hero (main-character) material base colours — one set per theme. Themes set these so the player
// recolours with the scene; the toon-shade (toonColor) is preserved by the apply logic (only
// baseColor is patched). Night Forest restores the authored hero (defaultSceneStyle), Amethyst Dusk
// carries the tuned magenta/violet one, Daylight its own warmer daytime one. Slot ids match
// mainCharacterMaterialGroups.
const m = d.characterMaterialParameters.materials
const DEFAULT_HERO = {
    red: m.red.baseColor,
    black: m.black.baseColor,
    darkBrown: m.darkBrown.baseColor,
    blue: m.blue.baseColor,
    lightBrown: m.lightBrown.baseColor,
    metal: m.metal.baseColor,
    lantern: m.lantern.baseColor,
}
const AMETHYST_HERO = {
    red: '#ca44b2',
    black: '#616161',
    darkBrown: '#9973c0',
    blue: '#5f7bf5',
    lightBrown: '#b996b9',
    metal: '#91a2ff',
    lantern: '#f4cc5f',
}
const DAYLIGHT_HERO = {
    red: '#cd422d',
    black: '#4d4d4d',
    darkBrown: '#9f5674',
    blue: '#708aff',
    lightBrown: '#c69298',
    metal: '#91a2ff',
    lantern: '#ffbf00',
}

// Sheep companion base colours per theme (applied via theme.sheepColors). Structure mirrors
// sheepMaterialParameters.characters[music][group].baseColor — music = piano/drums/winds (char
// 1/2/3), group = orange(body)/white(wool)/brown(leg). DEFAULT_SHEEP = config/sheepMaterials.js;
// Daylight recolours the bodies bright. Legs (brown) stay the SAME tan in every theme.
const DEFAULT_SHEEP = {
    piano: { orange: '#b938a5', white: '#efe7f7', brown: '#cda66b' },
    drums: { orange: '#259eda', white: '#e7eaf7', brown: '#cda66b' },
    winds: { orange: '#8db92f', white: '#eef7e7', brown: '#cda66b' },
}
const DAYLIGHT_SHEEP = {
    piano: { orange: '#cd4b9d', white: '#efe7f7', brown: '#cda66b' },
    drums: { orange: '#45a3ff', white: '#e7eaf7', brown: '#cda66b' },
    winds: { orange: '#a6c60a', white: '#eef7e7', brown: '#cda66b' },
}

// Tree-eye iris colour (treeEyesParameters.eyeColor). Default is the authored purple; Daylight
// swaps to olive green. Themes carry it (in the patch) so switching restores it.
const DEFAULT_TREE_EYE = '#a68bd3'

export const GLOBAL_THEMES = {
    'Night Forest': {
        presets: { grass: 'Violet Night', stones: 'Periwinkle', trees: 'Indigo Canopy' },
        patch: mergeColorPatches(GRASS_PRESETS['Violet Night'], STONE_PRESETS.Periwinkle, TREE_PRESETS['Indigo Canopy'], {
            grassParameters: { baseBrightness: d.grassParameters.baseBrightness },
            backgroundParameters: {
                backgroundColor: d.backgroundParameters.backgroundColor,
                skyMixColor: d.backgroundParameters.skyMixColor,
                skyMixAmount: d.backgroundParameters.skyMixAmount,
                starColor: d.backgroundParameters.starColor,
                starsEnabled: d.backgroundParameters.starsEnabled,
            },
            terrainParameters: { color: d.terrainParameters.color, baseBrightness: d.terrainParameters.baseBrightness, groundTextureContrast: d.terrainParameters.groundTextureContrast },
            objectParameters: { mushroomCapColor: d.objectParameters.mushroomCapColor, mushroomLegColor: d.objectParameters.mushroomLegColor, stoneColorVariation: d.objectParameters.stoneColorVariation },
            propRimParameters: { mushroomColor: d.propRimParameters.mushroomColor, musicStoneColor: d.propRimParameters.musicStoneColor },
            treeEyesParameters: { eyeColor: DEFAULT_TREE_EYE },
            colorGradeParameters: { highSaturation: g.highSaturation, highWarmth: g.highWarmth, highBrightness: g.highBrightness },
        }),
        heroMaterials: DEFAULT_HERO,
        sheepColors: DEFAULT_SHEEP,
    },
    // Captured from the user's live tuning: a deep violet-magenta sky with a white horizon glow, a
    // brighter ground, grey-based grass carried by icy blue-violet tints, a violet leaves-edge, and a
    // magenta/violet hero. Props stay on the Night Forest palette (periwinkle stones, indigo canopy).
    'Amethyst Dusk': {
        presets: { grass: 'Frost Violet', stones: 'Periwinkle', trees: 'Indigo Canopy' },
        patch: mergeColorPatches(GRASS_PRESETS['Frost Violet'], STONE_PRESETS.Periwinkle, TREE_PRESETS['Indigo Canopy'], {
            grassParameters: { baseBrightness: d.grassParameters.baseBrightness },
            backgroundParameters: {
                backgroundColor: '#2b0091',
                skyMixColor: '#ffffff',
                skyMixAmount: 0.25,
                starColor: '#ffffff',
                starsEnabled: true,
            },
            terrainParameters: { color: '#737cfe', baseBrightness: 1.33, groundTextureContrast: d.terrainParameters.groundTextureContrast },
            objectParameters: { mushroomCapColor: d.objectParameters.mushroomCapColor, mushroomLegColor: d.objectParameters.mushroomLegColor, stoneColorVariation: d.objectParameters.stoneColorVariation },
            propRimParameters: { mushroomColor: d.propRimParameters.mushroomColor, musicStoneColor: d.propRimParameters.musicStoneColor },
            edgeParameters: { color: '#ab9eff' }, // violet leaves edge (overrides Indigo Canopy's)
            treeEyesParameters: { eyeColor: DEFAULT_TREE_EYE },
            colorGradeParameters: { highSaturation: g.highSaturation, highWarmth: g.highWarmth, highBrightness: g.highBrightness },
        }),
        heroMaterials: AMETHYST_HERO,
        sheepColors: DEFAULT_SHEEP,
    },
    Daylight: {
        presets: { grass: 'Custom', stones: 'Custom', trees: 'Custom' },
        patch: {
            grassParameters: { colorBase: '#8ddf00', lightenColor: '#c2ff6c', baseBrightness: 1.06 },
            grassPatchParameters: { tintColorCyan: '#b5e32b', tintColorViolet: '#57c443', tintColorYellow: '#a8d653', tintColorGreen: '#84c540' },
            backgroundParameters: {
                backgroundColor: '#306685',
                skyMixColor: '#ffe8c0',
                skyMixAmount: 0.22,
                starColor: '#ffffff',
                starsEnabled: false, // no stars in daylight
            },
            terrainParameters: { color: '#afa088', baseBrightness: 1.05, groundTextureContrast: 0.24 },
            objectParameters: {
                treeColor: '#6c9d51',
                treeTrunkColor: '#8a6f52',
                stoneTint: '#b1b1b1',
                stoneColorVariation: 0.07, // near-uniform grey stones in daylight
                stoneGradientColor: '#6d9a2f',
                mushroomCapColor: '#cb5f21',
                mushroomLegColor: '#f2e3c9',
            },
            propRimParameters: { stoneColor: '#97b172', trunkColor: '#a08e5d', mushroomColor: '#d1a271', musicStoneColor: '#c4c1d1' },
            edgeParameters: { color: '#9ec45c' },
            treeEyesParameters: { eyeColor: '#95b43a' },
            colorGradeParameters: { highSaturation: 0.95, highWarmth: 0.12, highBrightness: 1.05 },
        },
        heroMaterials: DAYLIGHT_HERO,
        sheepColors: DAYLIGHT_SHEEP,
    },
}

// Debug-panel theme dropdown options (the in-game button only toggles Night Forest ↔ Daylight).
export const THEME_OPTIONS = Object.keys(GLOBAL_THEMES)

// ---- Applying ------------------------------------------------------------------------------------

// Merge a flat colour patch (group → partial params) into the store.
export function applyColorPatch(patch) {
    useStore.setState((state) => {
        const next = {}
        for (const [group, values] of Object.entries(patch)) next[group] = { ...state[group], ...values }
        return next
    })
}

// Apply a GLOBAL theme by name: the flat patch, the nested hero + sheep colours (baseColor only —
// toon shades kept), and the remembered preset selections. Shared by the Leva "Colors" dropdown and
// the in-game day/night toggle (InteractionPrompt); debug/DebugPanel.jsx re-syncs the Leva pickers.
export function applyGlobalTheme(name) {
    const theme = GLOBAL_THEMES[name]
    if (!theme) return

    applyColorPatch(theme.patch)

    if (theme.heroMaterials) {
        useStore.setState((state) => {
            const materials = { ...state.characterMaterialParameters.materials }
            for (const [slot, baseColor] of Object.entries(theme.heroMaterials)) {
                materials[slot] = { ...materials[slot], baseColor }
            }
            return { characterMaterialParameters: { ...state.characterMaterialParameters, materials } }
        })
    }

    if (theme.sheepColors) {
        useStore.setState((state) => {
            const characters = { ...state.sheepMaterialParameters.characters }
            for (const [music, groups] of Object.entries(theme.sheepColors)) {
                characters[music] = { ...characters[music] }
                for (const [group, baseColor] of Object.entries(groups)) {
                    characters[music][group] = { ...characters[music][group], baseColor }
                }
            }
            return { sheepMaterialParameters: { ...state.sheepMaterialParameters, characters } }
        })
    }

    useStore.setState((state) => ({
        colorPresetParameters: { ...state.colorPresetParameters, theme: name, ...theme.presets },
    }))
}
