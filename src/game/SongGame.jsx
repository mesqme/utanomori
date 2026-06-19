import { useEffect } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import { NOTES, ROUND_LENGTHS } from '../config/notes.js'
import { playNote, resumeAudio } from './songAudio.js'
import './songGame.css'

const NOTE_CADENCE = 0.7 // seconds between sung notes
const NOTE_VISIBLE = 0.5 // how long each note shows above the head
const ROUND_CLEAR_PAUSE = 1.1 // seconds before the next round plays
const WHEEL_RADIUS = 104 // px from wheel centre to each note button

export default function SongGame() {
    const active = useSongGame((s) => s.active)
    const stage = useSongGame((s) => s.stage)
    const round = useSongGame((s) => s.round)
    const song = useSongGame((s) => s.song)
    const input = useSongGame((s) => s.input)
    const companion = useSongGame((s) => s.companion)

    // Playback: reveal each note above the head in turn, then open the wheel.
    useEffect(() => {
        if (stage !== 'playback') return
        const length = ROUND_LENGTHS[round]
        const sequence = song.slice(0, length)
        resumeAudio()

        const timers = []
        sequence.forEach((note, i) => {
            timers.push(
                setTimeout(() => {
                    useSongGame.getState().setActiveNote(note)
                    playNote(note, { duration: NOTE_VISIBLE + 0.1 })
                }, i * NOTE_CADENCE * 1000)
            )
            timers.push(setTimeout(() => useSongGame.getState().setActiveNote(null), (i * NOTE_CADENCE + NOTE_VISIBLE) * 1000))
        })
        timers.push(setTimeout(() => useSongGame.getState().openWheel(), (sequence.length * NOTE_CADENCE + 0.25) * 1000))

        return () => timers.forEach(clearTimeout)
    }, [stage, round, song])

    // Round cleared → play the next round after a short beat.
    useEffect(() => {
        if (stage !== 'roundClear') return
        const t = setTimeout(() => useSongGame.getState().nextRound(), ROUND_CLEAR_PAUSE * 1000)
        return () => clearTimeout(t)
    }, [stage])

    if (!active) return null

    const length = ROUND_LENGTHS[round]

    return (
        <div className="song-game">
            <div className="song-round">Round {round + 1} / 3</div>

            {stage === 'prompt' && (
                <div className="song-prompt">
                    <p className="song-prompt-text">Are you ready to repeat my song?</p>
                    <button
                        className="song-yes"
                        onClick={() => {
                            resumeAudio()
                            useSongGame.getState().confirmReady()
                        }}
                    >
                        Yes
                    </button>
                </div>
            )}

            {stage === 'playback' && <div className="song-banner">Listen…</div>}

            {stage === 'input' && (
                <div className="song-wheel" role="group" aria-label="Repeat the song">
                    {NOTES.map((note, i) => {
                        const angle = (i / NOTES.length) * Math.PI * 2 - Math.PI / 2
                        const x = Math.cos(angle) * WHEEL_RADIUS
                        const y = Math.sin(angle) * WHEEL_RADIUS
                        return (
                            <button
                                key={note.name}
                                className="song-note"
                                style={{ background: note.color, transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
                                onClick={() => {
                                    playNote(i, { duration: 0.5 })
                                    useSongGame.getState().pressNote(i)
                                }}
                            >
                                {i + 1}
                            </button>
                        )
                    })}
                    <div className="song-wheel-center">
                        {input.length} / {length}
                    </div>
                </div>
            )}

            {stage === 'roundClear' && <div className="song-banner song-good">Nice!</div>}
            {stage === 'success' && <div className="song-banner song-good">{companion?.label ?? 'Friend'} is happy!</div>}
            {stage === 'fail' && <div className="song-banner song-bad">Oops! It ran away…</div>}
        </div>
    )
}
