import { useEffect, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useStore from '../stores/useStore.jsx'
import SpeechBubble from './SpeechBubble.jsx'
import { playSigh } from './ambientSounds.js'
import { DIALOGUE_TEXT, INTRO_DIALOGUE_DELAY } from './gameConfig.js'

// Intro speech bubble, shown after the camera arcs to the hero's face. The bubble + word-by-word
// reveal live in the shared SpeechBubble (same as every in-game character speech); this just gates
// it to the intro phase and the post-arc delay.
export default function Dialogue() {
    const phase = usePhases((state) => state.phase)
    const setPhase = usePhases((state) => state.setPhase)

    const [visible, setVisible] = useState(false)
    const timerRef = useRef(null)

    useEffect(() => {
        clearTimeout(timerRef.current)
        if (phase !== PHASES.intro) {
            setVisible(false)
            return
        }
        timerRef.current = setTimeout(() => {
            setVisible(true)
            // The hero sighs as the camera settles and the bubble opens (not at the intro start).
            const ambient = useStore.getState().ambientSoundParameters
            playSigh(ambient.sighSound, ambient.sighVolume)
        }, INTRO_DIALOGUE_DELAY * 1000)
        return () => clearTimeout(timerRef.current)
    }, [phase])

    if (phase !== PHASES.intro || !visible) return null

    return <SpeechBubble text={DIALOGUE_TEXT} confirmLabel="Start" onConfirm={() => setPhase(PHASES.start)} />
}
