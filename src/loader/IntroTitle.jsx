import { useEffect, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import './introTitle.css'

// "Utanomori — The forest of songs". NOT shown on the loading / GO screen. After GO it fades IN during
// the intro camera travel, stays present through the dialogue, and fades OUT when the player presses
// Start (phase → start). Separate from the Loader so the loader's own exit fade doesn't take it.
export default function IntroTitle() {
    const phase = usePhases((s) => s.phase)
    const [render, setRender] = useState(false)
    const [visible, setVisible] = useState(false)
    const timerRef = useRef(null)

    useEffect(() => {
        clearTimeout(timerRef.current)
        if (phase === PHASES.intro) {
            // Mount at opacity 0, then fade in over the next frames (across the camera travel).
            setRender(true)
            const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
            return () => cancelAnimationFrame(raf)
        }
        // Any other phase (Start pressed, etc.) → fade out, then unmount once the transition is done.
        setVisible(false)
        timerRef.current = setTimeout(() => setRender(false), 2100)
        return () => clearTimeout(timerRef.current)
    }, [phase])

    if (!render) return null

    return (
        <div className={`intro-title ${visible ? 'intro-title--visible' : ''}`}>
            <div className="intro-title-name">Utanomori</div>
            <div className="intro-title-sub">The forest of songs</div>
        </div>
    )
}
