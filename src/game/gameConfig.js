// Camera shots (debug-orbit style: angle / distance / height / targetYOffset around
// the hero). Top-down for the loading "hat" view, low front to reveal the face.
export const CAMERA_TOP_SHOT = { angle: 0, distance: 2, height: 15.1, targetYOffset: 0.4 }
export const CAMERA_FRONT_SHOT = { angle: Math.PI, distance: 8.2, height: 1.9, targetYOffset: 0.4 }

export const INTRO_TRAVEL_DURATION = 2.6 // seconds for the camera to arc top → front
export const INTRO_DIALOGUE_DELAY = 2.9 // when the speech bubble starts typing
export const DIALOGUE_TYPE_SPEED = 28 // ms per character

export const DIALOGUE_TEXT =
    'Well met, wandering soul. My song has slipped away into this old whispering wood... wouldst thou help me find my lost melody?'

export const CREDITS_LINES = [
    'SOUND JOURNEY',
    '',
    'A small tale of a traveller',
    'and his lost melody',
    '',
    '— Design & Code —',
    'You',
    '',
    '— Built with —',
    'Three.js · React Three Fiber',
    '',
    'Thank you for wandering',
    'through the forest.',
]

export const CREDITS_SCROLL_DURATION = 18 // seconds for the credits to scroll past
