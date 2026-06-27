import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

import useStore from '../stores/useStore.jsx'
import './dialogue.css'

// Reusable character speech bubble: the line reveals word-by-word (same as the intro dialogue),
// then a confirm button fades into its reserved slot (so the bubble never shifts). Click the text
// to reveal it all at once. Used by the intro Dialogue and every in-game character speech.
export default function SpeechBubble({ text, confirmLabel, onConfirm }) {
    const ui = useStore((state) => state.gameUiParameters)
    const [skipped, setSkipped] = useState(false)
    const [finished, setFinished] = useState(false)
    const doneTimerRef = useRef(null)

    const words = useMemo(() => (text ?? '').split(/\s+/).filter(Boolean), [text])
    const stagger = ui.wordStagger ?? 90
    const fade = ui.wordFade ?? 420

    useEffect(() => {
        setSkipped(false)
        setFinished(false)
        clearTimeout(doneTimerRef.current)
        doneTimerRef.current = setTimeout(() => setFinished(true), words.length * stagger + fade)
        return () => clearTimeout(doneTimerRef.current)
    }, [words, stagger, fade])

    const revealAll = () => {
        setSkipped(true)
        setFinished(true)
    }
    const showConfirm = finished || skipped

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

            {confirmLabel && (
                // Always rendered (reserves its space) so revealing it never shifts the bubble.
                <button className={`dialogue-start ${showConfirm ? '' : 'dialogue-start--pending'}`} onClick={onConfirm}>
                    {confirmLabel}
                </button>
            )}
        </div>
    )
}
