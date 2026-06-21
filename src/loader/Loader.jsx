import { useProgress } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

import usePhases, { PHASES } from '../stores/usePhases'
import useStore from '../stores/useStore'
import { soundJourneyPalette } from '../config/soundJourneyPalette.js'
import { useLoaderFixedSizeStyle } from './useLoaderFixedSizeStyle.js'
import './loader.css'

const RING_COLOR = soundJourneyPalette.uiPrimary
const RING_TRACK_COLOR = soundJourneyPalette.uiRingTrack
const EXIT_HOLD_MS = 420

export default function Loader() {
    const { active, progress } = useProgress()
    const phase = usePhases((s) => s.phase)
    const setPhase = usePhases((s) => s.setPhase)
    const debugMode = usePhases((s) => s.debugMode)
    const loaderDebugParameters = useStore((s) => s.loaderDebugParameters)
    const fixedSizeStyle = useLoaderFixedSizeStyle(loaderDebugParameters)

    const [displayed, setDisplayed] = useState(0)
    const [isExiting, setIsExiting] = useState(false)

    const lastPctRef = useRef(0)
    const displayedRef = useRef({ value: 0 })

    // Calculate target progress
    const target = useMemo(() => {
        const clamped = Math.min(100, Math.max(0, progress))
        return active ? Math.max(1, clamped) : clamped
    }, [active, progress])

    // Animate displayed value toward target using GSAP
    useEffect(() => {
        displayedRef.current.value = displayed

        const animation = gsap.to(displayedRef.current, {
            value: target,
            duration: 0.3,
            ease: 'power1.out',
            onUpdate: () => {
                setDisplayed(displayedRef.current.value)
            },
        })

        return () => animation.kill()
    }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

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
        if (phase === PHASES.warmup) {
            setIsExiting(true)
            setPhase(PHASES.intro)
        }
    }

    useEffect(() => {
        if (!isExiting) return undefined
        const timeout = window.setTimeout(() => setIsExiting(false), EXIT_HOLD_MS)
        return () => window.clearTimeout(timeout)
    }, [isExiting])

    const showLoading = phase === PHASES.loading
    const showStart = phase === PHASES.warmup
    const showExit = isExiting && phase === PHASES.intro

    if (!showLoading && !showStart && !showExit) return null

    const ringStyle = {
        background: `conic-gradient(from -90deg, ${RING_COLOR} ${percent * 3.6}deg, ${RING_TRACK_COLOR} ${percent * 3.6}deg)`,
    }
    const loaderStyle = {
        ...fixedSizeStyle,
        '--sj-loader-background': loaderDebugParameters.cssColorA,
        '--sj-loader-hero': loaderDebugParameters.cssColorB,
    }

    return (
        <div className={`loader-wrapper ${showExit ? 'loader-wrapper--exit' : ''}`} style={loaderStyle}>
            <div className="loader-container">
                <div className="loader-ring" style={ringStyle}>
                    <div className="loader-ring-inner" />
                </div>
                <div
                    className={`loader-center ${showStart ? 'loader-center--clickable' : ''}`}
                    onClick={handleClick}
                >
                    {showLoading && !showExit && <div className="loader-percent">{percent}%</div>}
                    {showStart && !showExit && <div className="loader-go-button">GO</div>}
                </div>
            </div>
        </div>
    )
}
