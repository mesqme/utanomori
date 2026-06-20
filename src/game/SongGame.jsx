import { useEffect } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import { NOTES, ROUND_LENGTHS, SONG_BEAT } from '../config/notes.js'
import { playNote, resumeAudio } from './songAudio.js'
import './songGame.css'

const ROUND_CLEAR_PAUSE = 1.1 // seconds before the next round plays

export default function SongGame() {
    const active = useSongGame((s) => s.active)
    const stage = useSongGame((s) => s.stage)
    const round = useSongGame((s) => s.round)
    const song = useSongGame((s) => s.song)
    const beats = useSongGame((s) => s.beats)
    const input = useSongGame((s) => s.input)
    const companion = useSongGame((s) => s.companion)
    const ui = useStore((s) => s.songGameParameters)

    // Playback: reveal each note above the head in turn (at the shared tempo + rhythm,
    // with overlapping notes), then open the wheel for input.
    useEffect(() => {
        if (stage !== 'playback') return
        const length = ROUND_LENGTHS[round]
        const sequence = song.slice(0, length)
        const sequenceBeats = sequence.map((_, i) => beats[i] ?? 1)
        resumeAudio()

        const timers = []
        let t = 0
        sequence.forEach((note, i) => {
            const spacing = sequenceBeats[i] * SONG_BEAT
            const at = t
            timers.push(
                setTimeout(() => {
                    useSongGame.getState().setActiveNote(note)
                    playNote(note, { duration: spacing * 1.4 })
                }, at * 1000)
            )
            timers.push(setTimeout(() => useSongGame.getState().setActiveNote(null), (at + spacing * 0.92) * 1000))
            t += spacing
        })
        timers.push(setTimeout(() => useSongGame.getState().openWheel(), (t + 0.3) * 1000))

        return () => timers.forEach(clearTimeout)
    }, [stage, round, song, beats])

    // Round cleared → play the next round after a short beat.
    useEffect(() => {
        if (stage !== 'roundClear') return
        const t = setTimeout(() => useSongGame.getState().nextRound(), ROUND_CLEAR_PAUSE * 1000)
        return () => clearTimeout(t)
    }, [stage])

    // ESC leaves the mini-game (the target stays so you can try again).
    useEffect(() => {
        if (!active) return
        const onKey = (event) => {
            if (event.key === 'Escape') useSongGame.getState().reset()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [active])

    if (!active) return null

    const length = ROUND_LENGTHS[round]
    const radius = ui.wheelRadius
    const buttonSize = ui.buttonSize
    const wheelBox = radius * 2 + buttonSize + 24
    const canExit = stage === 'prompt' || stage === 'playback' || stage === 'input' || stage === 'roundClear'

    return (
        <div className="song-game">
            <div className="song-round">Round {round + 1} / 3</div>

            {canExit && (
                <button className="song-exit" onClick={() => useSongGame.getState().reset()} aria-label="Exit">
                    Exit <span className="song-key">ESC</span>
                </button>
            )}

            {/* The note wheel is visible for the whole game; only clickable while listening for input. */}
            {stage !== 'prompt' && (
                <div className="song-wheel" style={{ width: wheelBox, height: wheelBox }} role="group" aria-label="Repeat the song">
                    {NOTES.map((note, i) => {
                        const angle = (i / NOTES.length) * Math.PI * 2 - Math.PI / 2
                        const x = Math.cos(angle) * radius
                        const y = Math.sin(angle) * radius
                        const clickable = stage === 'input'
                        return (
                            <button
                                key={note.name}
                                className={`song-note${clickable ? '' : ' song-note-idle'}`}
                                style={{
                                    background: note.color,
                                    width: buttonSize,
                                    height: buttonSize,
                                    fontSize: Math.round(buttonSize * 0.36),
                                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                                    pointerEvents: clickable ? 'auto' : 'none',
                                }}
                                onClick={() => {
                                    if (!clickable) return
                                    playNote(i, { duration: 0.5 })
                                    useSongGame.getState().pressNote(i)
                                }}
                            >
                                {i + 1}
                            </button>
                        )
                    })}
                    <div className="song-wheel-center" style={{ width: buttonSize * 1.6, height: buttonSize * 1.6 }}>
                        {stage === 'input' ? `${input.length} / ${length}` : stage === 'playback' ? 'Listen' : ''}
                    </div>
                </div>
            )}

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

            {stage === 'roundClear' && <div className="song-banner song-good">Nice!</div>}
            {stage === 'success' && <div className="song-banner song-good">{companion?.label ?? 'Friend'} is happy!</div>}
            {stage === 'fail' && <div className="song-banner song-bad">Oops! It ran away…</div>}
        </div>
    )
}
