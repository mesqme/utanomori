import useStore from '../stores/useStore.jsx'
import './LoaderDebugOverlay.css'

function nudgeTarget(dx, dz) {
    let nextX = 0
    let nextZ = 0

    useStore.setState((state) => {
        nextX = state.loaderDebugParameters.targetX + dx
        nextZ = state.loaderDebugParameters.targetZ + dz

        return {
            loaderDebugParameters: {
                ...state.loaderDebugParameters,
                targetX: nextX,
                targetZ: nextZ,
            },
        }
    })

    console.info(`Loader debug camera target x=${nextX.toFixed(3)} z=${nextZ.toFixed(3)}`)
}

export default function LoaderDebugOverlay() {
    const params = useStore((state) => state.loaderDebugParameters)

    if (!params.enabled) return null

    const targetX = params.targetX
    const targetZ = params.targetZ
    const step = params.nudgeStep

    return (
        <div className="loader-debug-overlay">
            <div className="loader-debug-ring" />

            <div className="loader-debug-swatches" aria-hidden="true">
                <div className="loader-debug-swatch" style={{ backgroundColor: params.cssColorA }} />
                <div className="loader-debug-swatch" style={{ backgroundColor: params.cssColorB }} />
            </div>

            <div className="loader-debug-panel">
                <div className="loader-debug-title">Loader Match</div>
                <div className="loader-debug-readout">
                    x {targetX.toFixed(3)}
                    <br />z {targetZ.toFixed(3)}
                </div>
                <div className="loader-debug-pad">
                    <button type="button" className="loader-debug-button loader-debug-button--up" onClick={() => nudgeTarget(0, -step)} aria-label="Nudge target up">
                        ^
                    </button>
                    <button type="button" className="loader-debug-button loader-debug-button--left" onClick={() => nudgeTarget(-step, 0)} aria-label="Nudge target left">
                        &lt;
                    </button>
                    <button type="button" className="loader-debug-button loader-debug-button--right" onClick={() => nudgeTarget(step, 0)} aria-label="Nudge target right">
                        &gt;
                    </button>
                    <button type="button" className="loader-debug-button loader-debug-button--down" onClick={() => nudgeTarget(0, step)} aria-label="Nudge target down">
                        v
                    </button>
                </div>
            </div>
        </div>
    )
}
