uniform float uPixelSize;
uniform int uFadeMode;
uniform vec3 uBackgroundColor;
uniform vec3 uBackgroundColorOld; // outgoing theme's sky (masked transitions — border fade target)
uniform float uBaseBrightness;
uniform sampler2D uNoiseTexture;
uniform vec3 uLanternPosition;
uniform float uLanternLightRadius;
uniform float uLanternLightEdgeSoftness;
uniform float uLanternLightNoiseScale;
uniform float uLanternLightNoiseStrength;
uniform float uLanternLightInnerBrightness;
uniform float uLanternLightOuterDarkness;
uniform vec3 uLightenColor;
uniform float uLightenAmount;
uniform float uDissolveAmount;
uniform float uDissolveMode; // 0 = alpha, 1 = dither
uniform sampler2D uPainteryTexture;
uniform float uPainteryDrift;
uniform float uPainteryLayer2Scale;
uniform float uPainteryBleed;

uniform vec3 uLanternGrassColor;
uniform float uLanternGrassAlpha;
uniform float uLanternGrassColorAmount;
uniform float uGrassGlobalAlpha; // whole-field fade (0 on the loading/GO screens → 1 after GO)
uniform float uBaseBrightnessOld; // outgoing theme's brightness (masked theme transitions)
uniform vec3 uLightenColorOld; // outgoing theme's trail-lighten colour

#include ../includes/themeMask.glsl

varying vec3 vColor;
varying vec3 vColorOld;
varying vec2 vGrassData; // x = blade-space X (across the width), y = reveal-circle mask
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vTrampleDissolve;
varying float vTrampleLighten;
varying float vLanternInfluence;

// Music-character see-through: grass in FRONT of a sheep (closer to the camera, inside its screen
// disc) clears so the companion shows through. [centerX(px), centerY(px), radiusPx, cameraDist].
#define MAX_CHAR_ST 5
uniform vec4 uCharSeeThrough[MAX_CHAR_ST];
uniform int uCharSeeThroughCount;

// --- Dither Functions ---
#include ../includes/dither.glsl

float saturateValue(float x) {
    return clamp(x, 0.0, 1.0);
}

vec3 lambertLight(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColour) {
    float wrap = 0.5;
    float dotNL = saturateValue((dot(normal, lightDir) + wrap) / (1.0 + wrap));
    vec3 lighting = vec3(dotNL);

    float backlight = saturateValue((dot(viewDir, -lightDir) + wrap) / (1.0 + wrap));
    vec3 scatter = vec3(pow(backlight, 2.0));

    lighting += scatter;

    return lighting * lightColour;
}

vec3 hemiLight(vec3 normal, vec3 groundColour, vec3 skyColour) {
    return mix(groundColour, skyColour, 0.5 * normal.y + 0.5);
}

float samplePainteryBrush(vec2 worldXZ) {
    // World-anchored: the dissolve is the reveal-circle edge (a world feature), so the brush
    // tracks the world — stable on resize / camera zoom; strokes regenerate as the edge sweeps.
    vec2 painteryUv = worldXZ * uPainteryDrift;
    float painteryBrush = texture2D(uPainteryTexture, painteryUv).r;
    return mix(painteryBrush, texture2D(uPainteryTexture, painteryUv * uPainteryLayer2Scale + vec2(0.37)).r, 0.5);
}

void main() {
    float grassX = vGrassData.x;

    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    vec3 baseColor = mix(
        vColor * 0.15,
        vColor,
        smoothstep(0.125, 0.0, abs(grassX))
    );

    // Hemi
    vec3 c1 = vec3(1.0, 1.0, 0.75);
    vec3 c2 = vec3(0.05, 0.05, 0.25);

    vec3 ambientLighting = hemiLight(normal, c2, c1);

    // Directional light
    vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
    vec3 lightColour = vec3(1.0);
    vec3 diffuseLighting = lambertLight(normal, viewDir, lightDir, lightColour);

    vec3 lighting = diffuseLighting * 0.2 + ambientLighting * 0.8;

    // Masked theme transition: blend the outgoing palette toward the live one per fragment (the
    // whole field keeps moving on both sides of the portal/wipe edge). Inactive → tmNew = 1.
    float tmNew = themeMaskNewness();
    vec3 themedColor = mix(vColorOld, vColor, tmNew);
    float themedBrightness = mix(uBaseBrightnessOld, uBaseBrightness, tmNew);

    vec3 color = themedColor * lighting * themedBrightness;

    vec2 lanternNoiseUv = vWorldPosition.xz * uLanternLightNoiseScale * 0.1;
    float lanternNoise = texture2D(uNoiseTexture, lanternNoiseUv).r * 2.0 - 1.0;
    float lanternNoisyRadius = uLanternLightRadius * (1.0 + lanternNoise * uLanternLightNoiseStrength);
    float lanternDistance = length(vWorldPosition.xz - uLanternPosition.xz);
    float lanternSoftness = max(uLanternLightEdgeSoftness, 0.0001);
    float lanternMask = 1.0 - smoothstep(
        lanternNoisyRadius - lanternSoftness,
        lanternNoisyRadius + lanternSoftness,
        lanternDistance
    );
    float lanternLightMultiplier = mix(
        1.0 - uLanternLightOuterDarkness,
        1.0 + uLanternLightInnerBrightness,
        lanternMask
    );
    color = clamp(color * lanternLightMultiplier, 0.0, 1.0);

    // Lighten/darken layer — mix toward the layer colour by its influence × amount (the colour
    // itself follows the theme-transition mask like everything else).
    color = mix(color, mix(uLightenColorOld, uLightenColor, tmNew), clamp(vTrampleLighten * uLightenAmount, 0.0, 1.0));

    // Dissolve layer — semi-transparent (alpha) or dithered cut-out.
    float grassAlpha = 1.0;
    float dissolve = clamp(vTrampleDissolve * uDissolveAmount, 0.0, 1.0);
    if (dissolve > 0.0) {
        if (uDissolveMode < 0.5) {
            grassAlpha = 1.0 - dissolve;
        } else if (shouldDiscard(gl_FragCoord.xy, uPixelSize, dissolve)) {
            discard;
        }
    }

    // Music-character see-through: discard grass that sits in FRONT of a sheep (closer than it) and
    // inside its screen disc, so the companion shows through. Paintery edge via the same brush.
    float charSt = 0.0;
    for (int i = 0; i < MAX_CHAR_ST; i++) {
        if (i >= uCharSeeThroughCount) break;
        vec4 c = uCharSeeThrough[i];
        if (c.z <= 0.0) continue; // inactive slot
        if (length(vWorldPosition - cameraPosition) >= c.w - 0.5) continue; // behind the sheep → keep grass
        float sd = length(gl_FragCoord.xy - c.xy) / max(c.z, 1.0);
        charSt = max(charSt, 1.0 - smoothstep(0.35, 1.0, sd));
    }
    if (charSt > 0.0) {
        float charBrush = samplePainteryBrush(vWorldPosition.xz);
        if (charSt > charBrush) discard;
    }

    float borderFade = 1.0 - vGrassData.y;

    // The border-fade target is the SKY colour, which is themed — mix it by the mask so the far
    // grass doesn't snap toward the new sky at the click.
    vec3 fadeBg = mix(uBackgroundColorOld, uBackgroundColor, tmNew);
    if (uFadeMode == 1) {
        color = mix(color, fadeBg, borderFade);
    }

    // Only dither styles configured to use the legacy border fade.
    if (uFadeMode == 0 && vGrassData.y < 0.99) {
        // Determine fade value (0 = opaque, 1 = transparent)
        // vGrassData.y goes from 1 (opaque) to 0 (transparent)
        float fade = borderFade;

        if (shouldDiscard(gl_FragCoord.xy, uPixelSize, fade)) {
            discard;
        }
    }

    // Paintery edge — screen-space brush texture as the dissolve threshold (coherent
    // across blades) with a gentle world drift. Matches the ground's portal edge.
    if (uFadeMode == 2 && borderFade > 0.0) {
        float painteryBrush = samplePainteryBrush(vWorldPosition.xz);
        color = mix(color, fadeBg, smoothstep(painteryBrush - uPainteryBleed, painteryBrush, borderFade));
        if (borderFade > painteryBrush) discard;
    }

    // Lantern grass interaction: tint + fade the grass near the lantern (scale handled in vertex).
    if (vLanternInfluence > 0.0) {
        color = mix(color, uLanternGrassColor, vLanternInfluence * uLanternGrassColorAmount);
        grassAlpha *= 1.0 - vLanternInfluence * uLanternGrassAlpha;
    }

    // Whole-field fade (loading/GO screens → gameplay). Fully hidden → skip the blend entirely.
    if (uGrassGlobalAlpha < 0.004) discard;
    grassAlpha *= uGrassGlobalAlpha;

    gl_FragColor = vec4(color, grassAlpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
