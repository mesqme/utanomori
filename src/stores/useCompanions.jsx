import { create } from 'zustand'
import { companionPool } from '../config/companionPool.js'
import { getCompanionSong } from '../config/notes.js'
import useSongGame from './useSongGame.jsx'

export const MAX_PARTY = 5

/**
 * Find-and-collect game state.
 *  - `target` is the current hidden character to track down (or null).
 *  - `found` is the party, in the order collected (drives the follow line).
 *  - `targetInRange` toggles the interaction prompt.
 * Collecting now goes through the song mini-game (see useSongGame / SongGame); the
 * scene calls `collectTarget()` once it is won.
 */
const useCompanions = create((set, get) => ({
    found: [],
    target: null,
    targetInRange: false,

    // Spawn the next pool member at a world position (chosen off-screen by the manager).
    // Each target carries its own song (deterministic per character, override-able).
    spawnTarget: (x, z) => {
        const { found } = get()
        if (found.length >= MAX_PARTY) {
            set({ target: null, targetInRange: false })
            return
        }
        const definition = companionPool[found.length % companionPool.length]
        const generated = getCompanionSong(definition.id)
        const song = definition.song ?? generated.notes
        const beats = definition.beats ?? generated.beats
        set({ target: { ...definition, key: `${definition.id}-${found.length}`, x, z, song, beats }, targetInRange: false })
    },

    // Relocate the active target (used when the player abandons it, or after a failed song).
    relocateTarget: (x, z) => {
        const { target } = get()
        if (!target) return
        set({ target: { ...target, x, z }, targetInRange: false })
    },

    setTargetInRange: (value) => {
        if (get().targetInRange === value) return
        set({ targetInRange: value })
    },

    // Collect the target into the party — called by the song game once it is won.
    collectTarget: () => {
        const { target, found } = get()
        if (!target) return
        set({ found: [...found, target], target: null, targetInRange: false })
    },

    reset: () => {
        useSongGame.getState().reset()
        set({ found: [], target: null, targetInRange: false })
    },
}))

export default useCompanions
