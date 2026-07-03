import { useEffect, useState } from 'react'

import useStore from '../stores/useStore.jsx'
import { isTouchDevice } from '../ui/joystickInput.js'

// Central "is this the mobile experience" resolution — a touch / coarse-pointer device. Everything
// mobile (joystick, mobile camera, the trimmed HUD, the mini-game layout) keys off this. Debug it in
// Chrome device mode, which reports `(pointer: coarse)` so this flips to true (no in-app toggle).
export function isMobile() {
    return isTouchDevice()
}

// React hook variant — re-evaluates when the pointer media query changes (e.g. toggling Chrome
// device mode), so the mobile UI switches live without a reload.
export function useIsMobile() {
    const [mobile, setMobile] = useState(isTouchDevice)
    useEffect(() => {
        if (!window.matchMedia) return undefined
        const mq = window.matchMedia('(pointer: coarse)')
        const update = () => setMobile(isTouchDevice())
        mq.addEventListener?.('change', update)
        return () => mq.removeEventListener?.('change', update)
    }, [])
    return mobile
}

// Portrait = the "lazy" one-handed phone hold: joystick bottom-centre, mini-game stones in a
// 2-column grid (landscape keeps the left stick + one horizontal stone line).
export function isPortrait() {
    if (typeof window === 'undefined') return false
    return window.innerHeight >= window.innerWidth
}

export function useIsPortrait() {
    const [portrait, setPortrait] = useState(isPortrait)
    useEffect(() => {
        const update = () => setPortrait(isPortrait())
        window.addEventListener('resize', update) // covers rotation + Chrome device-mode swaps
        return () => window.removeEventListener('resize', update)
    }, [])
    return portrait
}

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
