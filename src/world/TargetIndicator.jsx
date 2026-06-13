import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import useCompanions from '../stores/useCompanions.jsx'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { getGroundY } from './utils/groundHeight.js'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'

// Screen-space pointer for the current hidden friend:
//   - on-screen  → a bobbing pin just above the creature
//   - off-screen → an arrow pinned near the screen edge, aimed toward it
// Lives inside the Canvas (needs the camera) but drives a plain DOM element so the
// edge-clamping is trivial.
const EDGE_MARGIN = 0.86
const ARROW_SVG = `
<svg width="46" height="46" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M23 4 L34 26 L23 20 L12 26 Z" fill="${soundJourneyPalette.lantern}" stroke="${soundJourneyPalette.uiPrimary}" stroke-width="2" stroke-linejoin="round"/>
</svg>`

export default function TargetIndicator() {
    const elementRef = useRef(null)
    const projected = useRef(new THREE.Vector3())
    const { size } = useThree()

    useEffect(() => {
        const element = document.createElement('div')
        element.style.cssText =
            'position:fixed;left:0;top:0;width:46px;height:46px;margin-left:-23px;margin-top:-23px;pointer-events:none;z-index:90;display:none;filter:drop-shadow(0 2px 6px rgba(9,8,34,0.5))'
        element.innerHTML = ARROW_SVG
        document.body.appendChild(element)
        elementRef.current = element

        return () => {
            if (document.body.contains(element)) document.body.removeChild(element)
            elementRef.current = null
        }
    }, [])

    useFrame((state) => {
        const element = elementRef.current
        if (!element) return

        const companions = useCompanions.getState()
        const target = companions.target
        const visible = usePhases.getState().phase === PHASES.start && target && !companions.targetInRange

        if (!visible) {
            element.style.display = 'none'
            return
        }
        element.style.display = 'block'

        const width = size.width
        const height = size.height

        projected.current.set(target.x, getGroundY(target.x, target.z) + 1.2, target.z)
        projected.current.project(state.camera)

        let ndcX = projected.current.x
        let ndcY = projected.current.y
        const behind = projected.current.z > 1
        if (behind) {
            ndcX = -ndcX
            ndcY = -ndcY
        }

        const onScreen = !behind && ndcX >= -1 && ndcX <= 1 && ndcY >= -1 && ndcY <= 1

        if (onScreen) {
            const bob = Math.sin(state.clock.elapsedTime * 5) * 4
            const screenX = (ndcX * 0.5 + 0.5) * width
            const screenY = (-ndcY * 0.5 + 0.5) * height - 44 + bob // float (and bob) above the creature
            element.style.transform = `translate(${screenX}px, ${screenY}px) rotate(${Math.PI}rad)` // point down at it
            return
        }

        // Off-screen: clamp the direction onto the screen rectangle edge.
        const longest = Math.max(Math.abs(ndcX), Math.abs(ndcY)) || 1
        const edgeX = (ndcX / longest) * EDGE_MARGIN
        const edgeY = (ndcY / longest) * EDGE_MARGIN
        const screenX = (edgeX * 0.5 + 0.5) * width
        const screenY = (-edgeY * 0.5 + 0.5) * height
        element.style.transform = `translate(${screenX}px, ${screenY}px) rotate(${Math.atan2(edgeX, edgeY)}rad)`
    })

    return null
}
