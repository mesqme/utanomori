import { create } from 'zustand'
import { setAudioMuted } from '../game/songAudio.js'

// On-screen sound on/off. Toggling drives the shared master gain (songAudio.setAudioMuted), so it
// mutes EVERYTHING at once — music tracks, mini-game one-shots and ambient layers.
const useAudio = create((set, get) => ({
    muted: false,
    toggleMuted: () => {
        const muted = !get().muted
        setAudioMuted(muted)
        set({ muted })
    },
}))

export default useAudio
