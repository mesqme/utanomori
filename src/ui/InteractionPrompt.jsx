import './InteractionPrompt.css'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'

export default function InteractionPrompt() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const targetInRange = useCompanions((state) => state.targetInRange)
    const found = useCompanions((state) => state.found)

    if (phase !== PHASES.start) return null

    const showPrompt = target && targetInRange
    const complete = found.length >= MAX_PARTY

    return (
        <>
            <div className="party-counter">
                {complete ? 'PARTY COMPLETE' : `FRIENDS ${found.length} / ${MAX_PARTY}`}
            </div>

            {showPrompt && (
                <button className="interaction-prompt" onClick={() => useCompanions.getState().interact()}>
                    Meet {target.label} <span className="interaction-key">E</span>
                </button>
            )}
        </>
    )
}
