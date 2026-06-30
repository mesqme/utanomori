import { useEffect, useState } from 'react'

import useSongGame from '../stores/useSongGame.jsx'
import useStore from '../stores/useStore.jsx'
import { getMusicCharacter } from '../config/musicCharacters.js'
import SpeechBubble from './SpeechBubble.jsx'
import { playSound } from './gameSounds.js'
import { resumeAudio } from './songAudio.js'
import './songGame.css'

const FAIL_EXCLAIM_TIME = 1.1 // seconds the ❗ burst shows (stones still up) before the speech

// All mini-game timings are tweakable in the "Music Stones" Leva folder (musicStoneParameters):
// soundSpacing, listenTempo, roundClearPause, countdownFrom, countdownStep, scaleInDuration…

// How long the stones take to rise (matches MusicStones' scale-in + stagger) before playback.
function setupDuration(stoneCount) {
    const p = useStore.getState().musicStoneParameters
    return (p?.scaleInDuration ?? 0.5) + Math.max(0, stoneCount - 1) * (p?.staggerDelay ?? 0.12) + 0.2
}

// Thin HUD (prompt / banners / round) plus the playback + round timers — the orchestration the
// 3D stones (MusicStones) react to. The stones play this character's real one-shot sounds.
export default function SongGame() {
    const active = useSongGame((s) => s.active)
    const stage = useSongGame((s) => s.stage)
    const round = useSongGame((s) => s.round)
    const rounds = useSongGame((s) => s.rounds)
    const input = useSongGame((s) => s.input)
    const companion = useSongGame((s) => s.companion)
    const failLine = useSongGame((s) => s.failLine)
    const [stonesReady, setStonesReady] = useState(false)
    const [count, setCount] = useState(0)

    const roundCount = rounds.length || 3
    const length = rounds[round] ?? 0

    // Setup: the stones rise + camera lifts; once they're up, show the "Start" button.
    useEffect(() => {
        if (stage !== 'setup') {
            setStonesReady(false)
            return
        }
        setStonesReady(false)
        const stoneCount = useSongGame.getState().stoneCount
        const t = setTimeout(() => setStonesReady(true), setupDuration(stoneCount) * 1000)
        return () => clearTimeout(t)
    }, [stage])

    // Countdown: 3·2·1 before each round's playback, then the companion sings.
    useEffect(() => {
        if (stage !== 'countdown') {
            setCount(0)
            return
        }
        const p = useStore.getState().musicStoneParameters
        const from = Math.max(1, Math.round(p?.countdownFrom ?? 3))
        const step = p?.countdownStep ?? 0.7
        setCount(from)
        const timers = []
        for (let n = from - 1; n >= 1; n--) {
            timers.push(setTimeout(() => setCount(n), (from - n) * step * 1000))
        }
        timers.push(setTimeout(() => useSongGame.getState().startMelody(), from * step * 1000))
        return () => timers.forEach(clearTimeout)
    }, [stage, round])

    // Playback: play each stone's sound in turn (the melody for this round), then open input.
    useEffect(() => {
        if (stage !== 'playback') return
        const game = useSongGame.getState()
        const len = game.rounds[round] ?? game.song.length
        const sequence = game.song.slice(0, len)
        const p = useStore.getState().musicStoneParameters
        const spacing = (p?.notePlayDuration ?? 0.9) * (p?.listenTempo ?? 1)
        resumeAudio()

        const timers = []
        let t = 0
        sequence.forEach((stone) => {
            const at = t
            timers.push(
                setTimeout(() => {
                    useSongGame.getState().setActiveNote(stone)
                    playSound(game.track, game.stoneSounds[stone])
                }, at * 1000)
            )
            timers.push(setTimeout(() => useSongGame.getState().setActiveNote(null), (at + spacing * 0.85) * 1000))
            t += spacing
        })
        timers.push(setTimeout(() => useSongGame.getState().openWheel(), (t + 0.3) * 1000))

        return () => timers.forEach(clearTimeout)
    }, [stage, round])

    // Round cleared → play the next round after a short beat.
    useEffect(() => {
        if (stage !== 'roundClear') return
        const pause = useStore.getState().musicStoneParameters?.roundClearPause ?? 1.1
        const t = setTimeout(() => useSongGame.getState().nextRound(), pause * 1000)
        return () => clearTimeout(t)
    }, [stage])

    // Miss → hold the ❗ burst (stones still up) for a beat, then drop into the close-up speech.
    useEffect(() => {
        if (stage !== 'fail') return
        const t = setTimeout(() => useSongGame.getState().failSpeech(), FAIL_EXCLAIM_TIME * 1000)
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

    const canExit =
        stage === 'prompt' || stage === 'setup' || stage === 'countdown' || stage === 'playback' || stage === 'input' || stage === 'roundClear'
    const status =
        stage === 'setup'
            ? 'Get ready…'
            : stage === 'countdown'
              ? 'Get ready…'
              : stage === 'playback'
                ? 'Listen'
                : stage === 'input'
                  ? `${input.length} / ${length}`
                  : ''

    return (
        <div className="song-game">
            <div className="song-round">
                Round {round + 1} / {roundCount}
                {status ? ` · ${status}` : ''}
            </div>

            {canExit && (
                <button className="song-exit" onClick={() => useSongGame.getState().reset()} aria-label="Exit">
                    Exit <span className="song-key"><span>ESC</span></span>
                </button>
            )}

            {stage === 'prompt' && (
                <SpeechBubble
                    text={getMusicCharacter(companion?.music)?.prompt ?? 'Would you like to listen to my song?'}
                    confirmLabel="Yes"
                    onConfirm={() => {
                        resumeAudio()
                        useSongGame.getState().confirmReady()
                    }}
                />
            )}

            {stage === 'failSpeech' && (
                <SpeechBubble text={failLine ?? 'Hmph! That was not my melody.'} confirmLabel="Continue" onConfirm={() => useSongGame.getState().confirmFail()} />
            )}

            {stage === 'setup' && stonesReady && (
                <div className="song-start">
                    <button className="song-yes song-start-button" onClick={() => useSongGame.getState().startPlayback()}>
                        Start
                    </button>
                </div>
            )}

            {stage === 'countdown' && count > 0 && (
                <div key={count} className="song-countdown">
                    <span>{count}</span>
                </div>
            )}

            {stage === 'roundClear' && <div className="song-banner song-good">Nice!</div>}
            {stage === 'success' && <div className="song-banner song-good">{companion?.label ?? 'Friend'} is happy!</div>}
        </div>
    )
}
