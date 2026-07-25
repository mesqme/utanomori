// Camera shots (debug-orbit style: angle / distance / height / targetYOffset around the
// hero). Top-down for the loading "hat" view (angle 0, unchanged from the original). The
// intro then sweeps a full 360° orbit (0 → 2π) descending to the dialogue shot. The dialogue
// and gameplay shots share angle 2π (the orbit's landing) so the hand-off to gameplay is a
// pure rise, no extra turn. The hero faces this side (see MainCharacter menu-facing) so the
// orbit lands looking at its face.
export const CAMERA_TOP_SHOT = { angle: 0, distance: 2, height: 15.1, targetYOffset: 0.4 }
// Intro dialogue shot. distance/height come live from cameraParameters (front*); the angle/target here.
export const CAMERA_FRONT_SHOT = { angle: Math.PI * 2, distance: 14.2, height: 4.3, targetYOffset: 0.4 }
// Orbit equivalent of the gameplay follow shot (offset 0,11.4,14.6 / target y 0.25 — distance/height
// come live from cameraParameters). Same angle as the dialogue shot, so the hand-off to gameplay
// is just a rise, not a turn.
export const CAMERA_FOLLOW_ORBIT = { angle: Math.PI * 2, distance: 14.6, height: 11.4, targetYOffset: 0.25 }
export const CAMERA_BASE_FOV = 45
export const CAMERA_REFERENCE_HEIGHT = 1080

// Intro travel — descending 360° spiral down to the hero (rotation + descent together).
// The live, tweakable numbers (durations, orbit radius) live in the store
// (introCameraParameters) so they can be tuned + replayed from the "Intro Camera" Leva
// folder. These constants are just the default timing the dialogue/reveal pacing keys off.
export const INTRO_TRAVEL_EASE = 'power1.inOut' // spiral-angle ease (gentle in/out)
export const INTRO_TRAVEL_DURATION = 3.5 // pacing anchor for the dialogue/reveal delays below
export const GAMEPLAY_ENTRY_DURATION = 2.0 // seconds for the rise into gameplay
export const INTRO_DIALOGUE_DELAY = INTRO_TRAVEL_DURATION + 0.2 // speech bubble starts as it settles

export const DIALOGUE_TEXT = 'Hey there, wandering soul. My melody spirits slipped away into this forest... will you help me find them and restore my song?'

// Finale: shown once the party is complete (PHASES.finale), before the credits roll. The hero speaks
// the closing line; the confirm button ("Say goodbye") rolls the credits.
export const FINALE_LINE = 'Thank you, kind stranger, you gathered my melody spirits and now I can continue my journey with my song.'
export const FINALE_CONFIRM = 'Say goodbye'
export const FINALE_DIALOGUE_DELAY = 0.6 // seconds after entering finale before the bubble opens

// Funny-angry one-liners a music character blurts out when you play the wrong note, just before
// it storms off to a new hiding place. One is picked at random per failure.
export const FAIL_LINES = [
    'Oh, my ears! I cannot withstand such an insult!',
    'That note was a CRIME against music!',
    'Augh! My poor delicate ears may never recover!',
    'No, no, NO — even the crows sing truer than that!',
    'You call THAT my melody? I shall hide where you cannot ruin it!',
]

export const CREDITS_LINES = [
    'UTANOMORI',
    '\u00a0',
    'The forest of songs',
    '\u00a0',
    '— Code and Models —',
    'mesq',
    ' ',
    '— Music —',
    'Aleksandr Manin',
    '\u00a0',
    '— Built with —',
    'Three.js · React Three Fiber',
    '\u00a0',
    '— Special thanks —',
    'Kei Yotsuba — for the inspiration',
    'Bruno Simon — for the journey',
    ' ',
    'Thank you for wandering',
    'through the forest.',
]

export const CREDITS_SCROLL_DURATION = 36 // seconds for the credits to scroll past (half speed → 2× the old 18s)

// Cinematic restart: the reverse of the intro. Companions flee, the camera un-spirals up to the
// top "hat" shot, the reveal shrinks, and the background/stars fade — then we land back in warmup.
export const RESTART_DURATION = 3.2
