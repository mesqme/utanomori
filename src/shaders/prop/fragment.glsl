uniform vec3 uBaseColor;
uniform int uPainterlyEnabled;
uniform sampler2D uPainterlyTexture;
uniform float uPainterlyScale;
uniform float uPainterlyContrast;
uniform vec3 uPainterlyColor;
uniform float uPainterlyColorStrength;
uniform float uPainterlyBrightnessVariation;
uniform vec3 uBackgroundColor;
uniform int uPropFadeMode; // 0 = dither, 1 = colour, 2 = paintery
uniform float uPixelSize;
uniform float uPainterySize;
uniform vec2 uTexturePan; // shared camera-drift offset (device px)
uniform vec2 uPainteryResolution; // drawing buffer size (px) — anchor to the screen centre
uniform float uPainteryDpr; // device pixel ratio (CSS-locks the tile size)
uniform float uPainteryScreenBlend;
uniform float uPainteryDrift;
uniform float uPainteryLayer2Scale;
uniform float uPainteryBleed;
uniform float uSeeThroughActive;
uniform vec2 uSeeThroughCenter;
uniform float uSeeThroughRadius;
uniform float uSeeThroughDepth;
uniform float uSeeThroughInner;
uniform float uSeeThroughDepthBias;
uniform float uSeeThroughOpacityIntensity;
uniform float uSeeThroughTextureContrast;
uniform float uSeeThroughTextureScale;
// Extra see-through subjects: the bottom music stones. xy = screen centre px, z = radius px,
// w = camera depth. Props fade where ANY of these (or the hero) sits behind them.
#define MAX_STONE_ST 4
uniform vec4 uStoneSeeThrough[MAX_STONE_ST];
uniform int uStoneSeeThroughCount;
// Extra see-through subjects: the music characters (sheep). Same packing as the stones; inactive
// slots carry radius 0 (skipped).
#define MAX_CHAR_ST 4
uniform vec4 uCharSeeThrough[MAX_CHAR_ST];
uniform int uCharSeeThroughCount;

// Fresnel colour rim for the hard-surface props (trunks / stones / mushrooms). Tree
// leaves use the painterly silhouette edge below instead.
uniform int uPropRimEnabled;
uniform vec3 uPropRimColor;
uniform float uPropRimStrength;
uniform float uPropRimPower;

#include <common>
#include <color_pars_fragment>

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vPropMask;
varying vec2 vWorldXZ;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vFoliage;

#include ../lib/paintedEdge.glsl

// View-facing fresnel: tints the silhouette toward uPropRimColor, fully opaque.
vec3 applyPropRim(vec3 color, vec3 worldNormal, vec3 worldPosition) {
    if (uPropRimEnabled == 0) return color;
    vec3 viewDir = normalize(cameraPosition - worldPosition);
    float ndv = max(dot(normalize(worldNormal), viewDir), 0.0);
    float fresnel = pow(1.0 - ndv, max(uPropRimPower, 0.001));
    return mix(color, uPropRimColor, clamp(fresnel * uPropRimStrength, 0.0, 1.0));
}

// Triplanar painterly sampling — identical to the character material.
float samplePainterlyTexture(vec3 position, vec3 normalDirection) {
    vec3 blendWeights = pow(abs(normalDirection), vec3(4.0));
    blendWeights /= max(blendWeights.x + blendWeights.y + blendWeights.z, 0.0001);

    float xProjection = texture2D(uPainterlyTexture, position.yz).r;
    float yProjection = texture2D(uPainterlyTexture, position.xz).r;
    float zProjection = texture2D(uPainterlyTexture, position.xy).r;

    return xProjection * blendWeights.x + yProjection * blendWeights.y + zProjection * blendWeights.z;
}

float bayerDither(vec2 fragCoord, float pixelSize) {
    vec2 cell = floor(fragCoord / pixelSize);
    int x = int(mod(cell.x, 4.0));
    int y = int(mod(cell.y, 4.0));
    int index = x + y * 4;
    float m[16];
    m[0] = 0.0; m[1] = 8.0; m[2] = 2.0; m[3] = 10.0;
    m[4] = 12.0; m[5] = 4.0; m[6] = 14.0; m[7] = 6.0;
    m[8] = 3.0; m[9] = 11.0; m[10] = 1.0; m[11] = 9.0;
    m[12] = 15.0; m[13] = 7.0; m[14] = 13.0; m[15] = 5.0;
    return m[index] / 16.0;
}

float samplePainteryBrush(vec2 worldXZ) {
    // Screen-anchored, device-stable reveal-edge brush. On non-planar props (tree canopies) a
    // world projection streaks the dither over the surface, so we sample screen-space instead —
    // a flat "canvas". The /(uPainterySize * uPainteryDpr) CSS-locks the tile, so a window resize
    // reveals MORE of the texture rather than rescaling it (device-stable). uPainteryScreenBlend
    // (Border) blends world↔screen and is 1 for the paintery style → fully screen.
    vec2 screenUv = (gl_FragCoord.xy - 0.5 * uPainteryResolution + uTexturePan) / (uPainterySize * uPainteryDpr);
    vec2 painteryUv = mix(worldXZ * uPainteryDrift, screenUv, uPainteryScreenBlend);
    float painteryBrush = texture2D(uPainterlyTexture, painteryUv).r;
    return mix(painteryBrush, texture2D(uPainterlyTexture, painteryUv * uPainteryLayer2Scale + vec2(0.37)).r, 0.5);
}

// See-through amount for one subject (hero / stone): how much to fade this prop where the
// subject sits behind it on screen and the prop is in front of it.
float seeThroughAmount(vec2 center, float radiusPx, float depth) {
    if (length(vWorldPos - cameraPosition) >= depth - uSeeThroughDepthBias) return 0.0;
    float sd = length(gl_FragCoord.xy - center) / max(radiusPx, 1.0);
    float fade = 1.0 - smoothstep(uSeeThroughInner, 1.0, sd);
    return fade * uSeeThroughOpacityIntensity;
}

void main() {
    // See-through: where the hero OR a bottom music stone is hidden behind this prop, dither it
    // away through the brush so it shows through (semitransparent, not fully removed). Multiple
    // subjects → take the strongest amount.
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
        if (c.z <= 0.0) continue; // inactive slot
        stAmount = max(stAmount, seeThroughAmount(c.xy, c.z, c.w));
    }
    if (stAmount > 0.0) {
        vec2 stScreenUv = (gl_FragCoord.xy - 0.5 * uPainteryResolution + uTexturePan) / (uSeeThroughTextureScale * uPainteryDpr);
        vec2 stUv = mix(vWorldXZ * uPainteryDrift, stScreenUv, uPainteryScreenBlend);
        float stBrush = texture2D(uPainterlyTexture, stUv).r;
        stBrush = mix(stBrush, texture2D(uPainterlyTexture, stUv * uPainteryLayer2Scale + vec2(0.37)).r, 0.5);
        stBrush = clamp((stBrush - 0.5) * uSeeThroughTextureContrast + 0.5, 0.0, 1.0);
        if (stAmount > stBrush) discard;
    }

    // Per-instance batched colour is the base; painterly varies brightness on top.
    vec3 finalColor = uBaseColor;
    #if defined(USE_BATCHING_COLOR) || defined(USE_COLOR)
        finalColor = vColor;
    #endif

    if (uPainterlyEnabled == 1) {
        float painterlyValue = samplePainterlyTexture(vObjectPosition * uPainterlyScale, normalize(vObjectNormal));
        painterlyValue = clamp((painterlyValue - 0.5) * uPainterlyContrast + 0.5, 0.0, 1.0);
        float signedVariation = painterlyValue * 2.0 - 1.0;
        finalColor *= 1.0 + signedVariation * uPainterlyBrightnessVariation;
        float tintMask = smoothstep(0.55, 1.0, painterlyValue) * uPainterlyColorStrength;
        finalColor = mix(finalColor, uPainterlyColor, tintMask);
    }

    // Reveal-circle fade — colour, dithered, or paintery, matching the world.
    float fade = 1.0 - vPropMask;
    if (uPropFadeMode == 1) {
        if (vPropMask <= 0.001) discard;
        finalColor = mix(uBackgroundColor, finalColor, vPropMask);
    } else if (uPropFadeMode == 2) {
        float painteryBrush = samplePainteryBrush(vWorldXZ);
        finalColor = mix(finalColor, uBackgroundColor, smoothstep(painteryBrush - uPainteryBleed, painteryBrush, fade));
        if (fade > painteryBrush) discard;
    } else {
        if (fade >= 0.999 || (fade > 0.0 && bayerDither(gl_FragCoord.xy, uPixelSize) < fade)) discard;
    }

    float edgeAlpha = 1.0;
    if (vFoliage > 0.5) {
        // Tree leaves keep the painterly dither/alpha silhouette edge.
        float edgeBrush = samplePainterlyTexture(vObjectPosition * uEdgeNoiseScale, normalize(vObjectNormal));
        edgeAlpha = paintedEdgeAlpha(finalColor, vWorldNormal, vWorldPos, edgeBrush);
    } else {
        // Trunks / stones / mushrooms get a fresnel colour rim instead (opaque).
        finalColor = applyPropRim(finalColor, vWorldNormal, vWorldPos);
    }

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), edgeAlpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
