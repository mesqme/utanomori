import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useStore from '../stores/useStore.jsx'
import { DIALOGUE_TEXT, INTRO_DIALOGUE_DELAY } from './gameConfig.js'
import './dialogue.css'

// Speech bubble shown during the intro, after the camera has arced to the hero's face.
// A clean DOM bubble (no Blot texture / brushy edge): the full line is laid out from the
// start so the box never resizes, and the words reveal one by one with a soft fade-up
// (instead of a typewriter). Click the text to reveal it all at once.
export default function Dialogue() {
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)
    const ui = useStore((state) => state.gameUiParameters)

    const [visible, setVisible] = useState(false)
    const [skipped, setSkipped] = useState(false) // clicked → reveal everything now
    const [finished, setFinished] = useState(false) // reveal animation done → offer Start
    const timersRef = useRef([])

    const words = useMemo(() => DIALOGUE_TEXT.split(/\s+/).filter(Boolean), [])
    const stagger = ui.wordStagger ?? 90
    const fade = ui.wordFade ?? 420

    useEffect(() => {
        const clear = () => {
            timersRef.current.forEach((id) => clearTimeout(id))
            timersRef.current = []
        }

        if (phase !== PHASES.intro) {
            clear()
            setVisible(false)
            setSkipped(false)
            setFinished(false)
            return
        }

        const show = setTimeout(() => {
            setVisible(true)
            const done = setTimeout(() => setFinished(true), words.length * stagger + fade)
            timersRef.current.push(done)
        }, INTRO_DIALOGUE_DELAY * 1000)
        timersRef.current.push(show)

        return clear
    }, [phase, words, stagger, fade])

    if (phase !== PHASES.intro || !visible) return null

    const revealAll = () => {
        setSkipped(true)
        setFinished(true)
    }
    const showStart = finished || skipped

    return (
        <div className="dialogue-anchor" style={{ '--dlg-width': `${ui.bubbleWidth ?? 460}px` }}>
            <div className="dialogue-bubble">
                <p className={`dialogue-text ${skipped ? 'dialogue-text--instant' : ''}`} onClick={revealAll}>
                    {words.map((word, i) => (
                        <Fragment key={i}>
                            {i > 0 ? ' ' : null}
                            <span
                                className="dialogue-word"
                                style={{ animationDelay: `${i * stagger}ms`, animationDuration: `${fade}ms` }}
                            >
                                {word}
                            </span>
                        </Fragment>
                    ))}
                </p>
            </div>

            {/* Always rendered (reserves its space) so revealing it never shifts the bubble. */}
            <button
                className={`dialogue-start ${showStart ? '' : 'dialogue-start--pending'}`}
                onClick={() => setPhase(PHASES.start)}
            >
                Start
            </button>
        </div>
    )
}
