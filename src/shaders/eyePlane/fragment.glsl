// Eye-plane fragment: draws one eye PAIR on the plane's [0,1] UV square (two yellow circles with
// squished pupils, perlin borders, blink + the occasional glance). Everything outside the eyes is
// transparent so only the eyes read on the canopy. Blink/glance are time-driven off a per-plane phase.
precision highp float;

uniform float uTime;
uniform vec3 uEyeColor;
// Outgoing theme's iris colour (masked theme transitions) — the eyes recolour with the sweep.
uniform vec3 uEyeColorOld;
uniform vec3 uPupilColor;
uniform float uEyeRadius;
uniform float uEyeSpacing;
uniform float uEyeOffsetY;
uniform float uEyeAspect;
uniform float uEyeNoiseScale;
uniform float uEyeNoiseStrength;
uniform float uPupilWidth;
uniform float uPupilHeight;
uniform float uPupilNoiseScale;
uniform float uPupilNoiseStrength;
uniform float uEdgeSoftness;
uniform float uBlinkInterval;
uniform float uBlinkWidth;
uniform float uLookInterval;
uniform float uLookHold;
uniform float uLookAmount;
uniform float uLookChance;
// Camera-facing fade: fully transparent once the plane's normal·view drops to uFacingThreshold
// (edge-on near 90°, and back-facing planes); ramps to opaque over uFacingFalloff.
uniform float uFacingThreshold;
uniform float uFacingFalloff;
// See-through: the eyes are part of the tree, so they fade where the hero / a music stone / a
// sheep sits behind them — the SAME subjects the trees use (see includes/seeThrough.glsl).

varying vec2 vUv;
varying float vPropMask;
varying float vPhase;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

#include ../includes/themeMask.glsl

#include ../includes/seeThrough.glsl

#include ../includes/simplexNoise2d.glsl

void main() {
    if (vPropMask <= 0.001) discard; // faded out at the reveal-circle edge

    // Camera-facing fade: transparent edge-on (near 90°) + on planes turned away from the camera.
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float facing = smoothstep(uFacingThreshold, uFacingThreshold + max(uFacingFalloff, 1e-3), dot(normalize(vWorldNormal), viewDir));
    if (facing <= 0.0) discard;

    float bt = fract(uTime / max(uBlinkInterval, 0.1) + vPhase);
    float bw = max(uBlinkWidth, 0.02);
    float blink = sin(clamp((bt - (1.0 - bw)) / bw, 0.0, 1.0) * 3.14159265);

    float pupilOffX = 0.0;
    if (fract(vPhase * 91.7) < uLookChance) {
        float lt = fract(uTime / max(uLookInterval, 0.1) + vPhase * 2.3);
        float env = smoothstep(0.0, 0.12, lt) * (1.0 - smoothstep(uLookHold, uLookHold + 0.12, lt));
        pupilOffX = (vPhase < 0.5 ? -1.0 : 1.0) * uLookAmount * env;
    }

    vec2 uvc = vUv - 0.5;
    float side = uvc.x < 0.0 ? -1.0 : 1.0;
    vec2 p = uvc - vec2(side * uEyeSpacing * 0.5, uEyeOffsetY);

    vec2 pe = p / vec2(max(uEyeRadius * uEyeAspect, 1e-3), max(uEyeRadius, 1e-3));
    float eedge = 1.0 + snoise(pe * uEyeNoiseScale) * uEyeNoiseStrength;
    float emask = 1.0 - smoothstep(eedge - uEdgeSoftness, eedge, length(pe));
    float ap = (1.0 - blink) * uEyeRadius;
    emask *= 1.0 - smoothstep(ap - max(uEyeRadius * uEdgeSoftness, 1e-4), ap, abs(p.y));

    vec2 pp = (p - vec2(pupilOffX, 0.0)) / vec2(max(uPupilWidth, 1e-3), max(uPupilHeight, 1e-3));
    float pedge = 1.0 + snoise(pp * uPupilNoiseScale + 11.3) * uPupilNoiseStrength;
    float pmask = 1.0 - smoothstep(pedge - uEdgeSoftness, pedge, length(pp));

    // See-through: fade where the hero / a music stone / a sheep is behind this plane (like the tree).
    float stAmount = 0.0;
    if (uSeeThroughActive > 0.5) stAmount = max(stAmount, seeThroughAmount(uSeeThroughCenter, uSeeThroughRadius, uSeeThroughDepth));
    for (int i = 0; i < MAX_STONE_ST; i++) {
        if (i >= uStoneSeeThroughCount) break;
        vec4 s = uStoneSeeThrough[i];
        stAmount = max(stAmount, seeThroughAmount(s.xy, s.z, s.w));
    }
    for (int i = 0; i < MAX_CHAR_ST; i++) {
        if (i >= uCharSeeThroughCount) break;
        vec4 c = uCharSeeThrough[i];
        if (c.z <= 0.0) continue;
        stAmount = max(stAmount, seeThroughAmount(c.xy, c.z, c.w));
    }

    float alpha = emask * vPropMask * facing * (1.0 - clamp(stAmount, 0.0, 1.0));
    if (alpha < 0.01) discard;
    vec3 irisColor = mix(uEyeColorOld, uEyeColor, themeMaskNewness());
    gl_FragColor = vec4(mix(irisColor, uPupilColor, pmask), alpha);
    #include <colorspace_fragment>
}
