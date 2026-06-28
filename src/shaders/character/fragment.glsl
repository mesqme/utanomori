uniform vec3 uBaseColor;
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

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vInstanceTint; // per-instance colour jitter (sheep scales); vec3(1) everywhere else

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

void main() {
    float painterlyValue = 0.5;
    vec3 finalColor = uBaseColor * vInstanceTint;
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
