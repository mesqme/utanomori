// Shared "see-through" state: occluders (grass, props) between the camera and the
// hero get a paintary-edged hole punched in them so the hero is always visible.
//
// MainCharacter projects the hero to the screen each frame and writes the live
// fields (centre / radius in framebuffer pixels, camera distance, active). The grass
// and prop materials read these into uniforms; their fragment shaders fade/cut away
// fragments that fall inside the screen disc and sit closer to the camera than the
// hero. Edited live by the See-Through Leva folder.
export const seeThrough = {
    // Tunables (Leva)
    enabled: true,
    worldRadius: 2.5, // size of the hole in world units around the hero
    inner: 0.41, // 0..1 - solid core before the paintary falloff begins
    coreOpacity: 0.33, // 0 = fully cut out, 1 = fully opaque at the centre
    depthBias: 0.5, // occluder must be at least this many world units in front

    // Live (written by MainCharacter each frame, in framebuffer pixels)
    centerX: 0,
    centerY: 0,
    radiusPx: 120,
    cameraDist: 20,
    active: false,
}
