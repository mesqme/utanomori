import './InteractionPrompt.css'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import useAudio from '../stores/useAudio.jsx'
import { resumeAudio } from '../game/songAudio.js'

export default function InteractionPrompt() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const targetInRange = useCompanions((state) => state.targetInRange)
    const found = useCompanions((state) => state.found)
    const songActive = useSongGame((state) => state.active)
    const muted = useAudio((state) => state.muted)
    const toggleMuted = useAudio((state) => state.toggleMuted)

    if (phase !== PHASES.start) return null

    const showPrompt = target && targetInRange && !songActive
    const complete = found.length >= MAX_PARTY

    const startSong = () => {
        const { target: current, targetInRange: inRange } = useCompanions.getState()
        if (!current || !inRange || useSongGame.getState().active) return
        resumeAudio()
        useSongGame.getState().begin(current)
    }

    return (
        <>
            <div className="top-left-hud">
                <div className="party-counter">{complete ? 'ALL MELODIES FOUND' : `MELODIES ${found.length} / ${MAX_PARTY}`}</div>
                <button
                    className="sound-toggle"
                    onClick={toggleMuted}
                    aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                    title={muted ? 'Sound off' : 'Sound on'}
                >
                    <svg className="sound-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z" />
                        {muted ? (
                            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16 9.5l5 5M21 9.5l-5 5" />
                        ) : (
                            <>
                                <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
                                <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M18 7a7 7 0 0 1 0 10" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {showPrompt && (
                <button className="interaction-prompt" onClick={startSong}>
                    Talk to {target.label} <span className="interaction-key"><span>E</span></span>
                </button>
            )}
        </>
    )
}
