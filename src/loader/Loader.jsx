import { useProgress } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases'
import useStore from '../stores/useStore'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'
import { useLoaderFixedSizeStyle } from './useLoaderFixedSizeStyle.js'
import { loaderInteraction } from './loaderInteraction.js'
import { startMusicTracks } from '../game/musicTracks.js'
import { preloadGameSounds } from '../game/gameSounds.js'
import { preloadAmbientSounds } from '../game/ambientSounds.js'
import { resumeAudio } from '../game/songAudio.js'
import './loader.css'

const RING_COLOR = soundJourneyPalette.uiPrimary
const RING_TRACK_COLOR = soundJourneyPalette.uiRingTrack
const EXIT_HOLD_MS = 700 // covers the fade-out before the loader unmounts
const CURTAIN_IN_MS = 600 // restart: let the loading cover fade fully in before snapping to origin
const MIN_LOAD_TIME = 3 // seconds — the loader always fills smoothly for at least this long

export default function Loader() {
    const { active, progress } = useProgress()
    const phase = usePhases((s) => s.phase)
    const setPhase = usePhases((s) => s.setPhase)
    const debugMode = usePhases((s) => s.debugMode)
    const loaderDebugParameters = useStore((s) => s.loaderDebugParameters)
    const fixedSizeStyle = useLoaderFixedSizeStyle(loaderDebugParameters)

    const [displayed, setDisplayed] = useState(0)
    const [isExiting, setIsExiting] = useState(false)
    const [hovered, setHovered] = useState(false)

    const lastPctRef = useRef(0)
    const progressRef = useRef(0)
    const activeRef = useRef(true)
    progressRef.current = progress
    activeRef.current = active

    // Fill the loader SMOOTHLY: paced so it always plays for at least MIN_LOAD_TIME (even when the
    // assets are already cached), never runs ahead of the real progress, and eases between values
    // instead of snapping straight to each new number.
    useEffect(() => {
        if (phase !== PHASES.loading) return undefined
        let raf = 0
        let shown = 0
        const start = performance.now()
        let last = start
        const tick = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const elapsed = (now - start) / 1000
            const timePace = Math.min(100, (elapsed / MIN_LOAD_TIME) * 100)
            const realRaw = Math.min(100, Math.max(0, progressRef.current))
            const real = activeRef.current ? Math.max(1, realRaw) : realRaw
            const target = Math.min(timePace, real) // honest (≤ real) and never faster than the pace
            shown += (target - shown) * (1 - Math.exp(-7 * dt)) // ease, no instant jumps
            if (target >= 100 && shown > 99.5) shown = 100
            setDisplayed(shown)
            if (shown < 100) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [phase])

    // Calculate percent (monotonic, never decreases)
    const percent = useMemo(() => {
        const raw = Math.round(Math.max(0, Math.min(100, displayed)))
        if (raw < lastPctRef.current) return lastPctRef.current
        lastPctRef.current = raw
        return raw
    }, [displayed])

    // When loading completes: debug → straight to gameplay, otherwise show GO (warmup).
    useEffect(() => {
        if (phase === PHASES.loading && !active && percent >= 100) {
            setPhase(debugMode ? PHASES.start : PHASES.warmup)
        }
    }, [phase, active, percent, setPhase, debugMode])

    const handleClick = () => {
        if (phase !== PHASES.warmup) return
        // GO is the user gesture audio needs: kick off the three synched backing tracks (muted,
        // looping) and decode the mini-game one-shots so they're ready when a companion sings.
        resumeAudio()
        startMusicTracks()
        preloadGameSounds()
        preloadAmbientSounds()
        // The bar simply fades to transparent; the camera intro starts at the same time.
        setIsExiting(true)
        setPhase(PHASES.intro)
    }

    useEffect(() => {
        if (!isExiting) return undefined
        const timeout = window.setTimeout(() => setIsExiting(false), EXIT_HOLD_MS)
        return () => window.clearTimeout(timeout)
    }, [isExiting])

    // Restart curtain: once the loading cover has faded in, advance to warmup — the scene snaps
    // to its origin behind the cover, then the cover lifts and GO fades in.
    useEffect(() => {
        if (phase !== PHASES.resettling) return undefined
        const timeout = window.setTimeout(() => setPhase(PHASES.warmup), CURTAIN_IN_MS)
        return () => window.clearTimeout(timeout)
    }, [phase, setPhase])

    const showLoading = phase === PHASES.loading
    const showStart = phase === PHASES.warmup
    const showExit = isExiting && phase === PHASES.intro
    const showSettle = phase === PHASES.resettling // the restart "loading circle" cover

    // Tell the 3D world when the GO circle is hovered (only meaningful in warmup), so the
    // terrain reveal-circle grows to preview the scene. Reset whenever we leave warmup.
    useEffect(() => {
        loaderInteraction.hovered = showStart && hovered
        return () => {
            loaderInteraction.hovered = false
        }
    }, [showStart, hovered])

    if (!showLoading && !showStart && !showExit && !showSettle) return null

    // The unfilled track is fully transparent in warmup/exit (no semi-transparent ring behind
    // the GO — only the live 3D shows).
    const ringTrack = showStart || showExit ? 'transparent' : RING_TRACK_COLOR
    const ringStyle = {
        background: `conic-gradient(from -90deg, ${RING_COLOR} ${percent * 3.6}deg, ${ringTrack} ${percent * 3.6}deg)`,
    }
    const loaderStyle = {
        ...fixedSizeStyle,
        '--sj-loader-background': loaderDebugParameters.cssColorA,
        '--sj-loader-hero': loaderDebugParameters.cssColorB,
    }

    return (
        <div
            className={`loader-wrapper ${showStart ? 'loader-wrapper--warmup' : ''} ${showExit ? 'loader-wrapper--exit' : ''} ${
                showSettle ? 'loader-wrapper--settle' : ''
            }`}
            style={loaderStyle}
        >
            <div className="loader-container">
                <div className="loader-ring" style={ringStyle}>
                    <div className="loader-ring-inner" />
                </div>
                <div
                    className={`loader-center ${showStart ? 'loader-center--clickable' : ''}`}
                    onClick={handleClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {showLoading && !showExit && <div className="loader-percent">{percent}%</div>}
                    {showStart && !showExit && <div className="loader-go-button">GO</div>}
                </div>
            </div>
            {(showLoading || showStart) && !showExit && <div className="loader-headphones">🎧 Better with headphones</div>}
        </div>
    )
}
