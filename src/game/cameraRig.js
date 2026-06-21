// Shared camera shot, written by the GameDirector and read by MainCharacter each
// frame. `mode: 'follow'` uses the normal third-person follow; `mode: 'orbit'` uses
// the angle/distance/height around the hero (loading top view, intro travel).
export const cameraRig = {
    mode: 'follow',
    angle: 0,
    distance: 8.2,
    height: 1.9,
    targetYOffset: 0.4,
    lerpSpeed: 5,
    // Optional orbit center (world XZ). When set, the orbit shot frames this point instead
    // of the hero — used by the music mini-game to look down on the companion's stones.
    centerX: null,
    centerZ: null,
}
