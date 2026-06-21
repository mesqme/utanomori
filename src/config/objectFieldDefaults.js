import { soundJourneyPalette } from './soundJourneyPalette.js'

/**
 * Placeholder object library.
 *
 * Trees and mushrooms are still lightweight procedural placeholders (data-driven
 * `parts`, each a primitive with a local offset / scale / colour). Stones are now
 * real authored meshes loaded from `stones.glb` (see STONE_VARIANTS + ScatteredObjects):
 * one of the seven variants is chosen per instance.
 *
 * `footprintRadius` drives grass suppression + spacing around the object. For stones it
 * is derived per-variant from the measured safe diameter (STONE_VARIANTS) instead.
 * `sockets` are local attachment points where secondary characters can later be placed.
 */
export const OBJECT_TYPES = Object.freeze(['tree', 'stone', 'mushroom'])

/**
 * Terrain stone variants from stones.glb — `node` is the GLB mesh name, `diameter` the
 * measured safe diameter (world units). The safe radius (diameter / 2) is the no-grass /
 * no-overlap radius around the stone; it scales with the per-instance + stoneSize scale.
 * (The musicStone_* meshes are reserved for the minigame and are NOT scattered.)
 */
export const STONE_VARIANTS = Object.freeze([
    { node: 'stone_01', diameter: 2.84 },
    { node: 'stone_02', diameter: 2.77 },
    { node: 'stone_03', diameter: 2.9 },
    { node: 'stone_04', diameter: 2.32 },
    { node: 'stone_05', diameter: 3.26 },
    { node: 'stone_06', diameter: 3.17 },
    { node: 'stone_07', diameter: 2.74 },
])

// Procedural parts sit on the ground (origin at the base) so a per-type instance scale
// (treeSize / stoneSize — see ScatteredObjects) resizes them while keeping them grounded.
export const objectLibrary = Object.freeze({
    // A simple stylized tree placeholder: a tapered trunk + a round sphere canopy.
    // The canopy part carries `foliage: true` so it takes treeColor.
    tree: {
        footprintRadius: 0.9,
        parts: [
            { geometry: 'cylinder', args: [0.13, 0.2, 1.4, 6], offset: [0, 0.7, 0], color: soundJourneyPalette.trunkLight },
            { geometry: 'sphere', args: [1.0, 16, 12], offset: [0, 2.0, 0], color: soundJourneyPalette.leaves, foliage: true },
        ],
        sockets: [],
    },
    // Authored boulder — geometry comes from stones.glb (STONE_VARIANTS), recentred to sit
    // on the ground. footprintRadius here is a fallback; the real radius is per-variant.
    stone: {
        footprintRadius: 1.4,
        parts: [],
        sockets: [{ id: 'top', offset: [0, 1.0, 0], normal: [0, 1, 0], capacity: 1 }],
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
    { id: 'stoneCluster', weight: 1.0, count: [2, 5], radius: 2.2, mix: { stone: 0.6, mushroom: 0.25, tree: 0.15 } },
    { id: 'treeGrove', weight: 1.0, count: [2, 4], radius: 2.6, mix: { tree: 0.7, mushroom: 0.3 } },
    { id: 'mushroomPatch', weight: 0.8, count: [4, 9], radius: 1.6, mix: { mushroom: 0.85, stone: 0.15 } },
    { id: 'mixedGrove', weight: 1.0, count: [3, 7], radius: 3.0, mix: { tree: 0.45, stone: 0.35, mushroom: 0.2 } },
    { id: 'loneTree', weight: 0.5, count: [1, 2], radius: 1.2, mix: { tree: 1.0 } },
])

export const objectFieldDefaults = Object.freeze({
    enabled: true,
    textureName: 'paintaryAlpha_01', // paintery texture used by the prop material
    worldSeed: 7777,
    cellSize: 7,
    groupJitter: 0.52,
    density: 0.54,
    roadClearance: 2.4,
    groupScale: 1.0,
    minObjectSpacing: 0.75,
    treeSize: 1.2, // mean tree scale
    treeYOffset: 0, // lift/sink trees relative to the ground
    treeColor: '#5a2fb2', // tree foliage colour
    stoneSize: 0.55, // global stone scale (the GLB models are authored near final size)
    stoneYOffset: -0.3, // lift/sink stones relative to the ground
    stoneTint: '#58a4fc', // multiplies the GLB stone colour (white = as authored)
    grassFadeDistance: 0.0, // grass fade band beyond a stone/tree's safe radius
    grassLean: 0.45, // how far the grass leans away from a stone/tree in the fade band
    debugAnchors: false,
})
