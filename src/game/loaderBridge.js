// Bridge so the Loader (tiny entry chunk) can trigger the audio engine WITHOUT importing it — the
// audio modules pull in three.js (the tracked loading manager), which must stay in the lazy app
// chunk. App.jsx registers the real implementations when the chunk loads; the Loader calls them
// through here with optional chaining. By the time GO is clickable (warmup needs the loading
// manager to have finished) the chunk is guaranteed loaded, so the functions always exist then.
export const loaderAudio = {}

export function registerLoaderAudio(implementations) {
    Object.assign(loaderAudio, implementations)
}
