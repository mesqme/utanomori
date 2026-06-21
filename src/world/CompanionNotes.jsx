import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import { voiceCurrentNote } from '../game/songAudio.js'
import '../game/songGame.css'

// Light musical-note glyphs — just a subtle "is singing" cue (no vivid colour/number).
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬', '♪', '♫', '♩']

/**
 * Coloured + numbered notes that rise above a singing companion's head, one per sung
 * note. While singing they follow the looping voice (synced to the audio clock); during
 * the mini-game the target instead mirrors the sequence being demonstrated. Each note
 * fades in + scales up, drifts up with a sine sway, grows, then fades (all tweakable).
 */
export default function CompanionNotes({ headY = 1.05, voiceRef, isTarget = false }) {
    const ui = useStore((state) => state.songGameParameters)
    const [floats, setFloats] = useState([])
    const lastKeyRef = useRef(null)
    const idRef = useRef(0)
    const prevActiveRef = useRef(null)
    const gameKeyRef = useRef(0)

    useFrame(() => {
        const songGame = useSongGame.getState()
        let index = null
        let key = null

        if (isTarget && songGame.active) {
            // Mini-game: spawn a note on each rising edge of the demonstrated sequence.
            const active = songGame.stage === 'playback' ? songGame.activeNote : null
            if (active != null && prevActiveRef.current == null) gameKeyRef.current++
            prevActiveRef.current = active
            if (active != null) {
                index = active
                key = `g${gameKeyRef.current}`
            }
        } else if (!songGame.active && voiceRef?.current) {
            const current = voiceCurrentNote(voiceRef.current)
            if (current) {
                index = current.index
                key = `v${current.key}`
            }
        }

        if (key != null && key !== lastKeyRef.current) {
            lastKeyRef.current = key
            const id = idRef.current++
            const params = useStore.getState().songGameParameters
            const lifetime = (params.noteDuration ?? 1.5) * 1000
            const rx = (Math.random() - 0.5) * (params.noteSize ?? 56) * 0.9 // spread the stream a bit
            setFloats((list) => [...list.slice(-6), { id, index, rx }])
            setTimeout(() => setFloats((list) => list.filter((note) => note.id !== id)), lifetime)
        } else if (key == null) {
            lastKeyRef.current = null
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
