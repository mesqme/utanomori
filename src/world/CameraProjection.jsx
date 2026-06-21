import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { CAMERA_BASE_FOV, CAMERA_REFERENCE_HEIGHT } from '../game/gameConfig.js'

function projectedSizeLockedFov(height) {
    const safeHeight = Math.max(1, height)
    const heightScale = safeHeight / CAMERA_REFERENCE_HEIGHT
    const baseFov = THREE.MathUtils.degToRad(CAMERA_BASE_FOV)
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseFov * 0.5) * heightScale))

    return THREE.MathUtils.clamp(fov, 1, 120)
}

export default function CameraProjection() {
    const camera = useThree((state) => state.camera)
    const height = useThree((state) => state.size.height)

    useLayoutEffect(() => {
        if (!camera.isPerspectiveCamera) return

        camera.fov = projectedSizeLockedFov(height)
        camera.updateProjectionMatrix()
    }, [camera, height])

    return null
}
