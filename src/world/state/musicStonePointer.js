import * as THREE from 'three'

// The Simon-game pointer pose, computed by MusicStones (which owns the stones + hover/press) and
// rendered by the single arrow in TargetArrow — so it's the SAME arrow that points at companions
// during gameplay. `active` toggles the blend; the arrow lerps to/from this pose, never popping.
export const musicStonePointer = {
    active: false,
    appear: 1, // 0..1 quick fade when it snaps to a new note (so it "appears" instead of sliding)
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
}
