import { useEffect } from 'react'
import './tutorial.css'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useTutorial from '../stores/useTutorial.jsx'
import useStore from '../stores/useStore.jsx'
import { GAMEPLAY_ENTRY_DURATION } from '../game/gameConfig.js'
import controlsImg from '../assets/textures/controls.jpg'
import charPointerImg from '../assets/textures/char_pointer.jpg'
import gameplayImg from '../assets/textures/gameplay.jpg'

// Wait for the camera to settle into the gameplay follow shot before the first frame opens.
const INTRO_FRAME_DELAY = (GAMEPLAY_ENTRY_DURATION + 0.4) * 1000

// frame id → { image, alt, text, button, next-frame-on-click }
const FRAMES = {
    1: {
        image: controlsImg,
        alt: 'Movement controls',
        text: 'Wander through the forest with WASD or the arrow keys.',
        button: 'Next',
        next: 2,
    },
    2: {
        image: charPointerImg,
        alt: 'The white direction arrow',
        text: 'A glowing white arrow points the way. Follow it to find the lost melody spirits.',
        button: 'Got it',
        next: 0,
    },
    3: {
        image: gameplayImg,
        alt: 'The song mini-game',
        text: 'Each spirit guards a song. Listen closely as it sings, then echo the melody back note for note to win it to your side.',
        button: 'Got it',
        next: 0,
    },
}

export default function Tutorial() {
    const phase = usePhases((state) => state.phase)
    const frame = useTutorial((state) => state.frame)
    const setFrame = useTutorial((state) => state.setFrame)
    const buttonOutside = useStore((state) => state.gameUiParameters.tutorialButtonOutside)

    // Frames 1 → 2 open a beat after gameplay begins (once the camera has risen into place).
    // showIntro() is self-guarding, so re-entering `start` on a restart never replays it.
    useEffect(() => {
        if (phase !== PHASES.start) return
        const timer = setTimeout(() => useTutorial.getState().showIntro(), INTRO_FRAME_DELAY)
        return () => clearTimeout(timer)
    }, [phase])

    const current = FRAMES[frame]
    if (!current) return null

    const button = (
        <button className="tutorial-button" onClick={() => setFrame(current.next)}>
            {current.button}
        </button>
    )

    return (
        <div className="tutorial-overlay">
            <div className="tutorial-stack" key={frame}>
                <div className="tutorial-card">
                    <img className="tutorial-image" src={current.image} alt={current.alt} draggable={false} />
                    <p className="tutorial-text">{current.text}</p>
                    {!buttonOutside && button}
                </div>
                {buttonOutside && button}
            </div>
        </div>
    )
}
