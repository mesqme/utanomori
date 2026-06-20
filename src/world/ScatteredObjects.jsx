import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { createObjectFieldSampler } from './utils/objectField.js'
import { createBatchedMeshPool } from './utils/batchedMeshPool.js'
import { revealCircle } from './utils/revealCircle.js'
import { seeThrough } from './utils/seeThrough.js'
import { getRefScale } from './utils/screenScale.js'
import { createPropStylizedMaterial, updatePropStylizedMaterial } from '../materials/PropStylizedMaterial.js'
import { objectLibrary, OBJECT_TYPES } from '../config/objectFieldDefaults.js'
import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import treeModelUrl from '../assets/models/tree_01.glb'

// Every scattered object (trees, stones, mushrooms across all active chunks) is an
// instance in ONE BatchedMesh (see createBatchedMeshPool) → ~1 draw call with
// per-instance frustum culling. The material is the character's stylized look,
// extended to batch + fade at the reveal-circle edge (see PropStylizedMaterial).
const MAX_OBJECT_INSTANCES = 4096
const TREE_MODEL_PARTS = Object.freeze([
    { node: 'tree_01_bush_01', color: 'leaves' },
    { node: 'tree_01_bush_02', color: 'leaves' },
    { node: 'tree_01_bush_03', color: 'leaves' },
    { node: 'tree_01_trunk', color: 'trunk' },
])

function createPartGeometry(part) {
    switch (part.geometry) {
        case 'cylinder':
            return new THREE.CylinderGeometry(...part.args)
        case 'sphere':
            return new THREE.SphereGeometry(...part.args)
        case 'icosahedron':
            return new THREE.IcosahedronGeometry(...part.args)
        case 'cone':
            return new THREE.ConeGeometry(...part.args)
        case 'box':
        default:
            return new THREE.BoxGeometry(...part.args)
    }
}

function getTreePartColor(part) {
    return part.color === 'trunk' ? objectLibrary.tree.parts[0].color : objectLibrary.tree.parts[1].color
}

function createTreePrototypeGeometry(mesh, rootScene) {
    rootScene.updateMatrixWorld(true)
    mesh.updateMatrixWorld(true)

    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(mesh.matrixWorld)
    return geometry
}

// One prototype per (type, part), with the part's local transform baked in so an
// instance matrix is just the object transform. Trees use the authored GLB meshes;
// the other object types remain lightweight procedural placeholders for now.
function buildPrototypes(treeModel) {
    const prototypes = []
    const prototypeIdsByType = {}

    for (const type of OBJECT_TYPES) {
        prototypeIdsByType[type] = []

        if (type === 'tree') {
            const rootScene = treeModel.scene
            TREE_MODEL_PARTS.forEach((part, partIndex) => {
                const mesh = treeModel.nodes?.[part.node]
                if (!mesh?.geometry) return

                const id = `${type}:${partIndex}`
                prototypes.push({
                    id,
                    type,
                    partIndex,
                    geometry: createTreePrototypeGeometry(mesh, rootScene),
                    color: getTreePartColor(part),
                })
                prototypeIdsByType[type].push(id)
            })
            continue
        }

        objectLibrary[type].parts.forEach((part, partIndex) => {
            const geometry = createPartGeometry(part)
            geometry.applyMatrix4(
                new THREE.Matrix4().compose(
                    new THREE.Vector3(part.offset?.[0] ?? 0, part.offset?.[1] ?? 0, part.offset?.[2] ?? 0),
                    new THREE.Quaternion(),
                    new THREE.Vector3(part.scale?.[0] ?? 1, part.scale?.[1] ?? 1, part.scale?.[2] ?? 1)
                )
            )
            const id = `${type}:${partIndex}`
            prototypes.push({ id, type, partIndex, geometry, color: part.color })
            prototypeIdsByType[type].push(id)
        })
    }

    return { prototypes, prototypeIdsByType }
}

export default function ScatteredObjects({ activeChunks, chunkSize, noise2D }) {
    const objectParameters = useStore((s) => s.objectParameters)
    const roadParameters = useStore((s) => s.roadParameters)
    const terrainScale = useStore((s) => s.terrainParameters.scale)
    const terrainAmplitude = useStore((s) => s.terrainParameters.amplitude)
    const treeModel = useGLTF(treeModelUrl)

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
        const { prototypes, prototypeIdsByType } = buildPrototypes(treeModel)
        const material = createPropStylizedMaterial(painterlyTexture, { toneMapped: true })
        const created = createBatchedMeshPool({ prototypes, material, maxInstances: MAX_OBJECT_INSTANCES })
        prototypes.forEach((prototype) => prototype.geometry.dispose()) // pool kept its own copies
        return { ...created, prototypeIdsByType }
        // The paintery texture is swapped in place below so the pool isn't rebuilt for texture changes.
    }, [treeModel])

    // Swap the prop paintery texture when the selection changes (no pool rebuild).
    useEffect(() => {
        const uniforms = pool?.mesh?.material?.uniforms
        if (uniforms?.uPainterlyTexture) uniforms.uPainterlyTexture.value = painterlyTexture
    }, [pool, painterlyTexture])

    useFrame((frameState) => {
        const state = useStore.getState()
        updatePropStylizedMaterial(pool.mesh.material, {
            refScale: getRefScale(frameState),
            circleCenterX: revealCircle.centerX,
            circleCenterZ: revealCircle.centerZ,
            radiusFactor: revealCircle.radiusFactor,
            chunkSize: revealCircle.chunkSize,
            fadeOffset: state.objectParameters.fadeOffset,
            backgroundColor: state.terrainParameters.backgroundColor,
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
        })
    })

    const chunkInstancesRef = useRef(new Map())
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
        const dummy = new THREE.Object3D()
        const color = new THREE.Color()

        const releaseChunk = (ids) => ids.forEach((id) => pool.removeInstance(id))

        // A change to placement/terrain params invalidates every instance — full reset.
        const generationKey = [objectGenerationKey, roadGenerationKey, terrainScale, terrainAmplitude].join('::')
        if (generationKey !== generationKeyRef.current) {
            for (const ids of chunkInstances.values()) releaseChunk(ids)
            chunkInstances.clear()
            generationKeyRef.current = generationKey
        }

        const desired = new Set(activeChunks.map((chunk) => chunk.key))

        for (const [key, ids] of chunkInstances) {
            if (!desired.has(key)) {
                releaseChunk(ids)
                chunkInstances.delete(key)
            }
        }

        if (objectParameters.enabled) {
            const sampler = createObjectFieldSampler(objectParameters, roadParameters)

            for (const chunk of activeChunks) {
                if (chunkInstances.has(chunk.key)) continue

                const ids = []
                for (const group of sampler.getGroupsInChunk(chunk.x, chunk.z, chunkSize)) {
                    for (const instance of group.instances) {
                        const y = noise2D ? noise2D(instance.worldX * terrainScale, instance.worldZ * terrainScale) * terrainAmplitude : 0
                        dummy.position.set(instance.worldX, y, instance.worldZ)
                        dummy.rotation.set(instance.tiltX, instance.rotationY, instance.tiltZ)
                        dummy.scale.setScalar(instance.scale)
                        dummy.updateMatrix()

                        const prototypeIds = pool.prototypeIdsByType[instance.type] ?? []
                        for (const prototypeId of prototypeIds) {
                            color.copy(pool.prototypeColors[prototypeId]).multiplyScalar(instance.colorTone)
                            const instanceId = pool.addInstance(prototypeId, dummy.matrix, color)
                            if (instanceId !== -1) ids.push(instanceId)
                        }
                    }
                }
                chunkInstances.set(chunk.key, ids)
            }
        }
    }, [pool, activeChunks, objectGenerationKey, roadGenerationKey, terrainScale, terrainAmplitude, objectParameters.enabled, chunkSize, noise2D])

    useEffect(() => () => pool.dispose(), [pool])

    return <primitive object={pool.mesh} />
}

useGLTF.preload(treeModelUrl)
