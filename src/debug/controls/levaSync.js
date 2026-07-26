import { levaStore } from 'leva'

import useStore from '../../stores/useStore.jsx'
import { seeThrough } from '../../world/state/seeThrough.js'
import { mainCharacterMaterialGroups } from '../../config/mainCharacterMaterials.js'
import { LEVA_SECTION_PATHS } from './levaSectionPaths.js'

// Two-way plumbing between the zustand store and the Leva panel.
//
// The echo guard is the load-bearing part: leva fires onChange SYNCHRONOUSLY from our own
// levaStore.set(), so pushing store -> panel would immediately fire panel -> store and fight
// whatever else is writing. `levaSync.active` is raised around every push and every setParam
// checks it. Module scope rather than a component ref because the twelve section hooks all
// need the same flag.
export const levaSync = { active: false }

// Raise the guard, push, lower it — always via try/finally so a throw cannot leave it stuck on.
export function pushLevaValues(values) {
    levaSync.active = true
    try {
        levaStore.set(values, false)
    } finally {
        levaSync.active = false
    }
}

// The panel -> store direction. `context.initial` skips leva's own first-render callback.
export function setParam(section, param) {
    return (value, _, context) => {
        if (levaSync.active || context?.initial) return
        useStore.setState((state) => ({
            [section]: {
                ...state[section],
                [param]: value,
            },
        }))
    }
}

export function addLevaSectionValues(values, folderPath, section, paths) {
    Object.entries(paths).forEach(([control, parameter]) => {
        values[`${folderPath}.${control}`] = section[parameter]
    })
}

// Push ONE section back into the panel (store -> panel), guard included.
export function syncLevaSection(folderPath, section, paths) {
    const values = {}
    addLevaSectionValues(values, folderPath, section, paths)
    pushLevaValues(values)
}

export function addSeeThroughValues(values) {
    values['Debug.See-Through.enabled'] = seeThrough.enabled
    values['Debug.See-Through.grassEnabled'] = seeThrough.grassEnabled
    values['Debug.See-Through.worldRadius'] = seeThrough.worldRadius
    values['Debug.See-Through.inner'] = seeThrough.inner
    values['Debug.See-Through.depthBias'] = seeThrough.depthBias
    values['Debug.See-Through.opacityIntensity'] = seeThrough.opacityIntensity
    values['Debug.See-Through.textureContrast'] = seeThrough.textureContrast
}

// Push the CURRENT store values into the Leva panel (all synced sections at once). Used at
// mount (Leva may hold HMR-stale values) and after a colour preset rewrites several groups.
export function syncLevaFromStore() {
    const s = useStore.getState()
    const values = {
        'Debug.General.perfMonitor': s.perfVisible,
        'Debug.General.bgWireframe': s.backgroundWireframe,
        'Colors.theme': s.colorPresetParameters.theme,
    }
    addLevaSectionValues(values, 'World.Terrain', s.terrainParameters, LEVA_SECTION_PATHS.Terrain)
    addLevaSectionValues(values, 'World.Background', s.backgroundParameters, LEVA_SECTION_PATHS.Background)
    addLevaSectionValues(values, 'World.Stars', s.backgroundParameters, LEVA_SECTION_PATHS.Stars)
    addLevaSectionValues(values, 'World.Border', s.borderParameters, LEVA_SECTION_PATHS.Border)
    addLevaSectionValues(values, 'World.Roads', s.roadParameters, LEVA_SECTION_PATHS.Roads)
    addLevaSectionValues(values, 'World.Wind', s.windParameters, LEVA_SECTION_PATHS.Wind)
    addLevaSectionValues(values, 'World.Wind', s.objectParameters, LEVA_SECTION_PATHS.WindTrees)
    addLevaSectionValues(values, 'Grass.Blades', s.grassParameters, LEVA_SECTION_PATHS.Blades)
    addLevaSectionValues(values, 'Grass.Patches', s.grassPatchParameters, LEVA_SECTION_PATHS.Patches)
    addLevaSectionValues(values, 'Grass.Trail', s.grassParameters, LEVA_SECTION_PATHS.Trail)
    addLevaSectionValues(values, 'Grass.Trail Dissolve', s.grassParameters, LEVA_SECTION_PATHS['Trail Dissolve'])
    addLevaSectionValues(values, 'Grass.Trail Lighten', s.grassParameters, LEVA_SECTION_PATHS['Trail Lighten'])
    addLevaSectionValues(values, 'Grass.Trail Scale', s.grassParameters, LEVA_SECTION_PATHS['Trail Scale'])
    addLevaSectionValues(values, 'Grass.Trail Lean', s.grassParameters, LEVA_SECTION_PATHS['Trail Lean'])
    addLevaSectionValues(values, 'Props.Placement', s.objectParameters, LEVA_SECTION_PATHS.Placement)
    addLevaSectionValues(values, 'Props.Trees', s.objectParameters, LEVA_SECTION_PATHS.Trees)
    addLevaSectionValues(values, 'Props.Stones', s.objectParameters, LEVA_SECTION_PATHS.Stones)
    addLevaSectionValues(values, 'Props.Mushrooms', s.objectParameters, LEVA_SECTION_PATHS.Mushrooms)
    addLevaSectionValues(values, 'Props.Surface', s.objectParameters, LEVA_SECTION_PATHS.Surface)
    addLevaSectionValues(values, 'Props.Leaves Edge', s.edgeParameters, LEVA_SECTION_PATHS['Leaves Edge'])
    addLevaSectionValues(values, 'Props.Rim Light', s.propRimParameters, LEVA_SECTION_PATHS['Rim Light'])
    addLevaSectionValues(values, 'Characters.Hero', s.characterParameters, LEVA_SECTION_PATHS.Hero)
    addLevaSectionValues(values, 'Characters.Hero Material', s.characterMaterialParameters, LEVA_SECTION_PATHS['Hero Material'])
    addLevaSectionValues(values, 'Lantern.Ground Light', s.lanternGroundLightParameters, LEVA_SECTION_PATHS['Ground Light'])
    addLevaSectionValues(values, 'Post.Color Grade', s.colorGradeParameters, LEVA_SECTION_PATHS['Color Grade'])
    addLevaSectionValues(values, 'Post.Painterly FX', s.painterlyPostParameters, LEVA_SECTION_PATHS['Painterly FX'])
    addLevaSectionValues(values, 'Post.Dithering', s.ditheringParameters, LEVA_SECTION_PATHS.Dithering)
    addLevaSectionValues(values, 'Desktop.UI', s.gameUiParameters, LEVA_SECTION_PATHS['Game UI'])
    addLevaSectionValues(values, 'Debug.Camera Debug', s.cameraParameters, LEVA_SECTION_PATHS['Camera Debug'])
    addLevaSectionValues(values, 'Debug.Loader Debug', s.loaderDebugParameters, LEVA_SECTION_PATHS['Loader Debug'])

    mainCharacterMaterialGroups.forEach((group) => {
        values[`Characters.Hero Material.${group.label} Base`] = s.characterMaterialParameters.materials[group.id]?.baseColor ?? group.baseColor
    })

    // Sheep companion colours + the tree-eye iris — nested / not in a LEVA_SECTION_PATHS map, so
    // refresh their pickers here after a theme rewrites them (char 1/2/3 = piano/drums/winds).
    const sheepMusic = { char1: 'piano', char2: 'drums', char3: 'winds' }
    const sheepGroup = { Body: 'orange', Wool: 'white', Leg: 'brown' }
    for (const [charKey, music] of Object.entries(sheepMusic)) {
        for (const [groupKey, group] of Object.entries(sheepGroup)) {
            values[`Characters.Sheep.Colours.${charKey}${groupKey}`] = s.sheepMaterialParameters.characters[music][group].baseColor
        }
    }
    values['Props.Tree Eyes.Eye.eyeColor'] = s.treeEyesParameters.eyeColor

    pushLevaValues(values)
}
