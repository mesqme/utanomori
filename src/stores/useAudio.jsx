import { create } from 'zustand'
import { setAudioMuted, setAudioVolume } from '../game/songAudio.js'

// On-screen sound controls. Both drive the shared master gain (songAudio), so they affect EVERYTHING
// at once — music tracks, mini-game one-shots and ambient layers. `muted` is the quick on/off button;
// `volume` (0..1) is the slider. Mute overrides the level to silence.
const useAudio = create((set, get) => ({
    muted: false,
    volume: 1.0,
    toggleMuted: () => {
        const muted = !get().muted
        setAudioMuted(muted)
        set({ muted })
    },
    setVolume: (value) => {
        const volume = Math.max(0, Math.min(1, value))
        setAudioVolume(volume)
        // Nudging the slider up implies "I want to hear it" → lift a manual mute.
        if (volume > 0 && get().muted) {
            setAudioMuted(false)
            set({ muted: false, volume })
        } else {
            set({ volume })
        }
    },
}))

export default useAudio
