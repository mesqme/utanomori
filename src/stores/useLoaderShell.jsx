import { create } from 'zustand'

import { DEFAULT_LOADER_DEBUG_PARAMETERS, DEFAULT_MOBILE_UI_PARAMETERS } from '../config/parameterDefaults.js'

// Mirror store for the Loader "shell". The Loader lives in the tiny ENTRY chunk (it must paint long
// before the heavy 3D bundle arrives), so it can't import drei's useProgress or the main useStore —
// both drag three.js into the entry. Instead the lazy app chunk mounts a ShellBridge (App.jsx) that
// mirrors the asset progress + the loader's tunable params into here. Until the bridge reports,
// `ready` is false (the static index.html pre-loader stays up) and the params are the defaults.
const useLoaderShell = create(() => ({
    ready: false, // flips true on the bridge's first report = the app chunk is downloaded + mounted
    active: true, // drei useProgress mirror (starts "active" so the bar's ≥1% floor applies)
    progress: 0,
    loaderDebugParameters: { ...DEFAULT_LOADER_DEBUG_PARAMETERS },
    mobileUiParameters: { ...DEFAULT_MOBILE_UI_PARAMETERS },
}))

// Singleton tripwire: this module must evaluate exactly ONCE (the Loader in the entry chunk and the
// bridges in the app chunk must share the instance). A second evaluation (e.g. mixed ?t= HMR URLs
// or duplicated chunk linkage) silently splits the progress pipe — the loading bar freezes at 0.
if (typeof window !== 'undefined') {
    window.__loaderShellInstances = (window.__loaderShellInstances ?? 0) + 1
    if (window.__loaderShellInstances > 1) console.warn(`useLoaderShell evaluated ${window.__loaderShellInstances}× — the loading bar pipe is split!`)
    window.__loaderShell = useLoaderShell
}

export default useLoaderShell
