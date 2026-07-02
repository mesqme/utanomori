import React from 'react'
import './Links.css'
import { icons } from './icons'
import usePhases, { PHASES } from '../stores/usePhases.jsx'

export default function Links() {
    const phase = usePhases((state) => state.phase)
    // Reveal on the same cue as the sound HUD: from GO onward (the GO press leaves warmup for intro).
    // Hidden on the loading + GO/warmup screens and behind the restart curtain, so they don't sit
    // over the loader.
    const show = phase !== PHASES.loading && phase !== PHASES.warmup && phase !== PHASES.resettling
    if (!show) return null

    return (
        <div className="links">
            {/* GitHub link hidden on screen for now (kept in code — restore when wanted):
            <a href="https://github.com/mesqme/infinite-terrain" target="_blank" rel="noopener noreferrer" className="link-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d={icons.github} />
                </svg>
            </a>
            */}
            <a href="https://www.linkedin.com/in/mesqme/" target="_blank" rel="noopener noreferrer" className="link-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d={icons.linkedin} />
                </svg>
            </a>
            <a href="https://x.com/mesqme" target="_blank" rel="noopener noreferrer" className="link-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d={icons.twitter} />
                </svg>
            </a>
        </div>
    )
}
