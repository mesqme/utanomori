import { useEffect, useRef } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useStore from '../stores/useStore.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { useIsMobile, useIsPortrait } from '../config/mobile.js'
import { joystickInput, resetJoystick } from './joystickInput.js'
import './Joystick.css'

// On-screen analog joystick for touch devices — replaces the keyboard arrows / on-screen d-pad.
// Shown only on the mobile experience (isMobile — touch / coarse-pointer device; Chrome device mode
// flips it live, see config/device.js).
export default function Joystick() {
    const phase = usePhases((state) => state.phase)
    const songActive = useSongGame((state) => state.active)
    const params = useStore((state) => state.joystickParameters)
    const mobile = useIsMobile()
    const portrait = useIsPortrait()

    const baseRef = useRef(null)
    const knobRef = useRef(null)
    const dragRef = useRef({ pointerId: null, cx: 0, cy: 0 })

    // Only on the mobile experience, and only when the hero is controllable (gameplay, not mini-game).
    const visible = mobile && phase === PHASES.start && !songActive

    // Zero the input + recentre the knob whenever the joystick goes away (so a held drag can't stick).
    useEffect(() => {
        if (!visible) {
            resetJoystick()
            if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)'
        }
    }, [visible])

    if (!visible) return null

    const radius = params.size / 2

    const centreKnob = () => {
        if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)'
    }

    const applyPointer = (clientX, clientY) => {
        const { cx, cy } = dragRef.current
        const dx = clientX - cx
        const dy = clientY - cy
        const dist = Math.hypot(dx, dy)
        const clamped = Math.min(dist, radius)
        const ux = dist > 0 ? dx / dist : 0
        const uy = dist > 0 ? dy / dist : 0

        if (knobRef.current) {
            knobRef.current.style.transform = `translate(calc(-50% + ${ux * clamped}px), calc(-50% + ${uy * clamped}px))`
        }

        const mag = clamped / radius // 0..1
        if (mag > params.deadzone) {
            joystickInput.x = ux
            joystickInput.z = uy
            joystickInput.active = true
            joystickInput.run = mag >= params.runThreshold
        } else {
            resetJoystick()
        }
    }

    const onPointerDown = (event) => {
        event.preventDefault()
        const rect = baseRef.current.getBoundingClientRect()
        dragRef.current.cx = rect.left + rect.width / 2
        dragRef.current.cy = rect.top + rect.height / 2
        dragRef.current.pointerId = event.pointerId
        baseRef.current.setPointerCapture(event.pointerId)
        applyPointer(event.clientX, event.clientY)
    }

    const onPointerMove = (event) => {
        if (dragRef.current.pointerId !== event.pointerId) return
        applyPointer(event.clientX, event.clientY)
    }

    const onPointerUp = (event) => {
        if (dragRef.current.pointerId !== event.pointerId) return
        dragRef.current.pointerId = null
        resetJoystick()
        centreKnob()
    }

    // Landscape: parked in the chosen corner (side + marginX/marginY). Portrait ("lazy" one-hand
    // hold): bottom-CENTRE, raised by its own marginYPortrait. Margins add the safe-area insets so
    // the stick never hides behind an iPhone home indicator / notch edge.
    const bottomMargin = portrait ? params.marginYPortrait ?? params.marginY : params.marginY
    const baseStyle = {
        width: `${params.size}px`,
        height: `${params.size}px`,
        bottom: `calc(${bottomMargin}px + env(safe-area-inset-bottom, 0px))`,
        ...(portrait
            ? { left: '50%', marginLeft: `${-params.size / 2}px` }
            : {
                  [params.side === 'right' ? 'right' : 'left']: `calc(${params.marginX}px + env(safe-area-inset-${
                      params.side === 'right' ? 'right' : 'left'
                  }, 0px))`,
              }),
        opacity: params.opacity,
        '--joy-base-color': params.baseColor,
        '--joy-knob-color': params.knobColor,
    }

    return (
        <div
            ref={baseRef}
            className="joystick-base"
            style={baseStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            <div ref={knobRef} className="joystick-knob" style={{ width: `${params.knobSize}px`, height: `${params.knobSize}px` }} />
        </div>
    )
}
