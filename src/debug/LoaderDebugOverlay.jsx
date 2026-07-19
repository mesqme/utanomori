import useStore from '../stores/useStore.jsx'
import { useIsMobile } from '../config/mobile.js'
import { useLoaderFixedSizeStyle } from '../loader/useLoaderFixedSizeStyle.js'
import './LoaderDebugOverlay.css'

// Nudge the camera look-at (where the hat sits). Mobile has its own target so the desktop alignment
// isn't disturbed.
function nudgeTarget(mobile, dx, dz) {
    const group = mobile ? 'mobileUiParameters' : 'loaderDebugParameters'
    const xKey = mobile ? 'loaderTargetX' : 'targetX'
    const zKey = mobile ? 'loaderTargetZ' : 'targetZ'
    useStore.setState((state) => ({
        [group]: {
            ...state[group],
            [xKey]: +(state[group][xKey] + dx).toFixed(3),
            [zKey]: +(state[group][zKey] + dz).toFixed(3),
        },
    }))
}

// Bump one numeric store param (used for the mobile ring/camera rows, which live in mobileUiParameters,
// or the desktop equivalents in loaderDebugParameters).
function bump(group, key, delta, precision = 2) {
    useStore.setState((state) => ({
        [group]: { ...state[group], [key]: +(state[group][key] + delta).toFixed(precision) },
    }))
}

// On-screen loader alignment tool — align the CSS loading ring with the 3D top-down hat shot. Enabled
// via loaderDebugParameters.enabled (Leva). Adapts to whichever loader is live: mobile (smaller ring,
// mobileUi params) or desktop (loaderDebug params). Touch-friendly so it works on a real phone where
// the Leva panel is fiddly.
export default function LoaderDebugOverlay() {
    const loaderParams = useStore((state) => state.loaderDebugParameters)
    const mobileUi = useStore((state) => state.mobileUiParameters)
    const mobile = useIsMobile()

    // The group + keys that hold the live loader RING size + hat-shot camera height.
    const group = mobile ? 'mobileUiParameters' : 'loaderDebugParameters'
    const radiusKey = mobile ? 'loaderRadius' : 'circleRadius'
    const ringKey = mobile ? 'loaderRingWidth' : 'ringWidth'
    const camKey = mobile ? 'loaderCameraHeight' : 'cameraHeight'
    const radius = mobile ? mobileUi.loaderRadius : loaderParams.circleRadius
    const ringWidth = mobile ? mobileUi.loaderRingWidth : loaderParams.ringWidth
    const cameraHeight = mobile ? mobileUi.loaderCameraHeight : loaderParams.cameraHeight
    const targetX = mobile ? mobileUi.loaderTargetX : loaderParams.targetX
    const targetZ = mobile ? mobileUi.loaderTargetZ : loaderParams.targetZ

    // Hook must run every render — call it before the early return.
    const fixedSizeStyle = useLoaderFixedSizeStyle(mobile ? { ...loaderParams, circleRadius: radius, ringWidth } : loaderParams)

    if (!loaderParams.enabled) return null

    const step = loaderParams.nudgeStep

    return (
        <div className="loader-debug-overlay" style={fixedSizeStyle}>
            <div className="loader-debug-ring" />

            <div className="loader-debug-panel">
                <div className="loader-debug-title">{mobile ? 'Loader · mobile' : 'Loader Match'}</div>
                <div className="loader-debug-readout">
                    x {targetX.toFixed(3)}
                    <br />z {targetZ.toFixed(3)}
                    <br />cam {cameraHeight.toFixed(1)} · r {radius.toFixed(1)} / w {ringWidth.toFixed(1)}
                </div>

                <div className="loader-debug-pad">
                    <button type="button" className="loader-debug-button loader-debug-button--up" onClick={() => nudgeTarget(mobile, 0, -step)} aria-label="Nudge target up">
                        ^
                    </button>
                    <button type="button" className="loader-debug-button loader-debug-button--left" onClick={() => nudgeTarget(mobile, -step, 0)} aria-label="Nudge target left">
                        &lt;
                    </button>
                    <button type="button" className="loader-debug-button loader-debug-button--right" onClick={() => nudgeTarget(mobile, step, 0)} aria-label="Nudge target right">
                        &gt;
                    </button>
                    <button type="button" className="loader-debug-button loader-debug-button--down" onClick={() => nudgeTarget(mobile, 0, step)} aria-label="Nudge target down">
                        v
                    </button>
                </div>

                <div className="loader-debug-rows">
                    <div className="loader-debug-row">
                        <span>cam</span>
                        <button type="button" className="loader-debug-button" onClick={() => bump(group, camKey, -0.5)}>−</button>
                        <button type="button" className="loader-debug-button" onClick={() => bump(group, camKey, 0.5)}>+</button>
                    </div>
                    <div className="loader-debug-row">
                        <span>radius</span>
                        <button type="button" className="loader-debug-button" onClick={() => bump(group, radiusKey, -1)}>−</button>
                        <button type="button" className="loader-debug-button" onClick={() => bump(group, radiusKey, 1)}>+</button>
                    </div>
                    <div className="loader-debug-row">
                        <span>ring</span>
                        <button type="button" className="loader-debug-button" onClick={() => bump(group, ringKey, -0.5)}>−</button>
                        <button type="button" className="loader-debug-button" onClick={() => bump(group, ringKey, 0.5)}>+</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
