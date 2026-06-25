import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import '../game/songGame.css'

// Light musical-note glyphs — just a subtle "is singing" cue (no vivid colour/number).
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬', '♪', '♫', '♩']
const AMBIENT_MIN = 0.45 // seconds between idle notes (randomized up to AMBIENT_MAX)
const AMBIENT_MAX = 0.95

/**
 * Soft notes that rise above a companion's head. Idle (the real music now carries the audio
 * cue) they drift up on a gentle randomized timer; during the mini-game the target instead
 * mirrors the demonstrated sequence (one note per sung stone). Each note fades in + scales up,
 * drifts up with a sine sway, grows, then fades (all tweakable via Song Game params).
 */
export default function CompanionNotes({ headY = 1.05, isTarget = false }) {
    const ui = useStore((state) => state.songGameParameters)
    const [floats, setFloats] = useState([])
    const idRef = useRef(0)
    const prevActiveRef = useRef(null)
    const gameKeyRef = useRef(0)
    const lastKeyRef = useRef(null)
    const nextAmbientRef = useRef(0)

    const spawn = (index) => {
        const id = idRef.current++
        const params = useStore.getState().songGameParameters
        const lifetime = (params.noteDuration ?? 1.5) * 1000
        const rx = (Math.random() - 0.5) * (params.noteSize ?? 56) * 0.9 // spread the stream a bit
        setFloats((list) => [...list.slice(-6), { id, index, rx }])
        setTimeout(() => setFloats((list) => list.filter((note) => note.id !== id)), lifetime)
    }

    useFrame((state) => {
        const songGame = useSongGame.getState()
        const t = state.clock.elapsedTime

        if (isTarget && songGame.active) {
            // Mini-game: spawn a note on each rising edge of the demonstrated sequence.
            const active = songGame.stage === 'playback' ? songGame.activeNote : null
            if (active != null && prevActiveRef.current == null) gameKeyRef.current++
            prevActiveRef.current = active
            const key = active != null ? `g${gameKeyRef.current}` : null
            if (key != null && key !== lastKeyRef.current) {
                lastKeyRef.current = key
                spawn(active)
            } else if (key == null) {
                lastKeyRef.current = null
            }
            nextAmbientRef.current = 0
            return
        }

        // While another companion is in the mini-game, stay quiet so the played sequence reads.
        if (songGame.active) return

        // Idle "is singing" cue: a gentle stream of soft notes on a randomized timer.
        if (nextAmbientRef.current === 0 || t >= nextAmbientRef.current) {
            if (nextAmbientRef.current !== 0) spawn(Math.floor(Math.random() * NOTE_GLYPHS.length))
            nextAmbientRef.current = t + AMBIENT_MIN + Math.random() * (AMBIENT_MAX - AMBIENT_MIN)
        }
    })

    if (floats.length === 0) return null

    return (
        <Html position={[0, headY, 0]} center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
            <div className="song-notes-anchor">
                {floats.map((note) => (
                    <div
                        key={note.id}
                        className="song-float-note song-float-note-soft"
                        style={{
                            left: `${note.rx}px`,
                            '--note-size': `${ui.noteSize}px`,
                            '--note-rise': `${ui.noteRise}px`,
                            '--note-dur': `${ui.noteDuration}s`,
                            '--note-grow': ui.noteGrow,
                            '--note-wobble': `${ui.noteWobble}px`,
                        }}
                    >
                        {NOTE_GLYPHS[note.index] ?? '♪'}
                    </div>
                ))}
            </div>
        </Html>
    )
}
