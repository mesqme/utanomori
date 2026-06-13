import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { createObjectFieldSampler } from './utils/objectField.js'
import { createBatchedMeshPool } from './utils/batchedMeshPool.js'
import { revealCircle } from './utils/revealCircle.js'
import { createPropStylizedMaterial, updatePropStylizedMaterial } from '../materials/PropStylizedMaterial.js'
import { objectLibrary, OBJECT_TYPES } from '../config/objectFieldDefaults.js'
import paintaryAlpha01Url from '../assets/textures/paintaryAlpha_01.png'

// Every scattered object (trees, stones, mushrooms across all active chunks) is an
// instance in ONE BatchedMesh (see createBatchedMeshPool) → ~1 draw call with
// per-instance frustum culling. The material is the character's stylized look,
// extended to batch + fade at the reveal-circle edge (see PropStylizedMaterial).
const MAX_OBJECT_INSTANCES = 4096

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

// One prototype per (type, part), with the part's local offset/scale baked in so an
// instance matrix is just the object transform.
function buildPrototypes() {
    const prototypes = []
    for (const type of OBJECT_TYPES) {
        objectLibrary[type].parts.forEach((part, partIndex) => {
            const geometry = createPartGeometry(part)
            geometry.applyMatrix4(
                new THREE.Matrix4().compose(
                    new THREE.Vector3(part.offset?.[0] ?? 0, part.offset?.[1] ?? 0, part.offset?.[2] ?? 0),
                    new THREE.Quaternion(),
                    new THREE.Vector3(part.scale?.[0] ?? 1, part.scale?.[1] ?? 1, part.scale?.[2] ?? 1)
                )
            )
            prototypes.push({ id: `${type}:${partIndex}`, type, partIndex, geometry, color: part.color })
        })
    }
    return prototypes
}

export default function ScatteredObjects({ activeChunks, chunkSize, noise2D }) {
    const objectParameters = useStore((s) => s.objectParameters)
    const roadParameters = useStore((s) => s.roadParameters)
    const terrainScale = useStore((s) => s.terrainParameters.scale)
    const terrainAmplitude = useStore((s) => s.terrainParameters.amplitude)

    const painterlyTexture = useTexture(paintaryAlpha01Url)
    useMemo(() => {
        painterlyTexture.wrapS = THREE.RepeatWrapping
        painterlyTexture.wrapT = THREE.RepeatWrapping
        painterlyTexture.colorSpace = THREE.NoColorSpace
        painterlyTexture.needsUpdate = true
    }, [painterlyTexture])

    const pool = useMemo(() => {
        const prototypes = buildPrototypes()
        const material = createPropStylizedMaterial(painterlyTexture)
        const created = createBatchedMeshPool({ prototypes, material, maxInstances: MAX_OBJECT_INSTANCES })
        prototypes.forEach((prototype) => prototype.geometry.dispose()) // pool kept its own copies
        return created
    }, [painterlyTexture])

    useFrame(() => {
        const state = useStore.getState()
        updatePropStylizedMaterial(pool.mesh.material, {
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

                        const partCount = objectLibrary[instance.type].parts.length
                        for (let part = 0; part < partCount; part++) {
                            const prototypeId = `${instance.type}:${part}`
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
