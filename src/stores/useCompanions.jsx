import { create } from 'zustand'
import { companionPool } from '../config/companionPool.js'

export const MAX_PARTY = 5

/**
 * Find-and-collect game state.
 *  - `target` is the current hidden character to track down (or null).
 *  - `found` is the party, in the order collected (drives the follow line).
 *  - `targetInRange` toggles the interaction prompt.
 */
const useCompanions = create((set, get) => ({
    found: [],
    target: null,
    targetInRange: false,

    // Spawn the next pool member at a world position (chosen off-screen by the manager).
    spawnTarget: (x, z) => {
        const { found } = get()
        if (found.length >= MAX_PARTY) {
            set({ target: null, targetInRange: false })
            return
        }
        const definition = companionPool[found.length % companionPool.length]
        set({ target: { ...definition, key: `${definition.id}-${found.length}`, x, z }, targetInRange: false })
    },

    // Relocate the active target (used when the player abandons it by wandering off).
    relocateTarget: (x, z) => {
        const { target } = get()
        if (!target) return
        set({ target: { ...target, x, z }, targetInRange: false })
    },

    setTargetInRange: (value) => {
        if (get().targetInRange === value) return
        set({ targetInRange: value })
    },

    // Collect the target into the party — only valid while it is in range.
    interact: () => {
        const { target, targetInRange, found } = get()
        if (!target || !targetInRange) return false
        set({ found: [...found, target], target: null, targetInRange: false })
        return true
    },

    reset: () => set({ found: [], target: null, targetInRange: false }),
}))

export default useCompanions
