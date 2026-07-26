import * as THREE from 'three'

import { MUSHROOM_VARIANTS, OBJECT_TYPES, STONE_VARIANTS, TREE_VARIANTS } from '../../config/objectFieldDefaults.js'
import { createEyePlaneGeometry, createMushroomGeometries, createStoneGeometry, createTreeGeometries } from './stoneGeometry.js'

// Turning the loaded GLBs into the prototype set the batched-mesh pool instances. Pure: nodes in,
// plain objects and geometries out, no component state — but it must still be CALLED from inside
// ScatteredObjects' useMemo, because the GLB nodes do not exist until the loader resolves.

const WHITE = new THREE.Color('#ffffff')

// Deterministically pick which of a tree's eye planes show (the GLB authors many; a tree only uses
// a random few). Rank the planes by a hash of the tree's world position and take the lowest `count`.
function eyePlaneHash(x, z, i) {
    const s = Math.sin(x * 12.9898 + z * 78.233 + i * 37.719) * 43758.5453
    return s - Math.floor(s)
}

export function pickEyePlaneIds(planeIds, count, x, z) {
    const k = Math.min(count, planeIds.length)
    if (k <= 0) return []
    return planeIds
        .map((id, i) => ({ id, h: eyePlaneHash(x, z, i) }))
        .sort((a, b) => a.h - b.h)
        .slice(0, k)
        .map((entry) => entry.id)
}

// One prototype per (type, part). Stones expand to one prototype per GLB variant (a single id
// chosen per instance at placement). Mushrooms expand to TWO prototypes per GLB variant — a
// [capId, legId] pair rendered together (cap + leg take different colours). `prototypeMeta`
// carries the foliage flag (tree canopy) and, for mushrooms, the `part` ('cap' | 'leg').
export function buildPropPrototypes(stoneNodes, mushroomNodes, treeNodes) {
    const prototypes = []
    const prototypeIdsByType = {}
    const prototypeMeta = {}
    const eyePlanePrototypes = [] // tree eye planes (separate batched pool / material)
    const eyePlaneIdsByVariant = {} // variantIndex → [eye-plane prototype ids]

    for (const type of OBJECT_TYPES) {
        prototypeIdsByType[type] = []

        if (type === 'tree') {
            TREE_VARIANTS.forEach((variant, variantIndex) => {
                const trunkNode = treeNodes[variant.trunk]
                const bushNode = treeNodes[variant.bush]
                if (!trunkNode || !bushNode) return
                const { trunk, bush, offset } = createTreeGeometries(trunkNode, bushNode)
                const trunkId = `tree:${variantIndex}:trunk`
                const bushId = `tree:${variantIndex}:bush`
                prototypes.push({ id: trunkId, type, geometry: trunk, color: WHITE })
                prototypes.push({ id: bushId, type, geometry: bush, color: WHITE })
                prototypeIdsByType[type].push([trunkId, bushId]) // variant-indexed pair
                prototypeMeta[trunkId] = { type, foliage: false, part: 'trunk' }
                prototypeMeta[bushId] = { type, foliage: true, part: 'bush' }

                // Eye planes for this variant (tree_0X_eyesPlane_*) → tree-local prototypes, grounded
                // identically so the tree's instance matrix lands them on the canopy.
                const base = variant.trunk.replace('_trunk', '')
                const planeIds = []
                Object.keys(treeNodes)
                    .filter((key) => key.startsWith(`${base}_eyesPlane`))
                    .sort()
                    .forEach((key, planeIndex) => {
                        const node = treeNodes[key]
                        if (!node?.geometry) return
                        const id = `eyeplane:${variantIndex}:${planeIndex}`
                        eyePlanePrototypes.push({ id, geometry: createEyePlaneGeometry(node, offset) })
                        planeIds.push(id)
                    })
                eyePlaneIdsByVariant[variantIndex] = planeIds
            })
            continue
        }

        if (type === 'stone') {
            STONE_VARIANTS.forEach((variant, variantIndex) => {
                const node = stoneNodes[variant.node]
                if (!node) return
                const id = `stone:${variantIndex}`
                const geometry = createStoneGeometry(node)
                const material = Array.isArray(node.material) ? node.material[0] : node.material
                const color = material?.color ? material.color.clone() : new THREE.Color('#9aa3ad')
                prototypes.push({ id, type, geometry, color })
                prototypeIdsByType[type].push(id)
                prototypeMeta[id] = { type, foliage: false }
            })
            continue
        }

        if (type === 'mushroom') {
            MUSHROOM_VARIANTS.forEach((variant, variantIndex) => {
                const capNode = mushroomNodes[variant.cap]
                const legNode = mushroomNodes[variant.leg]
                if (!capNode || !legNode) return
                const { cap, leg } = createMushroomGeometries(capNode, legNode)
                const capId = `mushroom:${variantIndex}:cap`
                const legId = `mushroom:${variantIndex}:leg`
                prototypes.push({ id: capId, type, geometry: cap, color: WHITE })
                prototypes.push({ id: legId, type, geometry: leg, color: WHITE })
                prototypeIdsByType[type].push([capId, legId]) // variant-indexed pair
                prototypeMeta[capId] = { type, foliage: false, part: 'cap' }
                prototypeMeta[legId] = { type, foliage: false, part: 'leg' }
            })
            continue
        }
    }

    return { prototypes, prototypeIdsByType, prototypeMeta, eyePlanePrototypes, eyePlaneIdsByVariant }
}
