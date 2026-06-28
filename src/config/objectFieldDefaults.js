/**
 * Placeholder object library.
 *
 * Trees are still lightweight procedural placeholders (data-driven `parts`, each a
 * primitive with a local offset / scale / colour). Stones AND mushrooms are now real
 * authored meshes loaded from glb (see STONE_VARIANTS / MUSHROOM_VARIANTS +
 * ScatteredObjects): one variant is chosen per instance.
 *
 * `footprintRadius` drives grass suppression + spacing around the object. For stones /
 * mushrooms it is derived per-variant from the measured safe diameter instead.
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

/**
 * The seven music-stone meshes from stones.glb, used only by the song mini-game (one per
 * note). `diameter` is the measured safe diameter (world units) → safe radius = diameter/2,
 * which drives the dynamic grass clearing around each rising stone (see MusicStones).
 * `circle` is the matching `musicStone_0X_circle` mesh — a ring authored AROUND the stone
 * that flashes green/red as the correct/incorrect press feedback (baked with the stone's
 * offset + parented to it so it stays aligned).
 */
export const MUSIC_STONE_VARIANTS = Object.freeze([
    { node: 'musicStone_01', circle: 'musicStone_01_circle', diameter: 3.27 },
    { node: 'musicStone_02', circle: 'musicStone_02_circle', diameter: 3.27 },
    { node: 'musicStone_03', circle: 'musicStone_03_circle', diameter: 3.11 },
    { node: 'musicStone_04', circle: 'musicStone_04_circle', diameter: 3.11 },
    { node: 'musicStone_05', circle: 'musicStone_05_circle', diameter: 3.11 },
    { node: 'musicStone_06', circle: 'musicStone_06_circle', diameter: 3.0 },
    { node: 'musicStone_07', circle: 'musicStone_07_circle', diameter: 3.25 },
])

/**
 * Mushroom variants from mushrooms.glb. Each mushroom is two meshes so the cap and the
 * leg can take different materials: `cap` + `leg` are the GLB mesh names, baked together
 * (shared recentre/ground offset) so the cap keeps sitting on its leg (see
 * createMushroomGeometries). `diameter` is the measured safe diameter (world units) →
 * safe radius = diameter/2, the no-grass / no-overlap radius (scales with the per-instance
 * + mushroomSize scale), exactly like STONE_VARIANTS.
 */
export const MUSHROOM_VARIANTS = Object.freeze([
    { cap: 'mushroom_01', leg: 'mushroom_01_leg', diameter: 1.38 },
    { cap: 'mushroom_02', leg: 'mushroom_02_leg', diameter: 0.94 },
    { cap: 'mushroom_03', leg: 'mushroom_03_leg', diameter: 1.42 },
    { cap: 'mushroom_04', leg: 'mushroom_04_leg', diameter: 1.02 },
    { cap: 'mushroom_05', leg: 'mushroom_05_leg', diameter: 1.17 },
    { cap: 'mushroom_06', leg: 'mushroom_06_leg', diameter: 0.82 },
])

/**
 * Tree variants from trees.glb. Each tree is two meshes — `trunk` + `bush` (canopy) — baked
 * together (shared recentre/ground offset) so the bush keeps sitting on its trunk (see
 * createTreeGeometries). Two measured safe diameters:
 *   - `diameter` (SMALL): the base footprint → spacing vs OTHER props (stones/mushrooms) + the grass
 *     clear radius, exactly like STONE_VARIANTS / MUSHROOM_VARIANTS.
 *   - `canopyDiameter` (BIG): the bush spread → used ONLY for tree↔tree spacing, so canopies don't
 *     overlap (other props use the small one against a tree).
 */
export const TREE_VARIANTS = Object.freeze([
    { trunk: 'tree_01_trunk', bush: 'tree_01_bush', diameter: 1.33, canopyDiameter: 3.9 },
    { trunk: 'tree_02_trunk', bush: 'tree_02_bush', diameter: 1.06, canopyDiameter: 3.22 },
    { trunk: 'tree_03_trunk', bush: 'tree_03_bush', diameter: 0.92, canopyDiameter: 4.54 },
])

// Procedural parts sit on the ground (origin at the base) so a per-type instance scale resizes
// them while keeping them grounded. Trees / stones / mushrooms are now authored GLB meshes.
export const objectLibrary = Object.freeze({
    // Authored tree — trunk + bush geometry comes from trees.glb (TREE_VARIANTS), baked together.
    // footprintRadius is a fallback; the real small/big radii are per-variant. trunkRadius is the
    // hero-collision radius (the slim trunk; the canopy floats high).
    tree: {
        footprintRadius: 0.9,
        trunkRadius: 0.28,
        parts: [],
        sockets: [],
    },
    // Authored boulder — geometry comes from stones.glb (STONE_VARIANTS), recentred to sit
    // on the ground. footprintRadius here is a fallback; the real radius is per-variant.
    stone: {
        footprintRadius: 1.4,
        parts: [],
        sockets: [{ id: 'top', offset: [0, 1.0, 0], normal: [0, 1, 0], capacity: 1 }],
    },
    // Authored mushroom — cap + leg geometry comes from mushrooms.glb (MUSHROOM_VARIANTS),
    // baked together so the cap sits on the leg. footprintRadius here is a fallback; the real
    // radius is per-variant.
    mushroom: {
        footprintRadius: 0.7,
        parts: [],
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
    treeSize: 0.65, // mean tree scale
    treeYOffset: 0, // lift/sink trees relative to the ground
    treeColor: '#7257c3', // tree bush (foliage) colour
    treeTrunkColor: '#877fb9', // tree trunk colour
    stoneSize: 0.55, // global stone scale (the GLB models are authored near final size)
    stoneYOffset: -0.3, // lift/sink stones relative to the ground
    stoneTint: '#58a4fc', // multiplies the GLB stone colour (white = as authored)
    mushroomSize: 0.75, // global mushroom scale (the GLB models are authored near final size)
    mushroomYOffset: -0.1, // lift/sink mushrooms relative to the ground (geometry grounded at the leg base)
    mushroomCapColor: '#31bac0', // cap (head) base colour
    mushroomLegColor: '#ecdcc4', // leg (stem) base colour
    colorVariation: 0.12, // slight per-instance colour jitter on stones + mushrooms (like sheep scales)
    grassFadeDistance: 0.0, // grass fade band beyond a stone/tree's safe radius
    grassLean: 0.45, // how far the grass leans away from a stone/tree in the fade band
    mushroomGrassRadius: 0.45, // multiplier on a mushroom's grass-clear radius (× its footprint)
    mushroomGrassFade: 0.4, // grass fade band beyond a mushroom's clear radius
    mushroomGrassLean: 0.45, // how far the grass leans away from a mushroom
    mushroomWiggleRadius: 1.2, // hero distance (world units) that triggers a mushroom's bend
    mushroomWiggleAngle: 0.4, // peak tilt of the bend (radians; 0 disables)
    mushroomWiggleSpeed: 12, // wiggle oscillation speed (rad/s)
    mushroomWiggleDecay: 3, // how fast the wiggle fades (higher = quicker settle)
    // Tree wind (vertex-shader bend; trees only). Direction reuses windParameters.direction (shared
    // with the grass). The motion is a sin sway whose amplitude is gust-modulated (non-sin/abrupt).
    treeWindStrength: 0.003, // bend amount (× height², so small values; tune on the fine slider)
    treeWindSpeed: 1.35, // sway speed
    treeWindGust: 0.6, // 0 = steady sin sway, 1 = strong gusty / abrupt amplitude swings
    debugAnchors: false,
})
