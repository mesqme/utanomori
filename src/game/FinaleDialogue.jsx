import { useEffect, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import SpeechBubble from './SpeechBubble.jsx'
import { FINALE_DIALOGUE_DELAY } from './gameConfig.js'
import { FINALE_LINE, FINALE_CONFIRM } from './gameText.js'

// Closing line, shown once the party is complete (PHASES.finale) after the camera has eased in to the
// hero. "Continue" rolls the credits. Same shared SpeechBubble + word reveal as the intro / character
// speech; this just gates it to the finale phase and the post-camera delay (mirrors Dialogue.jsx).
export default function FinaleDialogue() {
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)

    const [visible, setVisible] = useState(false)
    const timerRef = useRef(null)

    useEffect(() => {
        clearTimeout(timerRef.current)
        if (phase !== PHASES.finale) {
            setVisible(false)
            return
        }
        timerRef.current = setTimeout(() => setVisible(true), FINALE_DIALOGUE_DELAY * 1000)
        return () => clearTimeout(timerRef.current)
    }, [phase])

    if (phase !== PHASES.finale || !visible) return null

    return <SpeechBubble text={FINALE_LINE} confirmLabel={FINALE_CONFIRM} onConfirm={() => setPhase(PHASES.credits)} />
}
