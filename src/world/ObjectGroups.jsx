import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { createObjectFieldSampler } from './utils/objectField.js'
import { objectLibrary } from '../config/objectFieldDefaults.js'

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

export default function ObjectGroups({ chunkX, chunkZ, chunkIndexX, chunkIndexZ, size, noise2D, scale, amplitude }) {
    const objectParameters = useStore((s) => s.objectParameters)
    const roadParameters = useStore((s) => s.roadParameters)

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

    const meshes = useMemo(() => {
        if (!objectParameters.enabled) return []

        const sampler = createObjectFieldSampler(objectParameters, roadParameters)
        const groups = sampler.getGroupsInChunk(chunkIndexX, chunkIndexZ, size)
        if (groups.length === 0) return []

        // Bucket every instance by type so each type renders as instanced meshes.
        const instancesByType = new Map()
        for (const group of groups) {
            for (const instance of group.instances) {
                if (!instancesByType.has(instance.type)) instancesByType.set(instance.type, [])
                instancesByType.get(instance.type).push(instance)
            }
        }

        const dummy = new THREE.Object3D()
        const partMatrix = new THREE.Matrix4()
        const partOffset = new THREE.Vector3()
        const partScale = new THREE.Vector3()
        const identityQuaternion = new THREE.Quaternion()
        const color = new THREE.Color()
        const builtMeshes = []

        instancesByType.forEach((instances, type) => {
            const library = objectLibrary[type]

            library.parts.forEach((part) => {
                const geometry = createPartGeometry(part)
                const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true })
                const mesh = new THREE.InstancedMesh(geometry, material, instances.length)
                mesh.frustumCulled = false

                partOffset.set(part.offset?.[0] ?? 0, part.offset?.[1] ?? 0, part.offset?.[2] ?? 0)
                partScale.set(part.scale?.[0] ?? 1, part.scale?.[1] ?? 1, part.scale?.[2] ?? 1)
                partMatrix.compose(partOffset, identityQuaternion, partScale)
                const baseColor = new THREE.Color(part.color)

                instances.forEach((instance, index) => {
                    const localX = instance.worldX - chunkX
                    const localZ = instance.worldZ - chunkZ
                    const y = noise2D ? noise2D(instance.worldX * scale, instance.worldZ * scale) * amplitude : 0

                    dummy.position.set(localX, y, localZ)
                    dummy.rotation.set(instance.tiltX, instance.rotationY, instance.tiltZ)
                    dummy.scale.setScalar(instance.scale)
                    dummy.updateMatrix()

                    mesh.setMatrixAt(index, dummy.matrix.clone().multiply(partMatrix))
                    color.copy(baseColor).multiplyScalar(instance.colorTone)
                    mesh.setColorAt(index, color)
                })

                mesh.instanceMatrix.needsUpdate = true
                if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
                builtMeshes.push(mesh)
            })
        })

        return builtMeshes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objectGenerationKey, roadGenerationKey, chunkX, chunkZ, chunkIndexX, chunkIndexZ, size, noise2D, scale, amplitude])

    useEffect(() => {
        return () => {
            meshes.forEach((mesh) => {
                mesh.geometry.dispose()
                mesh.material.dispose()
                mesh.dispose()
            })
        }
    }, [meshes])

    if (meshes.length === 0) return null

    return (
        <>
            {meshes.map((mesh, index) => (
                <primitive key={index} object={mesh} />
            ))}
        </>
    )
}
