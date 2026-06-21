import { useEffect, useState } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import { ROUND_LENGTHS, SONG_BEAT } from '../config/notes.js'
import { playNote, resumeAudio } from './songAudio.js'
import './songGame.css'

const ROUND_CLEAR_PAUSE = 1.1 // seconds before the next round plays

// How long the 3D stones take to rise (must match MusicStones' scale-in) before playback.
function setupDuration() {
    const p = useStore.getState().musicStoneParameters
    return (p?.scaleInDuration ?? 0.5) + 6 * (p?.staggerDelay ?? 0.12) + 0.2
}

// The mini-game is now presented in 3D (see MusicStones): the seven colour stones replace
// the note wheel. This component is a thin HUD (prompt / banners / round) plus the playback
// and round timers — the orchestration the 3D presentation reacts to.
export default function SongGame() {
    const active = useSongGame((s) => s.active)
    const stage = useSongGame((s) => s.stage)
    const round = useSongGame((s) => s.round)
    const song = useSongGame((s) => s.song)
    const beats = useSongGame((s) => s.beats)
    const input = useSongGame((s) => s.input)
    const companion = useSongGame((s) => s.companion)
    const [stonesReady, setStonesReady] = useState(false)

    // Setup: the stones rise + camera lifts; once they're up, show the "Start" button (the
    // player presses it to begin the song — no auto-start).
    useEffect(() => {
        if (stage !== 'setup') {
            setStonesReady(false)
            return
        }
        setStonesReady(false)
        const t = setTimeout(() => setStonesReady(true), setupDuration() * 1000)
        return () => clearTimeout(t)
    }, [stage])

    // Playback: light each note's stone in turn (shared tempo + rhythm, slowed by listenTempo
    // so the melody is easier to hear), then open input.
    useEffect(() => {
        if (stage !== 'playback') return
        const length = ROUND_LENGTHS[round]
        const sequence = song.slice(0, length)
        const sequenceBeats = sequence.map((_, i) => beats[i] ?? 1)
        const tempo = useStore.getState().musicStoneParameters?.listenTempo ?? 1
        resumeAudio()

        const timers = []
        let t = 0
        sequence.forEach((note, i) => {
            const spacing = sequenceBeats[i] * SONG_BEAT * tempo
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
    const canExit = stage === 'prompt' || stage === 'setup' || stage === 'playback' || stage === 'input' || stage === 'roundClear'
    const status =
        stage === 'setup' ? 'Get ready…' : stage === 'playback' ? 'Listen' : stage === 'input' ? `${input.length} / ${length}` : ''

    return (
        <div className="song-game">
            <div className="song-round">
                Round {round + 1} / 3{status ? ` · ${status}` : ''}
            </div>

            {canExit && (
                <button className="song-exit" onClick={() => useSongGame.getState().reset()} aria-label="Exit">
                    Exit <span className="song-key">ESC</span>
                </button>
            )}

            {stage === 'prompt' && (
                <div className="song-prompt">
                    <p className="song-prompt-text">Hello, will you try my melody?</p>
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

            {stage === 'setup' && stonesReady && (
                <div className="song-start">
                    <button className="song-yes song-start-button" onClick={() => useSongGame.getState().startPlayback()}>
                        Start
                    </button>
                </div>
            )}

            {stage === 'roundClear' && <div className="song-banner song-good">Nice!</div>}
            {stage === 'success' && <div className="song-banner song-good">{companion?.label ?? 'Friend'} is happy!</div>}
            {stage === 'fail' && <div className="song-banner song-bad">Oops! It ran away…</div>}
        </div>
    )
}
