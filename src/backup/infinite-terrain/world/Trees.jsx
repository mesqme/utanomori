import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'

import { Tree } from './Tree.jsx'
import { generateChunkData } from './utils/chunkUtils.js'
import treeUrl from '../assets/models/tree.glb'

const TREE_POOL_SIZE = 18

export default function Trees({ activeChunks, chunkSize, noise2D, stoneParameters, terrainScale, terrainAmplitude, treeMaterial, rigidBodyMaterial }) {
    const treeModel = useGLTF(treeUrl)
    const treePoolStateRef = useRef({
        slots: Array.from({ length: TREE_POOL_SIZE }, () => ({ id: null, data: null })),
        map: new Map(),
    })

    const treeTargets = useMemo(() => {
        if (!activeChunks || activeChunks.length === 0) return []

        const targets = []
        for (const chunk of activeChunks) {
            const { treeInstances } = generateChunkData(chunk.x, chunk.z, chunkSize, noise2D, stoneParameters, { scale: terrainScale, amplitude: terrainAmplitude })
            const originX = chunk.x * chunkSize
            const originZ = chunk.z * chunkSize

            for (const t of treeInstances) {
                targets.push({
                    id: t.id,
                    seed: t.seed,
                    position: [t.position[0] + originX, t.position[1], t.position[2] + originZ],
                    rotation: t.rotation,
                    scale: t.scale,
                })
            }
        }

        return targets
    }, [activeChunks, chunkSize, noise2D, stoneParameters, terrainScale, terrainAmplitude])

    const treePoolSlots = useMemo(() => {
        const pool = treePoolStateRef.current
        const nextIds = new Set(treeTargets.map((t) => t.id))

        for (let i = 0; i < pool.slots.length; i++) {
            const slot = pool.slots[i]
            if (slot.id && !nextIds.has(slot.id)) {
                pool.map.delete(slot.id)
                slot.id = null
                slot.data = null
            }
        }

        for (const target of treeTargets) {
            let slotIndex = pool.map.get(target.id)
            if (slotIndex === undefined) {
                slotIndex = pool.slots.findIndex((s) => s.id === null)
                if (slotIndex === -1) continue
                pool.map.set(target.id, slotIndex)
                pool.slots[slotIndex].id = target.id
            }
            pool.slots[slotIndex].data = target
        }

        return pool.slots.map((slot) => slot.data)
    }, [treeTargets])

    if (!treeModel?.scene || treePoolSlots.length === 0) return null

    return (
        <group>
            {treePoolSlots.map((tree, index) => {
                const visible = Boolean(tree)
                const position = tree?.position ?? [0, -9999, 0]
                const rotation = tree?.rotation ?? [0, 0, 0]
                const scale = tree?.scale ?? 1
                const seed = tree?.seed ?? 0

                return (
                    <Tree
                        key={`tree-pool-${index}`}
                        position={position}
                        rotation={rotation}
                        scale={scale}
                        seed={seed}
                        visible={visible}
                        treeMaterial={treeMaterial}
                        rigidBodyMaterial={rigidBodyMaterial}
                        treeScene={treeModel.scene}
                    />
                )
            })}
        </group>
    )
}

useGLTF.preload(treeUrl)
