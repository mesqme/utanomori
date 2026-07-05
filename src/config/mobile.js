import useStore from '../stores/useStore.jsx'

// Device / orientation detection lives in config/device.js (store-free, so the Loader's tiny entry
// chunk can use it without dragging three.js in) — re-exported here so app code keeps one import.
export { isMobile, useIsMobile, isPortrait, useIsPortrait } from './device.js'
import { isMobile } from './device.js'

// The camera distances to actually use this frame — the mobile set when the mobile experience is
// active, otherwise the desktop store params (cameraParameters + musicStoneParameters). One place
// so MainCharacter / GameDirector / MusicStones don't each branch on isMobile.
// Initial top-down "hat" shot camera height — zoomed further out on mobile so the smaller loading
// ring still covers the hat.
export function resolvedLoaderCameraHeight() {
    const state = useStore.getState()
    return isMobile() ? state.mobileUiParameters.loaderCameraHeight : state.loaderDebugParameters.cameraHeight
}

// Camera look-at (where the hat sits) for the top-down loader shot — mobile has its own so the
// desktop loader↔hat alignment is never disturbed.
export function resolvedLoaderTarget() {
    const state = useStore.getState()
    if (isMobile()) return { x: state.mobileUiParameters.loaderTargetX, z: state.mobileUiParameters.loaderTargetZ }
    return { x: state.loaderDebugParameters.targetX, z: state.loaderDebugParameters.targetZ }
}

export function resolvedCameraDistances() {
    const state = useStore.getState()
    if (isMobile()) {
        const m = state.mobileCameraParameters
        return {
            followDistance: m.followDistance,
            followHeight: m.followHeight,
            frontDistance: m.frontDistance,
            frontHeight: m.frontHeight,
            minigameDistance: m.cameraDistance,
            minigameHeight: m.cameraHeight,
            talkDistance: m.dialogueCameraDistance,
            talkHeight: m.dialogueCameraHeight,
        }
    }
    const c = state.cameraParameters
    const s = state.musicStoneParameters
    return {
        followDistance: c.followDistance,
        followHeight: c.followHeight,
        frontDistance: c.frontDistance,
        frontHeight: c.frontHeight,
        minigameDistance: s.cameraDistance,
        minigameHeight: s.cameraHeight,
        talkDistance: s.dialogueCameraDistance,
        talkHeight: s.dialogueCameraHeight,
    }
}
