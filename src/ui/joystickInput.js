// Live analog input from the on-screen mobile joystick (Joystick.jsx), read by MainCharacter each
// frame — a plain mutable singleton (like loaderInteraction) so dragging never triggers React
// re-renders. x/z is a UNIT direction (screen right = +x, screen down = +z, which maps to the
// hero's rightward / backward), active is set past the dead-zone, run past the run threshold.
export const joystickInput = { x: 0, z: 0, active: false, run: false }

export function resetJoystick() {
    joystickInput.x = 0
    joystickInput.z = 0
    joystickInput.active = false
    joystickInput.run = false
}

// A frozen snapshot for when input must be ignored (mini-game / tutorial) — MainCharacter swaps to
// this instead of mutating the live singleton.
export const EMPTY_JOYSTICK = Object.freeze({ x: 0, z: 0, active: false, run: false })
