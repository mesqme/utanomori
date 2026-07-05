uniform vec3 uBaseColor;
// Outgoing theme's base colour (masked theme transitions) — the hero / sheep recolour sweeps with
// the portal edge like the world instead of snapping at the click.
uniform vec3 uBaseColorOld;
uniform int uDebugMode;
uniform int uPainterlyEnabled;
uniform sampler2D uPainterlyTexture;
uniform float uPainterlyScale;
uniform float uPainterlyContrast;
uniform vec3 uPainterlyColor;
uniform float uPainterlyColorStrength;
uniform float uPainterlyBrightnessVariation;
// Reveal-edge fade (companions only; the hero leaves uFade = 0 so this is a no-op for it).
uniform float uFade;
uniform vec3 uBackgroundColor;
// Optional base-colour texture (mask faces), gated by uUseBaseTexture; flat uBaseColor otherwise.
uniform sampler2D uBaseTexture;
uniform int uUseBaseTexture;

// In-shader cartoon eyes (head mesh only, uDrawEyes = 1) — drawn in the second UV set (uv1), where
// the front face is laid out. Same look as the procedural eyes quad; CharacterEyes drives these.
uniform int uDrawEyes;
uniform vec3 uEyeColor;
uniform vec3 uPupilColor;
uniform float uEyeRadius;
uniform float uEyeSpacing;
uniform float uEyeOffsetY;
uniform float uEyeAspect;
uniform float uEyeNoiseScale;
uniform float uEyeNoiseStrength;
uniform float uPupilWidth;
uniform float uPupilHeight;
uniform float uPupilOffsetX;
uniform float uPupilOffsetY;
uniform float uPupilNoiseScale;
uniform float uPupilNoiseStrength;
uniform float uEyeEdgeSoftness;
uniform float uEyeBlink;

#include ../lib/themeMask.glsl

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vInstanceTint; // per-instance colour jitter (sheep scales); vec3(1) everywhere else
varying vec2 vUv1;
varying vec2 vUv; // first UV set (TEXCOORD_0) — used only when uUseBaseTexture (mask face texture)

// Stable per-pixel dither (interleaved gradient noise) for the reveal-edge dissolve.
float ditherNoise(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

float samplePainterlyTexture(vec3 position, vec3 normalDirection) {
    vec3 blendWeights = pow(abs(normalDirection), vec3(4.0));
    blendWeights /= max(blendWeights.x + blendWeights.y + blendWeights.z, 0.0001);

    float xProjection = texture2D(uPainterlyTexture, position.yz).r;
    float yProjection = texture2D(uPainterlyTexture, position.xz).r;
    float zProjection = texture2D(uPainterlyTexture, position.xy).r;

    return xProjection * blendWeights.x + yProjection * blendWeights.y + zProjection * blendWeights.z;
}

// --- Ashima 2D simplex noise (for the eye / pupil perlin borders) ---
vec3 eyeMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 eyeMod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 eyePermute(vec3 x) { return eyeMod289(((x * 34.0) + 1.0) * x); }
float eyeSnoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = eyeMod289(i);
    vec3 p = eyePermute(eyePermute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// Composite the two eyes (+ squished pupils + blink) onto the head colour, sampled in uv1.
vec3 drawEyes(vec3 baseColor, vec2 uv1) {
    vec2 euv = uv1 - 0.5;
    float side = euv.x < 0.0 ? -1.0 : 1.0;
    vec2 ep = euv - vec2(side * uEyeSpacing * 0.5, uEyeOffsetY);

    vec2 epe = ep / vec2(max(uEyeRadius * uEyeAspect, 1e-3), max(uEyeRadius, 1e-3));
    float er = length(epe);
    float eedge = 1.0 + eyeSnoise(epe * uEyeNoiseScale) * uEyeNoiseStrength;
    float emask = 1.0 - smoothstep(eedge - uEyeEdgeSoftness, eedge, er);

    float ap = (1.0 - uEyeBlink) * uEyeRadius;
    float lidS = max(uEyeRadius * uEyeEdgeSoftness, 1e-4);
    emask *= 1.0 - smoothstep(ap - lidS, ap, abs(ep.y));

    vec2 epp = (ep - vec2(uPupilOffsetX, uPupilOffsetY)) / vec2(max(uPupilWidth, 1e-3), max(uPupilHeight, 1e-3));
    float erp = length(epp);
    float pedge = 1.0 + eyeSnoise(epp * uPupilNoiseScale + 11.3) * uPupilNoiseStrength;
    float pmask = 1.0 - smoothstep(pedge - uEyeEdgeSoftness, pedge, erp);

    return mix(baseColor, mix(uEyeColor, uPupilColor, pmask), emask);
}

void main() {
    float painterlyValue = 0.5;
    vec3 baseColor = mix(uBaseColorOld, uBaseColor, themeMaskNewness());
    if (uUseBaseTexture == 1) {
        baseColor = texture2D(uBaseTexture, vUv).rgb;
    }
    vec3 finalColor = baseColor * vInstanceTint;
    if (uPainterlyEnabled == 1) {
        painterlyValue = samplePainterlyTexture(vObjectPosition * uPainterlyScale, normalize(vObjectNormal));
        painterlyValue = clamp((painterlyValue - 0.5) * uPainterlyContrast + 0.5, 0.0, 1.0);
        float signedVariation = painterlyValue * 2.0 - 1.0;
        finalColor *= 1.0 + signedVariation * uPainterlyBrightnessVariation;
        float tintMask = smoothstep(0.55, 1.0, painterlyValue) * uPainterlyColorStrength;
        finalColor = mix(finalColor, uPainterlyColor, tintMask);
    }

    if (uDebugMode == 1) {
        finalColor = uBaseColor;
    } else if (uDebugMode == 2) {
        finalColor = vec3(painterlyValue);
    }

    // In-shader eyes (head mesh only) — drawn last so they read on top of the head paint.
    if (uDrawEyes == 1) {
        finalColor = drawEyes(finalColor, vUv1);
    } else if (uDrawEyes == 2) {
        finalColor = vec3(vUv1, 0.0); // debug: paint the head by its second UV (R=u, G=v; black = no uv1)
    }

    // Reveal-edge fade (uFade 0→1): a SCREEN-DOOR dither dissolve (not alpha) so the creature stays
    // OPAQUE and depth-sorts cleanly with the transparent grass — instead of blending through it and
    // ghosting. A small colour pull toward the background softens the dissolving pixels.
    if (uFade > 0.0) {
        finalColor = mix(finalColor, uBackgroundColor, uFade * 0.5);
        if (uFade >= ditherNoise(gl_FragCoord.xy)) discard;
    }
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);

    #include <colorspace_fragment>
}
