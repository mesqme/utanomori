import * as THREE from 'three'

// Shared screen-space drift + viewport for every paintery overlay (background + the terrain
// border, grass and prop surfaces), so they all pan together with the camera and stay resize /
// DPR stable. Spread these uniforms (by reference) into each paintery material, then call
// updateScreenPaintery once per frame. Values are in drawing-buffer (device) pixels.
export const screenPainteryUniforms = {
    uTexturePan: { value: new THREE.Vector2() }, // camera-drift offset (from yaw/pitch)
    uPainteryResolution: { value: new THREE.Vector2(1, 1) }, // drawing buffer size
    uPainteryDpr: { value: 1 }, // device pixel ratio (so the tile size is CSS-locked)
}

const _fwd = new THREE.Vector3()
const _res = new THREE.Vector2()
const _pan = { prevYaw: null, yawAccum: 0 }

// Camera yaw/pitch → a screen-space pan: the texture drifts opposite to the look direction
// (look down → texture up, turn left → texture right). Device px so it matches gl_FragCoord.
// Yaw is unwrapped so a full orbit never snaps at ±180°. yawGain / pitchGain are CSS px/radian
// (signed — flip a sign to reverse that axis); ×dpr keeps the drift identical on every display.
export function updateScreenPaintery(state, yawGain, pitchGain) {
    state.camera.getWorldDirection(_fwd)
    const yaw = Math.atan2(_fwd.x, _fwd.z)
    const pitch = Math.asin(Math.min(1, Math.max(-1, _fwd.y)))
    if (_pan.prevYaw === null) _pan.prevYaw = yaw
    let dYaw = yaw - _pan.prevYaw
    if (dYaw > Math.PI) dYaw -= Math.PI * 2
    else if (dYaw < -Math.PI) dYaw += Math.PI * 2
    _pan.yawAccum += dYaw
    _pan.prevYaw = yaw

    const dpr = state.viewport.dpr
    screenPainteryUniforms.uTexturePan.value.set(-_pan.yawAccum * yawGain * dpr, pitch * pitchGain * dpr)
    state.gl.getDrawingBufferSize(_res)
    screenPainteryUniforms.uPainteryResolution.value.copy(_res)
    screenPainteryUniforms.uPainteryDpr.value = dpr
}
