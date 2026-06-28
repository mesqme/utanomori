// Shared handle to the hero's `head` bone, set by MainCharacter once the rig loads. The procedural
// eyes (CharacterEyes) read it so they can ride the head's animation (bob / tilt) on top of their
// tuned placement — without being a child of the bone, so the Leva offset/rotation stay meaningful.
export const characterHead = { bone: null }
