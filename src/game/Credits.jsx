import { useEffect, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import Blot from './Blot.jsx'
import { CREDITS_LINES, CREDITS_SCROLL_DURATION } from './gameConfig.js'
import './credits.css'

// End sequence: the hero auto-runs (handled in MainCharacter) while the credits
// scroll up. When they finish, the player can continue or restart the whole loop.
export default function Credits() {
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)
    const [done, setDone] = useState(false)

    useEffect(() => {
        if (phase !== PHASES.credits) {
            setDone(false)
            return
        }
        const id = setTimeout(() => setDone(true), CREDITS_SCROLL_DURATION * 1000)
        return () => clearTimeout(id)
    }, [phase])

    if (phase !== PHASES.credits) return null

    return (
        <div className="credits-overlay">
            {!done && (
                <div className="credits-scroll" style={{ animationDuration: `${CREDITS_SCROLL_DURATION}s` }}>
                    {CREDITS_LINES.map((line, index) => (
                        <div key={index} className={`credits-line ${index === 0 ? 'credits-title' : ''}`}>
                            {line || '\u00a0'}
                        </div>
                    ))}
                </div>
            )}

            {done && (
                <div className="credits-choice">
                    <Blot as="button" variant="button" className="credits-button" onClick={() => setPhase(PHASES.start)}>
                        Continue
                    </Blot>
                    <div className="credits-choice-title">{CREDITS_LINES[0]}</div>
                    <Blot as="button" variant="button" className="credits-button" onClick={() => setPhase(PHASES.warmup)}>
                        Restart
                    </Blot>
                </div>
            )}
        </div>
    )
}
