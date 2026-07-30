import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import useStore from '../stores/useStore.jsx'
import { getTrampleData, MAX_TRAMPLERS } from './state/trampleField.js'

/**
 * Top-down trail canvas. A 2D canvas
 * stays centred on the hero; every character paints a soft brush into it and the
 * whole thing fades a little each frame, so a natural trail forms behind anyone who
 * moves and recovers behind them. The canvas is uploaded as a texture the grass
 * shader samples (mapped to world XZ) to lean / shorten / lighten / dissolve blades.
 *
 * One texture lookup per blade is both more natural and cheaper than looping
 * over every character per blade (the 'Radius' layer source still does that).
 */
const RESOLUTION = 256
const WORLD_SIZE = 28 // world units the canvas spans (centred on the hero)
const FADE_PER_FRAME = 0.02 // how fast the trail recovers
const MAIN_BRUSH_RADIUS = 1.15 // world units
const COMPANION_BRUSH_RADIUS = 0.85
const UPDATE_RATE = 30
const UPDATE_INTERVAL = 1 / UPDATE_RATE

function createBrush(radius) {
    const diameter = Math.ceil(radius * 2)
    const canvas = document.createElement('canvas')
    canvas.width = diameter
    canvas.height = diameter
    const ctx = canvas.getContext('2d')
    const center = diameter * 0.5
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, diameter, diameter)
    return canvas
}

export default function GrassTrail({ grassMaterial }) {
    const prev = useRef({ x: 0, z: 0, initialized: false })
    const elapsedRef = useRef(0)

    const { canvas, ctx, texture, mainBrush, companionBrush } = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = RESOLUTION
        canvas.height = RESOLUTION
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, RESOLUTION, RESOLUTION)

        const texture = new THREE.CanvasTexture(canvas)
        texture.flipY = false // map uv directly to canvas pixels (uv.y -> worldZ)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping

        const scale = RESOLUTION / WORLD_SIZE
        return {
            canvas,
            ctx,
            texture,
            mainBrush: createBrush(MAIN_BRUSH_RADIUS * scale),
            companionBrush: createBrush(COMPANION_BRUSH_RADIUS * scale),
        }
    }, [])

    useEffect(() => {
        grassMaterial.uniforms.uTrailTexture.value = texture
        grassMaterial.uniforms.uTrailWorldSize.value = WORLD_SIZE
        grassMaterial.uniforms.uTrailResolution.value = RESOLUTION

        return () => {
            if (grassMaterial.uniforms.uTrailTexture.value === texture) {
                grassMaterial.uniforms.uTrailTexture.value = null
            }
            texture.dispose()
        }
    }, [grassMaterial, texture])

    useFrame((_, delta) => {
        elapsedRef.current += delta
        if (elapsedRef.current < UPDATE_INTERVAL) return
        const elapsed = elapsedRef.current
        elapsedRef.current = 0

        const scale = RESOLUTION / WORLD_SIZE
        const hero = useStore.getState().heroPosition
        const centerX = hero.x
        const centerZ = hero.z

        if (!prev.current.initialized) {
            prev.current.x = centerX
            prev.current.z = centerZ
            prev.current.initialized = true
        }

        // Scroll the existing trail so the hero stays centred.
        const canvasDx = -(centerX - prev.current.x) * scale
        const canvasDz = -(centerZ - prev.current.z) * scale
        ctx.globalCompositeOperation = 'copy'
        ctx.drawImage(canvas, canvasDx, canvasDz)

        // Fade toward black (recovery).
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1 - Math.pow(1 - FADE_PER_FRAME, elapsed * 60)
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, RESOLUTION, RESOLUTION)
        ctx.globalAlpha = 1

        // Paint each active character (additively, so overlaps stay bright). When
        // the trail is disabled we still scroll + fade, so it dissolves away cleanly.
        const enabled = useStore.getState().grassParameters.trampleEnabled ?? true
        ctx.globalCompositeOperation = 'lighten'
        const data = enabled ? getTrampleData() : null
        for (let i = 0; data && i < MAX_TRAMPLERS; i++) {
            if (data[i * 4 + 3] < 0.5) continue
            const px = RESOLUTION * 0.5 + (data[i * 4] - centerX) * scale
            const py = RESOLUTION * 0.5 + (data[i * 4 + 2] - centerZ) * scale
            const brush = i === 0 ? mainBrush : companionBrush
            ctx.drawImage(brush, px - brush.width * 0.5, py - brush.height * 0.5)
        }
        ctx.globalCompositeOperation = 'source-over'

        grassMaterial.uniforms.uTrailCenter.value.set(centerX, centerZ)
        texture.needsUpdate = true
        prev.current.x = centerX
        prev.current.z = centerZ
    })

    return null
}
