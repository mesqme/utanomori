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
import { objectLibrary, OBJECT_TYPES, STONE_VARIANTS } from '../config/objectFieldDefaults.js'
import { PAINTERY_TEXTURE_URL_LIST, painteryTextureIndex } from '../config/painteryTextures.js'
import stonesModelUrl from '../assets/models/stones.glb'

// Every scattered object (trees, stones, mushrooms across all active chunks) is an
// instance in ONE BatchedMesh (see createBatchedMeshPool) → ~1 draw call with
// per-instance frustum culling. The material is the character's stylized look,
// extended to batch + fade at the reveal-circle edge (see PropStylizedMaterial).
const MAX_OBJECT_INSTANCES = 4096
const WHITE = new THREE.Color('#ffffff')

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

// Every prototype must share ONE attribute layout for the BatchedMesh: position, normal,
// uv, aFoliage. Copy only those (zero-fill uv when missing, recompute normals if absent).
// aFoliage tags the tree canopy so the fragment gives it the painterly edge (other props
// get a fresnel rim).
function toCanonicalGeometry(source, foliage) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', source.getAttribute('position').clone())
    if (source.index) geometry.setIndex(source.index.clone())
    const normal = source.getAttribute('normal')
    if (normal) geometry.setAttribute('normal', normal.clone())
    const count = geometry.getAttribute('position').count
    const uv = source.getAttribute('uv')
    geometry.setAttribute('uv', uv ? uv.clone() : new THREE.BufferAttribute(new Float32Array(count * 2), 2))
    if (!normal) geometry.computeVertexNormals()
    const flag = new Float32Array(count)
    if (foliage) flag.fill(1)
    geometry.setAttribute('aFoliage', new THREE.BufferAttribute(flag, 1))
    return geometry
}

// Bake an authored stone mesh into a grounded prototype: apply the node's transform,
// recentre on XZ and drop it so its base sits at y = 0 (so the safe radius is measured
// around the stone's centre and the instance position lands it on the terrain).
function createStoneGeometry(node) {
    const geometry = node.geometry.clone()
    node.updateWorldMatrix(true, false)
    geometry.applyMatrix4(node.matrixWorld)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    geometry.translate(-(box.min.x + box.max.x) * 0.5, -box.min.y, -(box.min.z + box.max.z) * 0.5)
    const canonical = toCanonicalGeometry(geometry, false)
    geometry.dispose()
    return canonical
}

// One prototype per (type, part); stones expand to one prototype per GLB variant (a single
// variant is chosen per instance at placement). `prototypeMeta` carries the foliage flag so
// the placement loop can recolour the tree canopy.
function buildPrototypes(stoneNodes) {
    const prototypes = []
    const prototypeIdsByType = {}
    const prototypeMeta = {}
    const partMatrix = new THREE.Matrix4()

    for (const type of OBJECT_TYPES) {
        prototypeIdsByType[type] = []

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
            const geometry = toCanonicalGeometry(base, foliage)
            base.dispose()
            const id = `${type}:${partIndex}`
            prototypes.push({ id, type, geometry, color: part.color })
            prototypeIdsByType[type].push(id)
            prototypeMeta[id] = { type, foliage }
        })
    }

    return { prototypes, prototypeIdsByType, prototypeMeta }
}

export default function ScatteredObjects({ activeChunks, chunkSize, noise2D }) {
    const objectParameters = useStore((s) => s.objectParameters)
    const roadParameters = useStore((s) => s.roadParameters)
    const terrainScale = useStore((s) => s.terrainParameters.scale)
    const terrainAmplitude = useStore((s) => s.terrainParameters.amplitude)

    const { nodes: stoneNodes } = useGLTF(stonesModelUrl)

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
        const { prototypes, prototypeIdsByType, prototypeMeta } = buildPrototypes(stoneNodes)
        const material = createPropStylizedMaterial(painterlyTexture, { toneMapped: true })
        const created = createBatchedMeshPool({ prototypes, material, maxInstances: MAX_OBJECT_INSTANCES })
        prototypes.forEach((prototype) => prototype.geometry.dispose()) // pool kept its own copies
        return { ...created, prototypeIdsByType, prototypeMeta }
        // Built once the GLB is ready; texture is swapped in place, and size/shape go through
        // per-instance scale below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stoneNodes])

    // Swap the prop paintery texture when the selection changes (no pool rebuild).
    useEffect(() => {
        const uniforms = pool?.mesh?.material?.uniforms
        if (uniforms?.uPainterlyTexture) uniforms.uPainterlyTexture.value = painterlyTexture
    }, [pool, painterlyTexture])

    useFrame((frameState) => {
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
        objectParameters.treeSize,
        objectParameters.treeYOffset,
        objectParameters.treeColor,
        objectParameters.stoneSize,
        objectParameters.stoneYOffset,
        objectParameters.stoneTint,
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
            const treeSize = objectParameters.treeSize ?? 1.2
            const treeYOffset = objectParameters.treeYOffset ?? 0
            const stoneSize = objectParameters.stoneSize ?? 1.0
            const stoneYOffset = objectParameters.stoneYOffset ?? 0
            const treeColorObj = new THREE.Color(objectParameters.treeColor ?? '#6f8f4a')
            const stoneTintObj = new THREE.Color(objectParameters.stoneTint ?? '#ffffff')

            for (const chunk of activeChunks) {
                if (chunkInstances.has(chunk.key)) continue

                const ids = []
                for (const group of sampler.getGroupsInChunk(chunk.x, chunk.z, chunkSize)) {
                    for (const instance of group.instances) {
                        const y = noise2D ? noise2D(instance.worldX * terrainScale, instance.worldZ * terrainScale) * terrainAmplitude : 0
                        const isStone = instance.type === 'stone'
                        const isTree = instance.type === 'tree'
                        const sizeMul = isStone ? stoneSize : isTree ? treeSize : 1
                        const yOffset = isStone ? stoneYOffset : isTree ? treeYOffset : 0

                        dummy.position.set(instance.worldX, y + yOffset, instance.worldZ)
                        dummy.rotation.set(instance.tiltX, instance.rotationY, instance.tiltZ)
                        dummy.scale.setScalar(instance.scale * sizeMul)
                        dummy.updateMatrix()

                        // Stones render ONE chosen variant; trees / mushrooms render all parts.
                        let prototypeIds
                        if (isStone) {
                            const variants = pool.prototypeIdsByType.stone ?? []
                            const chosen = variants.length ? variants[(instance.variantIndex ?? 0) % variants.length] : null
                            prototypeIds = chosen ? [chosen] : []
                        } else {
                            prototypeIds = pool.prototypeIdsByType[instance.type] ?? []
                        }

                        for (const prototypeId of prototypeIds) {
                            const meta = pool.prototypeMeta[prototypeId]
                            if (isStone) {
                                color.copy(pool.prototypeColors[prototypeId] ?? WHITE).multiply(stoneTintObj)
                            } else if (meta?.foliage) {
                                color.copy(treeColorObj)
                            } else {
                                color.copy(pool.prototypeColors[prototypeId] ?? WHITE)
                            }
                            color.multiplyScalar(instance.colorTone)
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

useGLTF.preload(stonesModelUrl)
