import { Html } from '@react-three/drei'

import useSongGame from '../stores/useSongGame.jsx'
import { NOTES } from '../config/notes.js'
import '../game/songGame.css'

/**
 * Placeholder notes above a companion's head — drei <Html> billboards so they match
 * the wheel styling for now. Swap for a 3D sprite/model later.
 *  - Ambient ♪ glyphs while you are in range and the game hasn't started.
 *  - During playback, the coloured + numbered note currently being "sung".
 */
export default function CompanionNotes({ headY = 1.05, inRange = false }) {
    const active = useSongGame((s) => s.active)
    const stage = useSongGame((s) => s.stage)
    const activeNote = useSongGame((s) => s.activeNote)

    let content = null
    if (active && stage === 'playback' && activeNote != null) {
        const note = NOTES[activeNote]
        content = (
            <div key={`note-${activeNote}`} className="song-note-bubble" style={{ background: note.color }}>
                {activeNote + 1}
            </div>
        )
    } else if (!active && inRange) {
        content = (
            <div className="song-ambient-notes">
                <span>♪</span>
                <span>♫</span>
                <span>♪</span>
            </div>
        )
    }

    if (!content) return null

    return (
        <Html position={[0, headY, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            {content}
        </Html>
    )
}
