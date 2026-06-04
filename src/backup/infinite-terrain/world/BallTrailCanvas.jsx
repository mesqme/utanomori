import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import glowTextureUrl from '../assets/textures/glow.png'

export default function BallTrailCanvas() {
    const setTrailTexture = useStore((state) => state.setTrailTexture)
    const trailParameters = useStore((state) => state.trailParameters)

    const canvasRef = useRef(null)
    const textureRef = useRef(null)
    const glowImageRef = useRef(null)
    const previousPositionRef = useRef(null)
    const ctxRef = useRef(null)
    const currentPosRef = useRef(new THREE.Vector3())
    const movementDeltaRef = useRef(new THREE.Vector3())

    // 1. Create Canvas & Texture once
    useEffect(() => {
        const canvas = document.createElement('canvas')
        canvas.width = trailParameters.chunkSize
        canvas.height = trailParameters.chunkSize
        canvas.style.position = 'fixed'
        canvas.style.width = '256px'
        canvas.style.height = '256px'
        canvas.style.left = '0'
        canvas.style.bottom = '0'
        canvas.style.zIndex = '10'
        canvas.style.display = trailParameters.showCanvas ? 'block' : 'none'
        document.body.appendChild(canvas)

        ctxRef.current = canvas.getContext('2d')
        ctxRef.current.fillStyle = 'black'
        ctxRef.current.fillRect(0, 0, canvas.width, canvas.height)

        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping

        const glowImage = new Image()
        glowImage.src = glowTextureUrl

        canvasRef.current = canvas
        textureRef.current = texture
        glowImageRef.current = glowImage

        setTrailTexture(texture)

        // Cleanup
        return () => {
            setTrailTexture(null)
            texture.dispose()
            if (document.body.contains(canvas)) {
                document.body.removeChild(canvas)
            }
            // Clear refs
            canvasRef.current = null
            textureRef.current = null
            ctxRef.current = null
            glowImageRef.current = null
        }
    }, [trailParameters.chunkSize])

    // 2. Update existing canvas visibility without recreating
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.style.display = trailParameters.showCanvas ? 'block' : 'none'
        }
    }, [trailParameters.showCanvas])

    // 3. Render Loop
    useFrame(() => {
        const canvas = canvasRef.current
        const ctx = ctxRef.current
        const glowImage = glowImageRef.current
        const texture = textureRef.current

        if (!canvas || !ctx || !glowImage || !texture) return

        const ballPosition = useStore.getState().ballPosition
        const landBallDistance = useStore.getState().landBallDistance

        const currentPosition = currentPosRef.current.copy(ballPosition)
        currentPosition.y = 0

        let previousPosition = previousPositionRef.current
        if (!previousPosition) {
            previousPosition = new THREE.Vector3().copy(currentPosition)
            previousPositionRef.current = previousPosition
        }

        const movementDelta = movementDeltaRef.current.subVectors(currentPosition, previousPosition)

        const patchSize = useStore.getState().terrainParameters.chunkSize
        const scale = canvas.width / patchSize

        const canvasDeltaX = -movementDelta.x * scale
        const canvasDeltaY = -movementDelta.z * scale
        const movementDistance = Math.hypot(canvasDeltaX, canvasDeltaY)

        const centerX = canvas.width * 0.5
        const centerY = canvas.height * 0.5

        if (movementDistance > 0.001) {
            ctx.save()
            ctx.globalCompositeOperation = 'copy'
            ctx.drawImage(canvas, canvasDeltaX, canvasDeltaY)
            ctx.restore()
        }

        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = trailParameters.fadeAlpha / 10.0
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        let alpha = trailParameters.glowAlpha

        if (landBallDistance > 0.05) {
            const t = landBallDistance - 0.05
            alpha *= 1.0 - t
        }

        const glowSize = canvas.width * trailParameters.glowSize

        if (glowImage.complete && glowImage.naturalHeight !== 0) {
            ctx.globalCompositeOperation = 'lighten'
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
            ctx.drawImage(glowImage, centerX - glowSize * 0.5, centerY - glowSize * 0.5, glowSize, glowSize)
        }

        ctx.globalCompositeOperation = 'destination-over'
        ctx.globalAlpha = 1
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        previousPosition.copy(currentPosition)
        texture.needsUpdate = true
    })

    return null
}
