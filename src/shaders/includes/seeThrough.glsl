// Screen-space see-through: a surface fades out where something the player needs to see — the
// hero, a music stone, a sheep — sits BEHIND it (further from the camera) but inside its screen
// disc. Shared by the props and by the tree eye planes, which are part of the same trees and must
// fade with them.
//
// Each subject is packed as [centreX px, centreY px, radius px, camera depth]; inactive slots
// carry radius 0 and are skipped. The buffers are written per frame by the components that own
// them (world/state/*SeeThrough.js) and uploaded as vec4[] uniforms.
//
// INCLUDE THIS AFTER THE FILE'S VARYINGS — seeThroughAmount reads vWorldPos.
//
// Note that MusicStones deliberately passes no stone/char arrays of its own: the stones must not
// punch see-through holes in each other. Keep that asymmetry on the JS side, not here.

uniform float uSeeThroughActive;
uniform vec2 uSeeThroughCenter;
uniform float uSeeThroughRadius;
uniform float uSeeThroughDepth;
uniform float uSeeThroughInner;
uniform float uSeeThroughDepthBias;
uniform float uSeeThroughOpacityIntensity;

// The music stones.
#define MAX_STONE_ST 7
uniform vec4 uStoneSeeThrough[MAX_STONE_ST];
uniform int uStoneSeeThroughCount;

// The music characters (sheep).
#define MAX_CHAR_ST 5
uniform vec4 uCharSeeThrough[MAX_CHAR_ST];
uniform int uCharSeeThroughCount;

float seeThroughAmount(vec2 center, float radiusPx, float depth) {
    if (length(vWorldPos - cameraPosition) >= depth - uSeeThroughDepthBias) return 0.0;
    float sd = length(gl_FragCoord.xy - center) / max(radiusPx, 1.0);
    float fade = 1.0 - smoothstep(uSeeThroughInner, 1.0, sd);
    return fade * uSeeThroughOpacityIntensity;
}
