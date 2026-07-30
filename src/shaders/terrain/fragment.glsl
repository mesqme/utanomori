#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

uniform vec3 uBaseColor;
uniform vec3 uBackgroundColor;
uniform vec3 uBackgroundColorOld; // outgoing theme's sky (masked transitions — border fade target)
uniform float uBaseBrightness;
// Outgoing theme (masked theme transitions — the ground keeps moving on both sides of the edge).
uniform vec3 uBaseColorOld;
uniform float uBaseBrightnessOld;

#include ../includes/themeMask.glsl
uniform vec3 uCircleCenter;
uniform float uPatchSize;
uniform float uCircleRadiusFactor;
uniform float uGroundOffset;
uniform float uGroundFadeOffset;
uniform int uFadeMode;
uniform sampler2D uPainteryTexture;
uniform float uPainteryDrift;
uniform float uPainteryLayer2Scale;
uniform sampler2D uNoiseTexture;
uniform float uNoiseStrength;
uniform float uNoiseScale;
uniform sampler2D uGroundTexture;
uniform int uGroundTextureEnabled;
uniform float uGroundTextureScale;
uniform float uGroundTextureContrast;
uniform float uGroundTextureContrastOld; // outgoing theme's value (masked transitions)
uniform int uRoadEnabled;
uniform float uRoadWidth;
uniform float uRoadSoftness;
uniform float uRoadGroundBrightness;
uniform float uRoadGroundNoiseScale;
uniform float uRoadGroundNoiseStrength;
uniform float uRoadGroundEdgeSharpness;
uniform vec3 uLanternPosition;
uniform float uLanternLightRadius;
uniform float uLanternLightEdgeSoftness;
uniform float uLanternLightNoiseScale;
uniform float uLanternLightNoiseStrength;
uniform float uLanternLightInnerBrightness;
uniform float uLanternLightOuterDarkness;
uniform float uPixelSize;
// Character ground shadows: [worldX, worldZ, radius, strength] per character (hero + companions).
#define MAX_GROUND_SHADOWS 6
uniform vec4 uGroundShadows[MAX_GROUND_SHADOWS];
uniform float uShadowRadiusMul;  // global radius multiplier
uniform float uShadowSoftness;   // 0 = hard edge, 1 = very soft falloff
uniform float uShadowDarkness;   // global strength multiplier

// Varyings
varying vec3 vWorldPosition;
varying float vRoadDistance;

// --- Dither Functions ---

// Reconstruct an approximated world position at the *big-pixel cell center*.
// This makes world-space masks (like the circle fade) snap to the same screen
// grid as the dithering, preventing big pixels from being "sliced" at the edge.
vec3 getWorldAtBigPixelCenter(vec3 worldPos, vec2 fragCoord, float pixelSize) {
    vec2 cellCenter = (floor(fragCoord / pixelSize) + 0.5) * pixelSize;
    vec2 delta = cellCenter - fragCoord; // in screen pixels
    return worldPos + dFdx(worldPos) * delta.x + dFdy(worldPos) * delta.y;
}

#include ../includes/dither.glsl

void main() {
    vec2 worldXZ = vWorldPosition.xz;
    vec2 fadeWorldXZ = worldXZ;
    if (uFadeMode == 0) {
        fadeWorldXZ = getWorldAtBigPixelCenter(vWorldPosition, gl_FragCoord.xy, uPixelSize).xz;
    }
    vec2 circleXZ = uCircleCenter.xz;

    float distToCircle = length(fadeWorldXZ - circleXZ);

    // Sample noise texture at world position
    vec2 noiseUV = worldXZ * uNoiseScale * 0.1;
    float noiseValue = texture2D(uNoiseTexture, noiseUV).r;

    // Remap noise from [0, 1] to [-1, 1] and apply strength
    float noiseOffset = (noiseValue * 2.0 - 1.0) * uNoiseStrength;

    float innerRadius = uPatchSize * uCircleRadiusFactor * (1.0 + noiseOffset);
    float groundRadius = innerRadius + uGroundOffset;
    float groundFadeRadius = groundRadius + uGroundFadeOffset;

    float t = smoothstep(groundRadius, groundFadeRadius, distToCircle);

    // Apply Dithering
    if (uFadeMode == 0 && t > 0.0) {
        float fade = t;

        if (shouldDiscard(gl_FragCoord.xy, uPixelSize, fade)) {
            discard;
        }
    }

    // Masked theme transition: outgoing → live palette per fragment (inactive → tmNew = 1).
    float tmNew = themeMaskNewness();
    vec3 color = mix(uBaseColorOld, uBaseColor, tmNew) * mix(uBaseBrightnessOld, uBaseBrightness, tmNew);
    if (uGroundTextureEnabled == 1) {
        vec3 groundSample = texture2D(uGroundTexture, worldXZ * uGroundTextureScale).rgb;
        float groundValue = dot(groundSample, vec3(0.299, 0.587, 0.114));
        float groundVariation = (groundValue - 0.5) * 2.0;
        color *= 1.0 + groundVariation * mix(uGroundTextureContrastOld, uGroundTextureContrast, tmNew);
    }
    color = clamp(color, 0.0, 1.0);

    if (uRoadEnabled == 1) {
        float roadNoise = texture2D(uNoiseTexture, worldXZ * uRoadGroundNoiseScale * 0.1).r * 2.0 - 1.0;
        float noisyRoadDistance = vRoadDistance + roadNoise * uRoadGroundNoiseStrength;
        float roadInnerRadius = uRoadWidth * 0.5;
        float roadSoftness = max(uRoadSoftness * mix(1.0, 0.05, uRoadGroundEdgeSharpness), 0.0001);
        float roadMask = 1.0 - smoothstep(roadInnerRadius, roadInnerRadius + roadSoftness, noisyRoadDistance);
        color = clamp(color * (1.0 + roadMask * uRoadGroundBrightness), 0.0, 1.0);
    }

    vec2 lanternNoiseUV = worldXZ * uLanternLightNoiseScale * 0.1;
    float lanternNoise = texture2D(uNoiseTexture, lanternNoiseUV).r * 2.0 - 1.0;
    float lanternNoisyRadius = uLanternLightRadius * (1.0 + lanternNoise * uLanternLightNoiseStrength);
    float lanternDistance = length(worldXZ - uLanternPosition.xz);
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

    // Character ground shadows — soft dark circles under the hero + companions, drawn directly in the
    // opaque ground so they never have the transparent-decal sorting issues the old shadow meshes did.
    for (int i = 0; i < MAX_GROUND_SHADOWS; i++) {
        vec4 sh = uGroundShadows[i];
        if (sh.z <= 0.0001 || sh.w <= 0.0) continue; // inactive
        float shadowR = sh.z * uShadowRadiusMul;
        float shadowInner = clamp(1.0 - uShadowSoftness, 0.0, 0.99); // softness → falloff band
        float shadowDist = length(worldXZ - sh.xy);
        float shadowMask = 1.0 - smoothstep(shadowR * shadowInner, shadowR, shadowDist);
        color *= 1.0 - sh.w * uShadowDarkness * shadowMask;
    }

    // The border-fade target is the SKY colour, which is themed — mix it by the mask so the far
    // edge of the ground doesn't snap toward the new sky at the click.
    vec3 fadeBg = mix(uBackgroundColorOld, uBackgroundColor, tmNew);
    if (uFadeMode == 1) {
        color = mix(color, fadeBg, t);
    }

    // Paintery edge — a seamless brush (alpha) texture used as the dissolve threshold, so the
    // ground border tears like a brush stroke instead of ending on a hard circle. A stylized
    // portal edge.
    if (uFadeMode == 2 && t > 0.0) {
        // World-anchored brush: the dissolve is a ground edge, so it must track the world or it
        // swims when the camera zooms (a height resize keeps the vertical FOV, so the world edge
        // slides across a screen-pinned brush). World-anchored = stable on resize, and the strokes
        // regenerate as the reveal circle sweeps past. (Other layers stay screen-space.)
        vec2 painteryUv = worldXZ * uPainteryDrift;
        float painteryBrush = texture2D(uPainteryTexture, painteryUv).r;
        painteryBrush = mix(painteryBrush, texture2D(uPainteryTexture, painteryUv * uPainteryLayer2Scale + vec2(0.37)).r, 0.5);
        color = mix(color, fadeBg, step(painteryBrush, t));
        if (t > painteryBrush) discard;
    }

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
