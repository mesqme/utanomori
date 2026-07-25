/**
 * Guards for three's DefaultLoadingManager handler slots.
 *
 * onStart/onProgress/onLoad/onError are plain writable properties on a SINGLETON, and every
 * library that watches asset progress simply ASSIGNS them — @react-three/drei's useProgress does,
 * and so does the copy of it bundled inside r3f-perf. Whichever module evaluates last silently
 * wins the slot, so who actually receives progress depends on import order. That is exactly how
 * this project's loading bar once froze at 0% after a chunk split reshuffled the graph.
 *
 * Two defences, both covered by tests/loadingManagerChain.test.js:
 * - chainManagerHandler WRAPS the handler that is already installed instead of replacing it, so
 *   nobody's listener is orphaned and the newest wrapper ends up outermost (App.jsx relies on
 *   running last, after every import has evaluated, so its wrapper feeds the loader shell).
 * - preserveManagerHandlers snapshots all four slots and hands back a restore function, for code
 *   that must load a module KNOWN to assign them (see the lazy perf monitor in Experience.jsx).
 */
const HANDLER_KEYS = ['onStart', 'onProgress', 'onLoad', 'onError']

// Wrap `manager[key]` so `fn` runs right after whatever handler was already there.
export function chainManagerHandler(manager, key, fn) {
    const previous = manager[key]
    manager[key] = (...args) => {
        previous?.(...args)
        fn(...args)
    }
}

// Snapshot every handler slot; the returned function puts them back exactly as they were
// (including leaving a slot `undefined`, which three checks for before calling).
export function preserveManagerHandlers(manager) {
    const saved = {}
    for (const key of HANDLER_KEYS) saved[key] = manager[key]
    return () => Object.assign(manager, saved)
}
