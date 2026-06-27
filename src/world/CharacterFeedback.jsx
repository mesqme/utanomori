import { Html } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import './characterFeedback.css'

// Floating reaction above the music character's head during the mini-game:
//   • each CORRECT press pops a ♥
//   • a miss shows an emphasised ❗ "shout" burst (the strokes that signal "look!") for a beat,
//     before the character drops into its grumpy close-up speech (handled by SongGame).
// Rendered through drei <Html> so it tracks the 3D head position.

// 6 emphasis strokes radiating around the exclamation mark (cartoon "shout" lines).
const EXCLAIM_STROKES = Array.from({ length: 6 }, (_, i) => {
    const a = (-90 + i * 60) * (Math.PI / 180)
    return { x1: Math.cos(a) * 27, y1: Math.sin(a) * 27, x2: Math.cos(a) * 45, y2: Math.sin(a) * 45 }
})

export default function CharacterFeedback({ headY = 1.4 }) {
    const lastPress = useSongGame((s) => s.lastPress)
    const stage = useSongGame((s) => s.stage)

    const [hearts, setHearts] = useState([])
    const idRef = useRef(0)
    const prevNonceRef = useRef(0)
    const timersRef = useRef([])

    // Pop a ♥ on each correct press (a miss is signalled by the ❗ burst + fail flow instead).
    useEffect(() => {
        if (!lastPress || lastPress.nonce === prevNonceRef.current) return
        prevNonceRef.current = lastPress.nonce
        if (!lastPress.correct) return
        const id = idRef.current++
        setHearts((list) => [...list.slice(-4), { id }])
        const t = setTimeout(() => setHearts((list) => list.filter((h) => h.id !== id)), 1400)
        timersRef.current.push(t)
    }, [lastPress])

    useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

    const showExclaim = stage === 'fail'
    if (hearts.length === 0 && !showExclaim) return null

    return (
        <Html position={[0, headY, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className="char-feedback-anchor">
                {hearts.map((heart) => (
                    <div key={heart.id} className="char-emote char-emote--love">
                        ♥
                    </div>
                ))}
                {showExclaim && (
                    <div className="char-exclaim">
                        <svg className="char-exclaim-burst" viewBox="-50 -50 100 100" aria-hidden="true">
                            {EXCLAIM_STROKES.map((s, i) => (
                                <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
                            ))}
                        </svg>
                        <span className="char-exclaim-mark">!</span>
                    </div>
                )}
            </div>
        </Html>
    )
}
