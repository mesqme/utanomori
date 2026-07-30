import { create } from 'zustand'

// One-time tutorial frames. The whole feature is gated behind gameUiParameters.tutorialEnabled,
// which currently ships OFF — the callers check it (Tutorial.jsx, Companions.jsx), this store
// does not, so nothing here fires in the shipped build.
//   frame 0 = none, 1 = controls, 2 = white-arrow pointer, 3 = mini-game explainer.
// The intro pair (1 → 2) fires shortly after gameplay starts; the mini-game frame (3) fires the
// first time a spirit becomes visible. Each guard (seenIntro / seenSpirit) makes it show only once.
const useTutorial = create((set, get) => ({
    frame: 0,
    seenIntro: false,
    seenSpirit: false,

    showIntro: () => {
        if (!get().seenIntro && get().frame === 0) set({ frame: 1, seenIntro: true })
    },
    showSpirit: () => {
        if (!get().seenSpirit && get().frame === 0) set({ frame: 3, seenSpirit: true })
    },
    setFrame: (frame) => set({ frame }),
}))

export default useTutorial
