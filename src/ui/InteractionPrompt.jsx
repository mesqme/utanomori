import { useState, useEffect, useRef } from 'react'
import './InteractionPrompt.css'
import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useCompanions, { MAX_PARTY } from '../stores/useCompanions.jsx'
import useSongGame from '../stores/useSongGame.jsx'
import useAudio from '../stores/useAudio.jsx'
import useStore from '../stores/useStore.jsx'
import { useIsMobile } from '../config/mobile.js'
import { startThemeTransition } from '../game/themeTransition.js'
import { resumeAudio } from '../game/songAudio.js'

export default function InteractionPrompt() {
    const phase = usePhases((state) => state.phase)
    const target = useCompanions((state) => state.target)
    const targetInRange = useCompanions((state) => state.targetInRange)
    const found = useCompanions((state) => state.found)
    const songActive = useSongGame((state) => state.active)
    const muted = useAudio((state) => state.muted)
    const volume = useAudio((state) => state.volume)
    const toggleMuted = useAudio((state) => state.toggleMuted)
    const setVolume = useAudio((state) => state.setVolume)
    // Day/night switch: swaps the whole colour THEME (Night Forest ↔ Daylight, see colorPresets).
    // Moon = night (the default), sun = day. Any other theme picked in Leva counts as "night", so
    // the first press always lands on Daylight and the next brings the default night back. The
    // switch animates per themeTransitionParameters (Fade / Portal / Wipe).
    const isDay = useStore((state) => state.colorPresetParameters.theme === 'Daylight')
    const toggleDayNight = () =>
        startThemeTransition(isDay ? 'Night Forest' : 'Daylight', useStore.getState().themeTransitionParameters)

    const mobile = useIsMobile()
    const inGame = phase === PHASES.start
    // The sound control appears once there's sound to control — i.e. from GO onward (the backing tracks
    // start on the GO gesture, which leaves warmup for intro). So it shows in intro/start/finale/credits/
    // restarting, but not on the loading or GO/warmup screens, nor behind the resettling curtain. On
    // mobile the sound bar is dropped; the party counter + day/night toggle stay (below).
    const showSound = !mobile && phase !== PHASES.loading && phase !== PHASES.warmup && phase !== PHASES.resettling
    const showPrompt = inGame && target && targetInRange && !songActive
    const complete = found.length >= MAX_PARTY
    const silent = muted || volume <= 0

    // The slider position: muting slides it to 0, unmuting springs it back to the preserved level.
    // Native range thumbs can't be CSS-transitioned, so tween the value in JS on mute/unmute; dragging
    // updates it immediately (see onSlider). `shownVolume` is what the thumb + fill actually render.
    const [shownVolume, setShownVolume] = useState(muted ? 0 : volume)
    const shownRef = useRef(shownVolume)
    shownRef.current = shownVolume
    const rafRef = useRef(0)

    useEffect(() => {
        const targetVolume = muted ? 0 : useAudio.getState().volume
        const from = shownRef.current
        cancelAnimationFrame(rafRef.current)
        if (Math.abs(from - targetVolume) < 0.001) {
            setShownVolume(targetVolume)
            return
        }
        const start = performance.now()
        const tick = (now) => {
            const t = Math.min(1, (now - start) / 220)
            const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
            setShownVolume(from + (targetVolume - from) * eased)
            if (t < 1) rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafRef.current)
    }, [muted])

    const onSlider = (event) => {
        cancelAnimationFrame(rafRef.current) // dragging beats any in-flight mute tween
        const value = parseFloat(event.target.value)
        setShownVolume(value)
        setVolume(value)
    }

    const startSong = () => {
        const { target: current, targetInRange: inRange } = useCompanions.getState()
        if (!current || !inRange || useSongGame.getState().active) return
        resumeAudio()
        useSongGame.getState().begin(current)
    }

    // Sun/moon theme toggle — shared by the desktop HUD (under the volume slider) and the mobile
    // HUD (under the melodies counter).
    const dayNightButton = (
        <button
            className="sound-toggle brightness-toggle"
            onClick={(event) => {
                toggleDayNight()
                event.currentTarget.blur()
            }}
            aria-label={isDay ? 'Switch to night' : 'Switch to day'}
            title={isDay ? 'Day (click for night)' : 'Night (click for day)'}
        >
            <svg className="sound-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                {isDay ? (
                    <>
                        <circle cx="12" cy="12" r="4.2" fill="currentColor" />
                        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <line x1="12" y1="2.5" x2="12" y2="5" />
                            <line x1="12" y1="19" x2="12" y2="21.5" />
                            <line x1="2.5" y1="12" x2="5" y2="12" />
                            <line x1="19" y1="12" x2="21.5" y2="12" />
                            <line x1="5.3" y1="5.3" x2="7" y2="7" />
                            <line x1="17" y1="17" x2="18.7" y2="18.7" />
                            <line x1="5.3" y1="18.7" x2="7" y2="17" />
                            <line x1="17" y1="7" x2="18.7" y2="5.3" />
                        </g>
                    </>
                ) : (
                    <path fill="currentColor" d="M20 13.2A8 8 0 1 1 10.8 4a6.3 6.3 0 0 0 9.2 9.2z" />
                )}
            </svg>
        </button>
    )

    return (
        <>
            {showSound && (
                <div className="top-left-hud">
                    <div className="hud-top-row">
                        <button
                            className="sound-toggle"
                            onClick={(event) => {
                                toggleMuted()
                                event.currentTarget.blur() // drop focus so running (keyboard) doesn't light up the focus ring / re-trigger it
                            }}
                            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                            title={muted ? 'Sound off' : 'Sound on'}
                        >
                            <svg className="sound-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z" />
                                {silent ? (
                                    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16 9.5l5 5M21 9.5l-5 5" />
                                ) : (
                                    <>
                                        <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
                                        <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M18 7a7 7 0 0 1 0 10" />
                                    </>
                                )}
                            </svg>
                        </button>
                        {inGame && (
                            <div className="party-counter">{complete ? 'ALL MELODIES FOUND' : `MELODIES ${found.length} / ${MAX_PARTY}`}</div>
                        )}
                    </div>
                    <div className="volume-slider-wrap">
                        <input
                            className="volume-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={shownVolume}
                            onChange={onSlider}
                            onPointerUp={(event) => event.currentTarget.blur()} // release focus so arrow keys move the hero, not the slider
                            style={{ '--vol': shownVolume }}
                            aria-label="Volume"
                            title={`Volume ${Math.round(shownVolume * 100)}%`}
                        />
                    </div>
                    {dayNightButton}
                </div>
            )}

            {/* Mobile drops the sound bar; the party counter stays with the day/night toggle under it. */}
            {mobile && inGame && (
                <div className="top-left-hud">
                    <div className="party-counter">{complete ? 'ALL MELODIES FOUND' : `MELODIES ${found.length} / ${MAX_PARTY}`}</div>
                    {dayNightButton}
                </div>
            )}

            {showPrompt && (
                <button className="interaction-prompt" onClick={startSong}>
                    Talk to {target.label}
                    {!mobile && <span className="interaction-key"><span>E</span></span>}
                </button>
            )}
        </>
    )
}
