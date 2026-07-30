uniform vec3 uBaseColor;
uniform int uPainterlyEnabled;
uniform sampler2D uPainterlyTexture;
uniform float uPainterlyScale;
uniform float uPainterlyContrast;
uniform vec3 uPainterlyColor;
uniform float uPainterlyColorStrength;
uniform float uPainterlyBrightnessVariation;
uniform vec3 uBackgroundColor;
uniform vec3 uBackgroundColorOld; // outgoing theme's sky (masked transitions — border fade target)
uniform int uPropFadeMode; // 0 = dither, 1 = colour, 2 = paintery
uniform float uPixelSize;
uniform float uPainterySize;
uniform vec2 uTexturePan; // shared camera-drift offset (device px)
uniform vec2 uPainteryResolution; // drawing buffer size (px) — anchor to the screen centre
uniform float uPainteryDpr; // device pixel ratio (CSS-locks the tile size)
uniform float uPainteryScreenBlend;
uniform float uPainteryDrift;
uniform float uPainteryLayer2Scale;
// See-through subjects + seeThroughAmount() come from includes/seeThrough.glsl (included
// below, after the varyings). These two are prop-only — the paintery edge on the hole.
uniform float uSeeThroughTextureContrast;
uniform float uSeeThroughTextureScale;

// Fresnel colour rim for the hard-surface props. A SEPARATE colour per type (selected by the
// vStone / vSeeThrough attributes): stones, tree trunks, mushrooms. (Music stones use a separate
// material instance, so their three slots are all set to the music-stone colour.) Tree leaves use
// the painterly silhouette edge below instead.
uniform int uPropRimEnabled;
uniform vec3 uPropRimColorStone;
uniform vec3 uPropRimColorTrunk;
uniform vec3 uPropRimColorMushroom;
uniform float uPropRimStrength;
uniform float uPropRimPower;

// Stones only: darken + tint the BOTTOM, fading up to the normal colour. uDark = brightness at the
// base (0 = black, 1 = no darkening); uColor/uColorStrength = a tint blended into the base; uHeight =
// the normalised height (0..1) by which it reaches the normal colour.
uniform int uStoneGradientEnabled;
uniform float uStoneGradientDark;
uniform vec3 uStoneGradientColor;
uniform float uStoneGradientColorStrength;
uniform float uStoneGradientHeight;

// Per-TYPE prop colours as uniforms (scattered-props material only — uTypeColorsEnabled). The
// batched per-instance colour carries only the theme-INDEPENDENT part (stone GLB variant colour ×
// placement tone); the type colour + per-instance jitter apply here, so recolouring trees/stones/
// mushrooms is a uniform write — no BatchedMesh rebuild (the day/night switch stays hitch-free).
uniform int uTypeColorsEnabled;
uniform vec3 uTypeTreeColor; // bush / canopy
uniform vec3 uTypeTrunkColor;
uniform vec3 uTypeStoneColor; // the stoneTint
uniform vec3 uTypeMushroomCapColor;
uniform vec3 uTypeMushroomLegColor;
uniform float uTypeTreeVariation;
uniform float uTypeStoneVariation;
uniform float uTypeMushroomVariation;
uniform float uTypeMushroomLegVariation; // how much of the mushroom variation reaches the leg
// Outgoing theme (masked theme transitions — props keep moving on both sides of the edge).
uniform vec3 uTypeTreeColorOld;
uniform vec3 uTypeTrunkColorOld;
uniform vec3 uTypeStoneColorOld;
uniform vec3 uTypeMushroomCapColorOld;
uniform vec3 uTypeMushroomLegColorOld;
uniform float uTypeTreeVariationOld;
uniform float uTypeStoneVariationOld;
uniform float uTypeMushroomVariationOld;
uniform vec3 uStoneGradientColorOld;
uniform vec3 uPropRimColorStoneOld;
uniform vec3 uPropRimColorTrunkOld;
uniform vec3 uPropRimColorMushroomOld;

#include ../includes/themeMask.glsl

#include <common>
#include <color_pars_fragment>

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vPropMask;
varying vec2 vWorldXZ;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vFoliage;
varying float vSeeThrough; // 1 = trees (fade when occluding); 0 = stones/mushrooms (stay solid)
varying float vHeight;
varying float vStone;
varying float vPart;
varying vec3 vTypeJitter; // per-instance colour jitter, computed in the VERTEX (stable, no crawl)

#include ../includes/paintedEdge.glsl

// View-facing fresnel: tints the silhouette toward the given rim colour, fully opaque.
vec3 applyPropRim(vec3 color, vec3 rimColor, vec3 worldNormal, vec3 worldPosition) {
    if (uPropRimEnabled == 0) return color;
    vec3 viewDir = normalize(cameraPosition - worldPosition);
    float ndv = max(dot(normalize(worldNormal), viewDir), 0.0);
    float fresnel = pow(1.0 - ndv, max(uPropRimPower, 0.001));
    return mix(color, rimColor, clamp(fresnel * uPropRimStrength, 0.0, 1.0));
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
#include ../includes/seeThrough.glsl

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
    stAmount *= vSeeThrough; // trees + stones see-through; mushrooms stay solid
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

    // Masked theme transition mask (1 when inactive) — blends outgoing → live theme values below.
    float tmNew = themeMaskNewness();

    // Scattered props: the batched colour holds only the theme-independent part (stone GLB variant
    // colour × placement tone). Apply the per-TYPE theme colour + the per-instance jitter here —
    // same formula the CPU bake used: clamp(1 + jitter · variation, 0.25, 1.75) per channel.
    if (uTypeColorsEnabled == 1) {
        vec3 typeColor;
        float variation;
        if (vStone > 0.5) {
            typeColor = mix(uTypeStoneColorOld, uTypeStoneColor, tmNew);
            variation = mix(uTypeStoneVariationOld, uTypeStoneVariation, tmNew);
        } else if (vFoliage > 0.5) {
            typeColor = mix(uTypeTreeColorOld, uTypeTreeColor, tmNew);
            variation = mix(uTypeTreeVariationOld, uTypeTreeVariation, tmNew);
        } else if (vSeeThrough > 0.5) {
            typeColor = mix(uTypeTrunkColorOld, uTypeTrunkColor, tmNew);
            variation = mix(uTypeTreeVariationOld, uTypeTreeVariation, tmNew);
        } else if (vPart > 0.5) {
            typeColor = mix(uTypeMushroomLegColorOld, uTypeMushroomLegColor, tmNew);
            variation = mix(uTypeMushroomVariationOld, uTypeMushroomVariation, tmNew) * uTypeMushroomLegVariation;
        } else {
            typeColor = mix(uTypeMushroomCapColorOld, uTypeMushroomCapColor, tmNew);
            variation = mix(uTypeMushroomVariationOld, uTypeMushroomVariation, tmNew);
        }
        vec3 jitterFactor = clamp(vec3(1.0) + vTypeJitter * variation, 0.25, 1.75);
        finalColor *= typeColor * jitterFactor;
    }

    if (uPainterlyEnabled == 1) {
        float painterlyValue = samplePainterlyTexture(vObjectPosition * uPainterlyScale, normalize(vObjectNormal));
        painterlyValue = clamp((painterlyValue - 0.5) * uPainterlyContrast + 0.5, 0.0, 1.0);
        float signedVariation = painterlyValue * 2.0 - 1.0;
        finalColor *= 1.0 + signedVariation * uPainterlyBrightnessVariation;
        float tintMask = smoothstep(0.55, 1.0, painterlyValue) * uPainterlyColorStrength;
        finalColor = mix(finalColor, uPainterlyColor, tintMask);
    }

    // Stone bottom gradient (stones only): base is darkened + tinted, fading up to the normal colour.
    if (uStoneGradientEnabled == 1 && vStone > 0.5) {
        float up = smoothstep(0.0, max(uStoneGradientHeight, 0.001), vHeight); // 0 = bottom → 1 = top
        finalColor *= mix(uStoneGradientDark, 1.0, up); // darken the base
        vec3 gradientColor = mix(uStoneGradientColorOld, uStoneGradientColor, tmNew);
        finalColor = mix(finalColor, gradientColor, (1.0 - up) * uStoneGradientColorStrength); // tint the base
    }

    // Reveal-circle fade — colour, dithered, or paintery, matching the world. The fade target is
    // the SKY colour, which is themed — mix it by the mask so the border band doesn't snap.
    vec3 fadeBg = mix(uBackgroundColorOld, uBackgroundColor, tmNew);
    float fade = 1.0 - vPropMask;
    if (uPropFadeMode == 1) {
        if (vPropMask <= 0.001) discard;
        finalColor = mix(fadeBg, finalColor, vPropMask);
    } else if (uPropFadeMode == 2) {
        float painteryBrush = samplePainteryBrush(vWorldXZ);
        finalColor = mix(finalColor, fadeBg, step(painteryBrush, fade));
        if (fade > painteryBrush) discard;
    } else {
        if (fade >= 0.999 || (fade > 0.0 && bayerDither(gl_FragCoord.xy, uPixelSize) < fade)) discard;
    }

    float edgeAlpha = 1.0;
    if (vFoliage > 0.5) {
        // Tree leaves keep the painterly dither/alpha silhouette edge.
        float edgeBrush = samplePainterlyTexture(vObjectPosition * uEdgeNoiseScale, normalize(vObjectNormal));
        edgeAlpha = paintedEdgeAlpha(finalColor, vWorldNormal, vWorldPos, edgeBrush, tmNew);
    } else {
        // Trunks / stones / mushrooms get a fresnel colour rim instead (opaque) — colour per type.
        vec3 rimColor = vStone > 0.5 ? mix(uPropRimColorStoneOld, uPropRimColorStone, tmNew)
            : (vSeeThrough > 0.5 ? mix(uPropRimColorTrunkOld, uPropRimColorTrunk, tmNew)
                                 : mix(uPropRimColorMushroomOld, uPropRimColorMushroom, tmNew));
        finalColor = applyPropRim(finalColor, rimColor, vWorldNormal, vWorldPos);
    }

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), edgeAlpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
