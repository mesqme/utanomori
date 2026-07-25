// ENTRY-CHUNK component: must not (transitively) import three.js — no drei, no useStore, no audio
// modules. Progress + tunable params arrive via the useLoaderShell mirror (fed by App.jsx's
// ShellBridge once the lazy chunk loads); audio triggers go through the loaderBridge registry.
import { useEffect, useMemo, useRef, useState } from 'react'

import usePhases, { PHASES } from '../stores/usePhases.jsx'
import useLoaderShell from '../stores/useLoaderShell.jsx'
import { palette } from '../config/palette.js'
import { useIsMobile } from '../config/device.js'
import { useLoaderFixedSizeStyle } from './useLoaderFixedSizeStyle.js'
import { loaderInteraction } from './loaderInteraction.js'
import { loaderAudio } from '../game/loaderBridge.js'
import './loader.css'

const RING_COLOR = palette.uiPrimary
const EXIT_HOLD_MS = 700 // covers the fade-out before the loader unmounts
const CURTAIN_IN_MS = 600 // restart: let the loading cover fade fully in before snapping to origin
const MIN_LOAD_TIME = 3 // seconds — the loader always fills smoothly for at least this long

export default function Loader() {
    const active = useLoaderShell((s) => s.active)
    const progress = useLoaderShell((s) => s.progress)
    const shellReady = useLoaderShell((s) => s.ready)
    const phase = usePhases((s) => s.phase)
    const setPhase = usePhases((s) => s.setPhase)
    const debugMode = usePhases((s) => s.debugMode)
    const sceneReady = usePhases((s) => s.sceneReady)
    const loaderDebugParameters = useLoaderShell((s) => s.loaderDebugParameters)
    const mobileUi = useLoaderShell((s) => s.mobileUiParameters)
    const mobile = useIsMobile()

    // The static index.html pre-loader (pure HTML/CSS, painted before ANY JS) shows this same
    // screen with an indeterminate spinner. Once the app chunk is up and real progress flows
    // (shellReady), fade it out — this React loader is already rendered underneath it.
    useEffect(() => {
        if (!shellReady) return undefined
        const staticLoader = document.getElementById('static-loader')
        if (!staticLoader) return undefined
        staticLoader.style.opacity = '0'
        const timeout = window.setTimeout(() => staticLoader.remove(), 500)
        return () => window.clearTimeout(timeout)
    }, [shellReady])
    // Mobile: a smaller loading ring (the hat-shot camera is zoomed out to match — see mobileUi).
    const fixedSizeStyle = useLoaderFixedSizeStyle(
        mobile ? { ...loaderDebugParameters, circleRadius: mobileUi.loaderRadius, ringWidth: mobileUi.loaderRingWidth } : loaderDebugParameters
    )

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

    // When loading completes: debug → straight to gameplay, otherwise show GO (warmup). Also wait for
    // sceneReady — the scene has actually drawn a frame — so lifting the curtain never flashes a
    // not-yet-rendered hero (the GLBs mount only when loading finishes, so this is a real one-off gap).
    useEffect(() => {
        if (phase === PHASES.loading && !active && percent >= 100 && sceneReady) {
            setPhase(debugMode ? PHASES.start : PHASES.warmup)
        }
    }, [phase, active, percent, sceneReady, setPhase, debugMode])

    // GO is showing (the critical assets are done) → begin the DEFERRED audio in the background: the
    // music layers, the mini-game one-shots and the remaining ambient. These are untracked (off the
    // loading bar), so they don't hold up GO, but they get the GO-dwell + intro + walk time to be ready
    // before they're needed. (No-ops on a restart's second warmup — each has its own load guard.)
    useEffect(() => {
        if (phase !== PHASES.warmup) return
        loaderAudio.preloadMusicTracks?.()
        loaderAudio.preloadGameSounds?.()
        loaderAudio.preloadAmbientSounds?.()
    }, [phase])

    const handleClick = () => {
        if (phase !== PHASES.warmup) return
        // GO is the user gesture audio needs: resume the context and start the synched backing tracks
        // (their buffers are already decoding from the warmup preload above; startMusicTracks falls back
        // to decoding on the spot if GO is clicked before they finish). Called through the bridge —
        // the app chunk is guaranteed loaded by warmup (the loading bar can't finish without it).
        loaderAudio.resumeAudio?.()
        loaderAudio.startMusicTracks?.()
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

    // No unfilled track behind the ring in any phase — only the filled progress arc shows, with
    // transparency everywhere else (no faint full-circle band behind the bar).
    const ringStyle = {
        background: `conic-gradient(from -90deg, ${RING_COLOR} ${percent * 3.6}deg, transparent ${percent * 3.6}deg)`,
    }
    // The loader colours come from the palette (--sj-loader-background / --sj-loader-hero via
    // applyPaletteCssVariables) — single source of truth. (Previously these were overridden
    // inline from loaderDebugParameters.cssColorA/B, which silently masked the palette colour.)
    const loaderStyle = { ...fixedSizeStyle }

    // Rounded caps for the progress arc: a dot on the arc's SOLID band (⌀ = ring-edge, i.e. the band
    // minus its ~1px feathered inner edge, so the cap sits flush and doesn't read thicker) at the arc's
    // start (-90°, matching the conic `from`) and its moving end (-90° + percent·3.6°).
    const capStyle = (angleDeg) => ({
        transform: `rotate(${angleDeg}deg) translateY(calc((var(--sj-loader-ring-edge, 11px) - var(--sj-loader-size, 200px)) / 2))`,
    })

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
                {showLoading && !showExit && (
                    <>
                        <div className="loader-ring-cap" style={capStyle(-90)} />
                        <div className="loader-ring-cap" style={capStyle(-90 + percent * 3.6)} />
                    </>
                )}
                <div
                    className={`loader-center ${showStart ? 'loader-center--clickable' : ''}`}
                    onClick={handleClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                >
                    {showLoading && !showExit && <div className="loader-percent">{percent}</div>}
                    {/* GO cue: the game's target arrow as a DOM element (matches the ring colour
                        exactly — no post-grade tint). The path is the REAL arrow.glb silhouette,
                        traced from its top view (the shape the hat shot would show): a wide chevron
                        with a notched base, bevel-rounded corners. Points UP at rest, CSS-rotates
                        to point DOWN on hover. Stays mounted through the exit so it fades WITH the disc. */}
                    {(showStart || showExit) && (
                        <svg className="loader-go-arrow" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                d="M11.91 3.58 L12.58 3.65 L13.05 3.86 L14.08 4.65 L16.46 7.68 L19.00 11.53 L22.20 16.85 L22.43 17.79 L22.31 18.44 L21.87 19.07 L21.15 19.68 L19.98 20.26 L19.07 20.40 L18.58 20.19 L13.75 14.99 L12.75 14.24 L12.19 14.08 L11.37 14.17 L10.23 14.99 L6.10 19.54 L5.40 20.19 L4.98 20.38 L4.35 20.38 L2.95 19.75 L2.11 19.07 L1.66 18.44 L1.57 17.60 L1.78 16.85 L2.39 15.69 L7.52 7.68 L9.90 4.65 L10.74 3.95 L11.39 3.65 L11.88 3.60 Z"
                                fill="currentColor"
                                stroke="currentColor"
                                strokeWidth="0.6"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>
            </div>
            {(showLoading || showStart) && !showExit && <div className="loader-headphones">🎧 Better with headphones</div>}
        </div>
    )
}
