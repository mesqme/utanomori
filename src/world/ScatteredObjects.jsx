import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { createObjectFieldSampler } from './utils/objectField.js'
import { createBatchedMeshPool } from './utils/batchedMeshPool.js'
import { musicStoneSeeThrough } from './utils/musicStoneSeeThrough.js'
import { characterSeeThrough } from './utils/characterSeeThrough.js'
import { revealCircle } from './utils/revealCircle.js'
import { seeThrough } from './utils/seeThrough.js'
import { getRefScale } from './utils/screenScale.js'
import { createPropStylizedMaterial, updatePropStylizedMaterial } from '../materials/PropStylizedMaterial.js'
import { createEyePlaneMaterial, updateEyePlaneMaterial } from '../materials/EyePlaneMaterial.js'
import { MUSHROOM_VARIANTS, objectLibrary, OBJECT_TYPES, STONE_VARIANTS, TREE_VARIANTS } from '../config/objectFieldDefaults.js'
import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import { createEyePlaneGeometry, createMushroomGeometries, createStoneGeometry, createTreeGeometries, toCanonicalGeometry } from './utils/stoneGeometry.js'
import stonesModelUrl from '../assets/models/stones.glb'
import mushroomsModelUrl from '../assets/models/mushrooms.glb'
import treesModelUrl from '../assets/models/trees.glb'

// Every scattered object (trees, stones, mushrooms across all active chunks) is an
// instance in ONE BatchedMesh (see createBatchedMeshPool) → ~1 draw call with
// per-instance frustum culling. The material is the character's stylized look,
// extended to batch + fade at the reveal-circle edge (see PropStylizedMaterial).
const MAX_OBJECT_INSTANCES = 4096
const MAX_EYE_PLANE_INSTANCES = 2048
const WHITE = new THREE.Color('#ffffff')
// Reused temps for the mushroom "bend when the hero reaches it" wiggle (rotates the baked instance
// around its leg-base origin — the geometry is grounded there — so cap + leg tip together).
const _wiggleAxis = new THREE.Vector3()
const _wiggleRot = new THREE.Matrix4()
const _wiggleMat = new THREE.Matrix4()

// Deterministically pick which of a tree's eye planes show (the GLB authors many; a tree only uses
// a random few). Rank the planes by a hash of the tree's world position and take the lowest `count`.
function eyePlaneHash(x, z, i) {
    const s = Math.sin(x * 12.9898 + z * 78.233 + i * 37.719) * 43758.5453
    return s - Math.floor(s)
}
function pickEyePlaneIds(planeIds, count, x, z) {
    const k = Math.min(count, planeIds.length)
    if (k <= 0) return []
    return planeIds
        .map((id, i) => ({ id, h: eyePlaneHash(x, z, i) }))
        .sort((a, b) => a.h - b.h)
        .slice(0, k)
        .map((entry) => entry.id)
}

// Procedural placeholder primitives (trees + mushrooms). Stones are authored GLB meshes.
function createPartGeometry(part) {
    switch (part.geometry) {
        case 'cylinder':
            return new THREE.CylinderGeometry(...part.args)
        case 'sphere':
            return new THREE.SphereGeometry(...part.args)
        case 'cone':
            return new THREE.ConeGeometry(...part.args)
        case 'box':
        default:
            return new THREE.BoxGeometry(...part.args)
    }
}

// One prototype per (type, part). Stones expand to one prototype per GLB variant (a single id
// chosen per instance at placement). Mushrooms expand to TWO prototypes per GLB variant — a
// [capId, legId] pair rendered together (cap + leg take different colours). `prototypeMeta`
// carries the foliage flag (tree canopy) and, for mushrooms, the `part` ('cap' | 'leg').
function buildPrototypes(stoneNodes, mushroomNodes, treeNodes) {
    const prototypes = []
    const prototypeIdsByType = {}
    const prototypeMeta = {}
    const eyePlanePrototypes = [] // tree eye planes (separate batched pool / material)
    const eyePlaneIdsByVariant = {} // variantIndex → [eye-plane prototype ids]
    const partMatrix = new THREE.Matrix4()

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

        objectLibrary[type].parts.forEach((part, partIndex) => {
            const base = createPartGeometry(part)
            base.applyMatrix4(
                partMatrix.compose(
                    new THREE.Vector3(part.offset?.[0] ?? 0, part.offset?.[1] ?? 0, part.offset?.[2] ?? 0),
                    new THREE.Quaternion(),
                    new THREE.Vector3(part.scale?.[0] ?? 1, part.scale?.[1] ?? 1, part.scale?.[2] ?? 1)
                )
            )
            const foliage = !!part.foliage
            const geometry = toCanonicalGeometry(base, foliage, 1) // trees are the only see-through props
            base.dispose()
            const id = `${type}:${partIndex}`
            prototypes.push({ id, type, geometry, color: part.color })
            prototypeIdsByType[type].push(id)
            prototypeMeta[id] = { type, foliage }
        })
    }

    return { prototypes, prototypeIdsByType, prototypeMeta, eyePlanePrototypes, eyePlaneIdsByVariant }
}

export default function ScatteredObjects({ activeChunks, chunkSize, noise2D }) {
    const objectParameters = useStore((s) => s.objectParameters)
    const treeEyesPlanesPerTree = useStore((s) => s.treeEyesParameters.planesPerTree)
    const roadParameters = useStore((s) => s.roadParameters)
    const terrainScale = useStore((s) => s.terrainParameters.scale)
    const terrainAmplitude = useStore((s) => s.terrainParameters.amplitude)

    const { nodes: stoneNodes } = useGLTF(stonesModelUrl)
    const { nodes: mushroomNodes } = useGLTF(mushroomsModelUrl)
    const { nodes: treeNodes } = useGLTF(treesModelUrl)

    const painterlyTextures = useTexture(PAINTERY_TEXTURE_URL_LIST)
    const painterlyTexture = useMemo(() => {
        const texture = painterlyTextures[painteryTextureIndex(objectParameters.textureName)] ?? painterlyTextures[0]
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.colorSpace = THREE.NoColorSpace
        texture.needsUpdate = true
        return texture
    }, [painterlyTextures, objectParameters.textureName])

    const pool = useMemo(() => {
        const { prototypes, prototypeIdsByType, prototypeMeta, eyePlanePrototypes, eyePlaneIdsByVariant } = buildPrototypes(
            stoneNodes,
            mushroomNodes,
            treeNodes
        )
        const material = createPropStylizedMaterial(painterlyTexture, { toneMapped: true })
        const created = createBatchedMeshPool({ prototypes, material, maxInstances: MAX_OBJECT_INSTANCES })
        prototypes.forEach((prototype) => prototype.geometry.dispose()) // pool kept its own copies

        // Separate batched pool + material for the tree eye planes (one eye pair per UV-square).
        const eyePool = eyePlanePrototypes.length
            ? createBatchedMeshPool({ prototypes: eyePlanePrototypes, material: createEyePlaneMaterial(), maxInstances: MAX_EYE_PLANE_INSTANCES })
            : null
        eyePlanePrototypes.forEach((prototype) => prototype.geometry.dispose())

        return { ...created, prototypeIdsByType, prototypeMeta, eyePool, eyePlaneIdsByVariant }
        // Built once the GLBs are ready; texture is swapped in place, and size/shape go through
        // per-instance scale below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stoneNodes, mushroomNodes, treeNodes])

    // Swap the prop paintery texture when the selection changes (no pool rebuild).
    useEffect(() => {
        const uniforms = pool?.mesh?.material?.uniforms
        if (uniforms?.uPainterlyTexture) uniforms.uPainterlyTexture.value = painterlyTexture
    }, [pool, painterlyTexture])

    useFrame((frameState, delta) => {
        const state = useStore.getState()
        updatePropStylizedMaterial(pool.mesh.material, {
            propRim: state.propRimParameters,
            refScale: getRefScale(frameState),
            circleCenterX: revealCircle.centerX,
            circleCenterZ: revealCircle.centerZ,
            radiusFactor: revealCircle.radiusFactor,
            chunkSize: revealCircle.chunkSize,
            fadeOffset: state.objectParameters.fadeOffset,
            backgroundColor: state.backgroundParameters.backgroundColor,
            fadeMode: state.borderParameters.fadeMode,
            pixelSize: state.ditheringParameters.pixelSize,
            painterlyEnabled: state.objectParameters.painterlyEnabled,
            painterlyScale: state.objectParameters.painterlyScale,
            painterlyContrast: state.objectParameters.painterlyContrast,
            painterlyBrightness: state.objectParameters.painterlyBrightness,
            painterlyColorStrength: state.objectParameters.painterlyColorStrength,
            paintery: {
                size: state.borderParameters.painterySize,
                screenBlend: state.borderParameters.painteryScreenBlend,
                drift: state.borderParameters.painteryDrift,
                layer2Scale: state.borderParameters.painteryLayer2Scale,
                bleed: state.borderParameters.painteryBleed,
            },
            seeThrough,
            stoneSeeThrough: musicStoneSeeThrough,
            charSeeThrough: characterSeeThrough,
            wind: {
                time: frameState.clock.elapsedTime,
                dirX: Math.cos(state.windParameters?.direction ?? 0),
                dirZ: Math.sin(state.windParameters?.direction ?? 0),
                strength: state.objectParameters.treeWindStrength ?? 0,
                speed: state.objectParameters.treeWindSpeed ?? 1,
                gust: state.objectParameters.treeWindGust ?? 0.5,
            },
        })

        // Tree eye planes share the tree's wind (whole-plane translation) + fade at the reveal edge.
        if (pool.eyePool) {
            updateEyePlaneMaterial(pool.eyePool.mesh.material, {
                circleCenterX: revealCircle.centerX,
                circleCenterZ: revealCircle.centerZ,
                radiusFactor: revealCircle.radiusFactor,
                chunkSize: revealCircle.chunkSize,
                fadeOffset: state.objectParameters.fadeOffset,
                wind: {
                    time: frameState.clock.elapsedTime,
                    dirX: Math.cos(state.windParameters?.direction ?? 0),
                    dirZ: Math.sin(state.windParameters?.direction ?? 0),
                    strength: state.objectParameters.treeWindStrength ?? 0,
                    speed: state.objectParameters.treeWindSpeed ?? 1,
                    gust: state.objectParameters.treeWindGust ?? 0.5,
                },
                eyes: state.treeEyesParameters,
                seeThrough,
                stoneSeeThrough: musicStoneSeeThrough,
                charSeeThrough: characterSeeThrough,
            })
        }

        // Mushroom bend: when the hero reaches a mushroom it tips away with a decaying wiggle
        // (re-composing base × a rotation around the leg-base origin). One-shot on each entry into
        // the trigger radius; restores the rest matrix once the wiggle settles.
        const op = state.objectParameters
        const maxAngle = op.mushroomWiggleAngle ?? 0.4
        if (maxAngle > 0.0001) {
            const dt = Math.min(delta, 0.05)
            const hero = state.ballPosition
            const radiusSq = (op.mushroomWiggleRadius ?? 1.2) ** 2
            const speed = op.mushroomWiggleSpeed ?? 12
            const decay = op.mushroomWiggleDecay ?? 3
            for (const entries of chunkMushroomsRef.current.values()) {
                for (const m of entries) {
                    const dx = m.x - hero.x
                    const dz = m.z - hero.z
                    const distSq = dx * dx + dz * dz
                    const within = distSq < radiusSq
                    if (within && !m.inside) {
                        const d = Math.sqrt(distSq) || 1
                        m.dirX = dx / d // tip AWAY from the hero
                        m.dirZ = dz / d
                        m.phase = 0
                        m.active = true
                    }
                    m.inside = within
                    if (!m.active) continue
                    m.phase += dt
                    const amp = Math.exp(-m.phase * decay)
                    if (amp < 0.02) {
                        m.active = false
                        pool.setMatrix(m.capId, m.base)
                        pool.setMatrix(m.legId, m.base)
                        continue
                    }
                    const angle = Math.sin(m.phase * speed) * maxAngle * amp
                    _wiggleAxis.set(m.dirZ, 0, -m.dirX) // horizontal axis ⟂ to the tip direction
                    _wiggleRot.makeRotationAxis(_wiggleAxis, angle)
                    _wiggleMat.multiplyMatrices(m.base, _wiggleRot)
                    pool.setMatrix(m.capId, _wiggleMat)
                    pool.setMatrix(m.legId, _wiggleMat)
                }
            }
        }
    })

    const chunkInstancesRef = useRef(new Map())
    const chunkMushroomsRef = useRef(new Map()) // chunk.key → mushroom wiggle entries (cap+leg ids + base matrix)
    const chunkEyePlanesRef = useRef(new Map()) // chunk.key → eye-plane instance ids (in pool.eyePool)
    const generationKeyRef = useRef(null)

    const objectGenerationKey = [
        objectParameters.enabled,
        objectParameters.worldSeed,
        objectParameters.cellSize,
        objectParameters.groupJitter,
        objectParameters.density,
        objectParameters.roadClearance,
        objectParameters.groupScale,
        objectParameters.minObjectSpacing,
        objectParameters.treeSize,
        objectParameters.treeYOffset,
        objectParameters.treeColor,
        objectParameters.treeTrunkColor,
        objectParameters.stoneSize,
        objectParameters.stoneYOffset,
        objectParameters.stoneTint,
        objectParameters.mushroomSize,
        objectParameters.mushroomYOffset,
        objectParameters.mushroomCapColor,
        objectParameters.mushroomLegColor,
        objectParameters.stoneColorVariation,
        objectParameters.mushroomColorVariation,
        objectParameters.treeColorVariation,
        treeEyesPlanesPerTree,
    ].join('|')
    const roadGenerationKey = [
        roadParameters.enabled,
        roadParameters.worldSeed,
        roadParameters.laneSpacing,
        roadParameters.nodeSpacing,
        roadParameters.meanderStrength,
        roadParameters.width,
        roadParameters.softness,
    ].join('|')

    useEffect(() => {
        const chunkInstances = chunkInstancesRef.current
        const chunkMushrooms = chunkMushroomsRef.current
        const chunkEyePlanes = chunkEyePlanesRef.current
        const dummy = new THREE.Object3D()
        const color = new THREE.Color()

        const releaseChunk = (ids) => ids.forEach((id) => pool.removeInstance(id))
        const releaseEyePlanes = (ids) => pool.eyePool && ids.forEach((id) => pool.eyePool.removeInstance(id))

        // A change to placement/terrain params invalidates every instance — full reset.
        const generationKey = [objectGenerationKey, roadGenerationKey, terrainScale, terrainAmplitude].join('::')
        if (generationKey !== generationKeyRef.current) {
            for (const ids of chunkInstances.values()) releaseChunk(ids)
            for (const ids of chunkEyePlanes.values()) releaseEyePlanes(ids)
            chunkInstances.clear()
            chunkMushrooms.clear()
            chunkEyePlanes.clear()
            generationKeyRef.current = generationKey
        }

        const desired = new Set(activeChunks.map((chunk) => chunk.key))

        for (const [key, ids] of chunkInstances) {
            if (!desired.has(key)) {
                releaseChunk(ids)
                chunkInstances.delete(key)
                chunkMushrooms.delete(key)
                releaseEyePlanes(chunkEyePlanes.get(key) ?? [])
                chunkEyePlanes.delete(key)
            }
        }

        if (objectParameters.enabled) {
            const sampler = createObjectFieldSampler(objectParameters, roadParameters)
            const eyePlanesPerTree = Math.max(0, Math.round(useStore.getState().treeEyesParameters?.planesPerTree ?? 3))
            const treeSize = objectParameters.treeSize ?? 1.2
            const treeYOffset = objectParameters.treeYOffset ?? 0
            const stoneSize = objectParameters.stoneSize ?? 1.0
            const stoneYOffset = objectParameters.stoneYOffset ?? 0
            const mushroomSize = objectParameters.mushroomSize ?? 1.0
            const mushroomYOffset = objectParameters.mushroomYOffset ?? 0
            const treeColorObj = new THREE.Color(objectParameters.treeColor ?? '#6f8f4a')
            const treeTrunkObj = new THREE.Color(objectParameters.treeTrunkColor ?? '#6b4a2f')
            const stoneTintObj = new THREE.Color(objectParameters.stoneTint ?? '#ffffff')
            const mushroomCapObj = new THREE.Color(objectParameters.mushroomCapColor ?? '#c4452f')
            const mushroomLegObj = new THREE.Color(objectParameters.mushroomLegColor ?? '#ecdcc4')
            // Per-instance colour variation factor, separate per prop type.
            const stoneColorVariation = objectParameters.stoneColorVariation ?? 0
            const mushroomColorVariation = objectParameters.mushroomColorVariation ?? 0
            const treeColorVariation = objectParameters.treeColorVariation ?? 0

            for (const chunk of activeChunks) {
                if (chunkInstances.has(chunk.key)) continue

                const ids = []
                const mushroomsForChunk = []
                const eyePlanesForChunk = []
                for (const group of sampler.getGroupsInChunk(chunk.x, chunk.z, chunkSize)) {
                    for (const instance of group.instances) {
                        const y = noise2D ? noise2D(instance.worldX * terrainScale, instance.worldZ * terrainScale) * terrainAmplitude : 0
                        const isStone = instance.type === 'stone'
                        const isTree = instance.type === 'tree'
                        const isMushroom = instance.type === 'mushroom'
                        const sizeMul = isStone ? stoneSize : isTree ? treeSize : isMushroom ? mushroomSize : 1
                        const yOffset = isStone ? stoneYOffset : isTree ? treeYOffset : isMushroom ? mushroomYOffset : 0

                        dummy.position.set(instance.worldX, y + yOffset, instance.worldZ)
                        dummy.rotation.set(instance.tiltX, instance.rotationY, instance.tiltZ)
                        dummy.scale.setScalar(instance.scale * sizeMul)
                        dummy.updateMatrix()

                        // Stones render ONE chosen variant; mushrooms render the chosen variant's
                        // [cap, leg] pair; trees render the chosen variant's [trunk, bush] pair.
                        let prototypeIds
                        if (isStone) {
                            const variants = pool.prototypeIdsByType.stone ?? []
                            const chosen = variants.length ? variants[(instance.variantIndex ?? 0) % variants.length] : null
                            prototypeIds = chosen ? [chosen] : []
                        } else if (isMushroom) {
                            const variants = pool.prototypeIdsByType.mushroom ?? []
                            const chosen = variants.length ? variants[(instance.variantIndex ?? 0) % variants.length] : null
                            prototypeIds = chosen ?? [] // [capId, legId]
                        } else if (isTree) {
                            const variants = pool.prototypeIdsByType.tree ?? []
                            const chosen = variants.length ? variants[(instance.variantIndex ?? 0) % variants.length] : null
                            prototypeIds = chosen ?? [] // [trunkId, bushId]
                        } else {
                            prototypeIds = pool.prototypeIdsByType[instance.type] ?? []
                        }

                        const addedIds = []
                        for (const prototypeId of prototypeIds) {
                            const meta = pool.prototypeMeta[prototypeId]
                            if (isStone) {
                                color.copy(pool.prototypeColors[prototypeId] ?? WHITE).multiply(stoneTintObj)
                            } else if (isMushroom) {
                                color.copy(meta?.part === 'cap' ? mushroomCapObj : mushroomLegObj)
                            } else if (isTree) {
                                color.copy(meta?.part === 'bush' ? treeColorObj : treeTrunkObj)
                            } else if (meta?.foliage) {
                                color.copy(treeColorObj)
                            } else {
                                color.copy(pool.prototypeColors[prototypeId] ?? WHITE)
                            }
                            color.multiplyScalar(instance.colorTone)
                            // Per-instance per-channel tint variation of the same base colour (like the
                            // sheep scales), with its own factor per prop type.
                            const variation = isStone ? stoneColorVariation : isMushroom ? mushroomColorVariation : isTree ? treeColorVariation : 0
                            if (variation > 0 && instance.colorJitter) {
                                const j = instance.colorJitter
                                color.r *= THREE.MathUtils.clamp(1 + j[0] * variation, 0.25, 1.75)
                                color.g *= THREE.MathUtils.clamp(1 + j[1] * variation, 0.25, 1.75)
                                color.b *= THREE.MathUtils.clamp(1 + j[2] * variation, 0.25, 1.75)
                            }
                            const instanceId = pool.addInstance(prototypeId, dummy.matrix, color)
                            if (instanceId !== -1) {
                                ids.push(instanceId)
                                addedIds.push(instanceId)
                            }
                        }

                        // Register the mushroom (cap + leg share one transform) so it can bend when
                        // the hero reaches it. base = the rest matrix; we re-compose base × wiggle below.
                        if (isMushroom && addedIds.length === 2) {
                            mushroomsForChunk.push({
                                capId: addedIds[0],
                                legId: addedIds[1],
                                base: dummy.matrix.clone(),
                                x: instance.worldX,
                                z: instance.worldZ,
                                phase: 0,
                                active: false,
                                inside: false,
                                dirX: 0,
                                dirZ: 1,
                            })
                        }

                        // Tree → instance a random subset of its variant's eye planes (the GLB authors
                        // many; we show only a few). They share the tree's instance matrix so they ride
                        // its placement (and wind, done in the eye shader).
                        if (isTree && pool.eyePool && eyePlanesPerTree > 0) {
                            const planeIds = pool.eyePlaneIdsByVariant?.[instance.variantIndex ?? 0] ?? []
                            for (const planeId of pickEyePlaneIds(planeIds, eyePlanesPerTree, instance.worldX, instance.worldZ)) {
                                const eyeId = pool.eyePool.addInstance(planeId, dummy.matrix, null)
                                if (eyeId !== -1) eyePlanesForChunk.push(eyeId)
                            }
                        }
                    }
                }
                chunkInstances.set(chunk.key, ids)
                if (mushroomsForChunk.length) chunkMushrooms.set(chunk.key, mushroomsForChunk)
                if (eyePlanesForChunk.length) chunkEyePlanesRef.current.set(chunk.key, eyePlanesForChunk)
            }
        }
    }, [pool, activeChunks, objectGenerationKey, roadGenerationKey, terrainScale, terrainAmplitude, objectParameters.enabled, chunkSize, noise2D])

    useEffect(
        () => () => {
            pool.dispose()
            pool.eyePool?.dispose()
        },
        [pool]
    )

    return (
        <>
            <primitive object={pool.mesh} />
            {pool.eyePool && <primitive object={pool.eyePool.mesh} />}
        </>
    )
}

useGLTF.preload(stonesModelUrl)
useGLTF.preload(mushroomsModelUrl)
useGLTF.preload(treesModelUrl)
