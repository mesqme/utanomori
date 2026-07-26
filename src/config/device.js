import { useEffect, useState } from 'react'

// Device / orientation detection with NO store (and therefore no three.js) dependencies — safe to
// import from the tiny ENTRY chunk (the Loader), which must stay light so the loading screen
// appears long before the heavy 3D bundle arrives. config/mobile.js re-exports these for the rest
// of the app, so everything else keeps importing from there.

// Touch / coarse-pointer device — the one probe everything else here is built on.
export function isTouchDevice() {
    if (typeof window === 'undefined') return false
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

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
