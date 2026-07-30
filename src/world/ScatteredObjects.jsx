import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { createObjectFieldSampler } from './fields/objectField.js'
import { createBatchedMeshPool } from './utils/batchedMeshPool.js'
import { musicStoneSeeThrough } from './state/musicStoneSeeThrough.js'
import { characterSeeThrough } from './state/characterSeeThrough.js'
import { revealCircle } from './state/revealCircle.js'
import { seeThrough } from './state/seeThrough.js'
import { themeMask } from './state/themeMask.js'
import { getRefScale } from './utils/screenScale.js'
import { createPropStylizedMaterial, updatePropStylizedMaterial } from '../materials/PropStylizedMaterial.js'
import { createEyePlaneMaterial, updateEyePlaneMaterial } from '../materials/EyePlaneMaterial.js'
import { updateMushroomReactions } from './utils/mushroomReaction.js'
import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import { buildPropPrototypes, pickEyePlaneIds } from './utils/propPrototypes.js'
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

export default function ScatteredObjects({ activeChunks, chunkSize }) {
    const objectParameters = useStore((s) => s.objectParameters)
    const treeEyesPlanesPerTree = useStore((s) => s.treeEyesParameters.planesPerTree)
    const roadParameters = useStore((s) => s.roadParameters)

    const { nodes: stoneNodes } = useGLTF(stonesModelUrl)
    const { nodes: mushroomNodes } = useGLTF(mushroomsModelUrl)
    const { nodes: treeNodes } = useGLTF(treesModelUrl)

    // Shared Texture instances (useTexture caches by URL) — see the note in Terrain.jsx before
    // changing any filter/wrap write here.
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
        const { prototypes, prototypeIdsByType, prototypeMeta, eyePlanePrototypes, eyePlaneIdsByVariant } = buildPropPrototypes(
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

    const chunkInstancesRef = useRef(new Map())
    const chunkMushroomsRef = useRef(new Map()) // chunk.key → mushroom wiggle entries (cap+leg ids + base matrix)
    const chunkEyePlanesRef = useRef(new Map()) // chunk.key → eye-plane instance ids (in pool.eyePool)
    const generationKeyRef = useRef(null)

    useFrame((frameState, delta) => {
        /**
         * Prop material
         */
        const state = useStore.getState()
        updatePropStylizedMaterial(pool.mesh.material, {
            propRim: {
                enabled: state.propRimParameters.enabled,
                strength: state.propRimParameters.strength,
                power: state.propRimParameters.power,
                stoneColor: state.propRimParameters.stoneColor,
                trunkColor: state.propRimParameters.trunkColor,
                mushroomColor: state.propRimParameters.mushroomColor,
            },
            stoneGradient: {
                enabled: state.objectParameters.stoneGradientEnabled,
                dark: state.objectParameters.stoneGradientDark ?? 0.45,
                color: state.objectParameters.stoneGradientColor ?? '#161335',
                colorStrength: state.objectParameters.stoneGradientColorStrength ?? 0.5,
                height: state.objectParameters.stoneGradientHeight ?? 0.65,
            },
            // Per-type colours + variations are UNIFORMS (the instances carry only the
            // theme-independent part) — recolouring props never rebuilds the pool.
            typeColors: {
                treeColor: state.objectParameters.treeColor ?? '#575ac2',
                treeTrunkColor: state.objectParameters.treeTrunkColor ?? '#877fb9',
                stoneTint: state.objectParameters.stoneTint ?? '#ffffff',
                mushroomCapColor: state.objectParameters.mushroomCapColor ?? '#c4452f',
                mushroomLegColor: state.objectParameters.mushroomLegColor ?? '#ecdcc4',
                treeColorVariation: state.objectParameters.treeColorVariation ?? 0,
                stoneColorVariation: state.objectParameters.stoneColorVariation ?? 0,
                mushroomColorVariation: state.objectParameters.mushroomColorVariation ?? 0,
                mushroomLegColorVariation: state.objectParameters.mushroomLegColorVariation ?? 0.25,
            },
            // Outgoing-theme values during a live masked theme transition (null = identity).
            themeMaskOld: themeMask.active ? themeMask.old : null,
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

        /**
         * Eye planes
         */
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
                themeMaskOld: themeMask.active ? themeMask.old : null,
                seeThrough,
                stoneSeeThrough: musicStoneSeeThrough,
                charSeeThrough: characterSeeThrough,
            })
        }

        /**
         * Mushroom reaction
         */
        updateMushroomReactions(pool, chunkMushroomsRef.current, state.heroPosition, state.objectParameters, delta)
    })

    // NOTE: colours + colour variations are deliberately NOT in this key — they're shader uniforms
    // (typeColors above), so recolouring props (day/night themes, Leva colour drags) never rebuilds
    // the pool. Only placement/geometry params belong here.
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
        objectParameters.stoneSize,
        objectParameters.stoneYOffset,
        objectParameters.mushroomSize,
        objectParameters.mushroomYOffset,
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

        // A change to placement params invalidates every instance — full reset.
        const generationKey = [objectGenerationKey, roadGenerationKey].join('::')
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

            for (const chunk of activeChunks) {
                if (chunkInstances.has(chunk.key)) continue

                const ids = []
                const mushroomsForChunk = []
                const eyePlanesForChunk = []
                for (const group of sampler.getGroupsInChunk(chunk.x, chunk.z, chunkSize)) {
                    for (const instance of group.instances) {
                        const isStone = instance.type === 'stone'
                        const isTree = instance.type === 'tree'
                        const isMushroom = instance.type === 'mushroom'
                        const sizeMul = isStone ? stoneSize : isTree ? treeSize : isMushroom ? mushroomSize : 1
                        const yOffset = isStone ? stoneYOffset : isTree ? treeYOffset : isMushroom ? mushroomYOffset : 0

                        dummy.position.set(instance.worldX, yOffset, instance.worldZ)
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
                        const addedMushroomColors = [] // [capColor, legColor] — captured for the touch light-up
                        for (const prototypeId of prototypeIds) {
                            // The batched instance colour carries ONLY the theme-independent part:
                            // the stone's GLB variant colour (white for trees/mushrooms) × the
                            // placement tone. The per-TYPE theme colour + the per-instance jitter
                            // apply in the shader (uType* uniforms), so recolouring never rebuilds.
                            color.copy(isStone ? pool.prototypeColors[prototypeId] ?? WHITE : WHITE)
                            color.multiplyScalar(instance.colorTone)
                            const instanceId = pool.addInstance(prototypeId, dummy.matrix, color)
                            if (instanceId !== -1) {
                                ids.push(instanceId)
                                addedIds.push(instanceId)
                                if (isMushroom) addedMushroomColors.push(color.clone())
                            }
                        }

                        // Register the mushroom (cap + leg share one transform) so it can bend when
                        // the hero reaches it. base = the rest matrix; we re-compose base × wiggle below.
                        if (isMushroom && addedIds.length === 2) {
                            mushroomsForChunk.push({
                                capId: addedIds[0],
                                legId: addedIds[1],
                                capColor: addedMushroomColors[0], // base colours, for the touch light-up
                                legColor: addedMushroomColors[1],
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
    }, [pool, activeChunks, objectGenerationKey, roadGenerationKey, objectParameters.enabled, chunkSize])

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
