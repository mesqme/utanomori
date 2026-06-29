import './InteractionPrompt.css'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import { resumeAudio } from '../game/songAudio.js'

export default function InteractionPrompt() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const targetInRange = useCompanions((state) => state.targetInRange)
    const found = useCompanions((state) => state.found)
    const songActive = useSongGame((state) => state.active)

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
            <div className="party-counter">{complete ? 'ALL MELODIES FOUND' : `MELODIES ${found.length} / ${MAX_PARTY}`}</div>

            {showPrompt && (
                <button className="interaction-prompt" onClick={startSong}>
                    Talk to {target.label} <span className="interaction-key">E</span>
                </button>
            )}
        </>
    )
}
