import { useEffect, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import { DIALOGUE_TEXT, DIALOGUE_TYPE_SPEED, INTRO_DIALOGUE_DELAY } from './gameConfig.js'
import './dialogue.css'

// Speech bubble shown during the intro, after the camera has arced to the hero's
// face. Types the line out, then offers Start to begin gameplay.
export default function Dialogue() {
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)

    const [visible, setVisible] = useState(false)
    const [typed, setTyped] = useState('')
    const timersRef = useRef([])

    useEffect(() => {
        const clearTimers = () => {
            timersRef.current.forEach((id) => clearTimeout(id))
            timersRef.current = []
        }

        if (phase !== PHASES.intro) {
            clearTimers()
            setVisible(false)
            setTyped('')
            return
        }

        const startTimer = setTimeout(() => {
            setVisible(true)
            for (let i = 1; i <= DIALOGUE_TEXT.length; i++) {
                const id = setTimeout(() => setTyped(DIALOGUE_TEXT.slice(0, i)), i * DIALOGUE_TYPE_SPEED)
                timersRef.current.push(id)
            }
        }, INTRO_DIALOGUE_DELAY * 1000)
        timersRef.current.push(startTimer)

        return clearTimers
    }, [phase])

    if (phase !== PHASES.intro || !visible) return null

    const finished = typed.length >= DIALOGUE_TEXT.length

    return (
        <div className="dialogue-bubble">
            <p className="dialogue-text" onClick={() => setTyped(DIALOGUE_TEXT)}>
                {typed}
                {!finished && <span className="dialogue-caret" />}
            </p>
            {finished && (
                <button className="dialogue-start" onClick={() => setPhase(PHASES.start)}>
                    Start
                </button>
            )}
        </div>
    )
}
