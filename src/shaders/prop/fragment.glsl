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
uniform float uPainteryScreenBlend;
uniform float uPainteryDrift;
uniform float uPainteryLayer2Scale;
uniform float uPainteryBleed;

#include <common>
#include <color_pars_fragment>

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vPropMask;
varying vec2 vWorldXZ;

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

void main() {
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
        vec2 painteryUv = mix(vWorldXZ * uPainteryDrift, gl_FragCoord.xy / uPainterySize, uPainteryScreenBlend);
        float painteryBrush = texture2D(uPainterlyTexture, painteryUv).r;
        painteryBrush = mix(painteryBrush, texture2D(uPainterlyTexture, painteryUv * uPainteryLayer2Scale + vec2(0.37)).r, 0.5);
        finalColor = mix(finalColor, uBackgroundColor, smoothstep(painteryBrush - uPainteryBleed, painteryBrush, fade));
        if (fade > painteryBrush) discard;
    } else {
        if (fade >= 0.999 || (fade > 0.0 && bayerDither(gl_FragCoord.xy, uPixelSize) < fade)) discard;
    }

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
