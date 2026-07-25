// Everything the game SAYS, in one place — the intro pitch, the closing line, the grumpy failure
// one-liners and the credit roll. Split out of gameConfig.js (which holds timings and camera
// shots) so the writing can be read and edited without scrolling past tween durations.
//
// The pacing that goes WITH this copy stays in gameConfig.js, because it is derived from the
// camera travel: INTRO_DIALOGUE_DELAY, FINALE_DIALOGUE_DELAY, CREDITS_SCROLL_DURATION.
//
// CREDITS_LINES mixes two kinds of blank line on purpose — they are not interchangeable, they
// give the roll its different gap heights. Copy them verbatim.

export const DIALOGUE_TEXT = 'Hey there, wandering soul. My melody spirits slipped away into this forest... will you help me find them and restore my song?'

// Finale: shown once the party is complete (PHASES.finale), before the credits roll. The hero speaks
// the closing line; the confirm button ("Say goodbye") rolls the credits.
export const FINALE_LINE = 'Thank you, kind stranger, you gathered my melody spirits and now I can continue my journey with my song.'
export const FINALE_CONFIRM = 'Say goodbye'

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
