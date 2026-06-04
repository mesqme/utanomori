import { useMemo } from 'react'
import { InstancedRigidBodies } from '@react-three/rapier'

export default function Stones({ stones, maxCount, stoneMaterial, stoneGeometry }) {
    const instances = useMemo(() => {
        if (!stones) return []
        return stones.map((stone, i) => ({
            key: 'stone_' + i,
            position: [stone.x, stone.y, stone.z],
            rotation: [stone.rotX || 0, stone.rotY, stone.rotZ || 0],
            scale: [stone.scaleX, stone.scaleY, stone.scaleZ],
        }))
    }, [stones])

    if (!instances || instances.length === 0) {
        return null
    }

    return (
        <InstancedRigidBodies instances={instances} type="fixed" colliders="hull">
            <instancedMesh args={[stoneGeometry, stoneMaterial, maxCount]} count={instances.length} frustumCulled={false} />
        </InstancedRigidBodies>
    )
}
