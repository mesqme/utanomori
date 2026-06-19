import { soundJourneyPalette } from './soundJourneyPalette.js'

/**
 * Placeholder object library.
 *
 * Each object type is a list of `parts`, where every part is a primitive
 * (box / sphere / cylinder / icosahedron / cone) with a local offset, scale and
 * colour. This is intentionally data-driven: when the Blender-authored library
 * is ready, only the `parts` specs are swapped for loaded GLB meshes — the
 * placement field, renderer and socket logic stay untouched.
 *
 * `footprintRadius` drives grass suppression around the object.
 * `sockets` are local attachment points (named) where secondary characters can
 * later be placed (e.g. sitting on a stone, perched in a tree).
 */
export const OBJECT_TYPES = Object.freeze(['tree', 'stone', 'mushroom'])

export const objectLibrary = Object.freeze({
    tree: {
        footprintRadius: 0.7,
        parts: [
            { geometry: 'cylinder', args: [0.16, 0.24, 2.2, 6], offset: [0, 1.1, 0], color: soundJourneyPalette.trunkLight },
            { geometry: 'sphere', args: [1.25, 18, 14], offset: [0, 2.75, 0], scale: [1.05, 1.0, 1.05], color: soundJourneyPalette.leaves },
        ],
        sockets: [{ id: 'canopy', offset: [0, 2.75, 0], normal: [0, 1, 0], capacity: 1 }],
    },
    stone: {
        footprintRadius: 0.62,
        parts: [
            { geometry: 'icosahedron', args: [0.7, 0], offset: [0, 0.45, 0], scale: [1, 0.7, 1], color: soundJourneyPalette.stone },
        ],
        sockets: [{ id: 'top', offset: [0, 0.92, 0], normal: [0, 1, 0], capacity: 1 }],
    },
    mushroom: {
        footprintRadius: 0.26,
        parts: [
            { geometry: 'cylinder', args: [0.07, 0.1, 0.5, 6], offset: [0, 0.25, 0], color: soundJourneyPalette.trunkLight },
            { geometry: 'sphere', args: [0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2], offset: [0, 0.5, 0], scale: [1, 0.72, 1], color: soundJourneyPalette.hero },
        ],
        sockets: [],
    },
})

/**
 * Group archetypes — recipes that turn one anchor into an organic cluster.
 * `mix` is a weighted bag of object types, `count` the [min,max] members,
 * `radius` the scatter spread (world units, before groupScale).
 */
export const objectArchetypes = Object.freeze([
    { id: 'stoneCluster', weight: 1.0, count: [2, 5], radius: 2.2, mix: { stone: 0.72, mushroom: 0.28 } },
    { id: 'treeGrove', weight: 1.0, count: [2, 4], radius: 3.0, mix: { tree: 0.7, stone: 0.15, mushroom: 0.15 } },
    { id: 'mushroomPatch', weight: 0.8, count: [4, 9], radius: 1.6, mix: { mushroom: 0.88, stone: 0.12 } },
    { id: 'mixedGrove', weight: 1.0, count: [3, 7], radius: 3.2, mix: { tree: 0.4, stone: 0.35, mushroom: 0.25 } },
    { id: 'loneTree', weight: 0.5, count: [1, 2], radius: 1.2, mix: { tree: 1.0 } },
])

export const objectFieldDefaults = Object.freeze({
    enabled: true,
    textureName: 'paintaryAlpha_01', // paintery texture used by the prop material
    worldSeed: 7777,
    cellSize: 7,
    groupJitter: 0.7,
    density: 0.55,
    roadClearance: 2.4,
    groupScale: 1.0,
    minObjectSpacing: 0.65,
    debugAnchors: false,
})
