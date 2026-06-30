import useStore from '../stores/useStore.jsx'
import '../game/dialogue.css'
import './InteractionPrompt.css'
import '../game/songGame.css'
import '../game/credits.css'
import './UIPreview.css'

// DEBUG ONLY — splays every in-game UI overlay on screen at once, using the REAL CSS classes so the
// "Game UI" Leva tokens (corners / border / scale / glyph nudges) restyle them live. Each sample's
// fixed positioning + entry animation is neutralised so they tile in one tidy column instead of
// piling on their real screen spots. Gated by gameUiParameters.previewUI. Remove this component (plus
// the previewUI control + param) once the UI is dialed in.
export default function UIPreview() {
    const previewUI = useStore((s) => s.gameUiParameters.previewUI)
    const bubbleWidth = useStore((s) => s.gameUiParameters.bubbleWidth)
    if (!previewUI) return null

    const flat = { position: 'static', inset: 'auto', transform: 'none', animation: 'none', margin: 0 }

    return (
        <div className="ui-preview">
            <div className="ui-preview-label">UI PREVIEW · adjust “Game UI” in Leva · toggle off when done</div>

            <div className="party-counter" style={flat}>
                MELODIES 1 / 3
            </div>

            <div className="song-round" style={flat}>
                Round 1 / 3 · Listen
            </div>

            <button className="interaction-prompt" style={flat}>
                Talk to Kanade{' '}
                <span className="interaction-key">
                    <span>E</span>
                </span>
            </button>

            <button className="song-exit" style={flat}>
                Exit{' '}
                <span className="song-key">
                    <span>ESC</span>
                </span>
            </button>

            <div className="song-countdown" style={flat}>
                <span>3</span>
            </div>

            <div className="song-banner song-good" style={flat}>
                Nice!
            </div>
            <div className="song-banner song-bad" style={flat}>
                Hmph! Not my melody.
            </div>

            <div className="dialogue-bubble" style={{ ...flat, '--dlg-width': `${bubbleWidth}px`, maxWidth: `${bubbleWidth}px` }}>
                <p className="dialogue-text">Would you like to listen to my song?</p>
            </div>
            <button className="dialogue-start" style={flat}>
                Start
            </button>

            <button className="song-yes song-start-button" style={flat}>
                Start
            </button>

            {/* End-screen choice row — kept relative (not its usual inset:0) so the centre-offset of the
                Continue/Restart buttons is visible and tunable here. */}
            <div className="credits-choice" style={{ position: 'relative', inset: 'auto', width: '100%', animation: 'none' }}>
                <button className="credits-button">Continue</button>
                <div className="credits-choice-title">UTANOMORI</div>
                <button className="credits-button">Restart</button>
            </div>
        </div>
    )
}
