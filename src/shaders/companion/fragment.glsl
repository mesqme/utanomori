uniform float uTime;
uniform vec3 uEyeColor;
uniform vec3 uPupilColor;
uniform float uEyeRadius;
uniform float uEyeSize;
uniform float uPupilSize;
uniform float uEyeSpacing;
uniform float uEyeHeight;
uniform int uPainterlyEnabled;
uniform sampler2D uPainterlyTexture;
uniform float uPainterlyScale;
uniform float uPainterlyContrast;
uniform float uPainterlyBrightnessVariation;
uniform vec3 uBackgroundColor;
uniform int uPropFadeMode;
uniform float uPixelSize;
uniform float uPainteryScale;
uniform float uPainteryScreenBlend;
uniform float uPainteryDrift;
uniform float uPainteryLayer2Scale;
uniform float uPainteryBleed;

#include <common>
#include <color_pars_fragment>

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vSeed;
varying float vPropMask;
varying vec2 vWorldXZ;

float samplePainterly(vec3 position, vec3 normalDirection) {
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
    vec3 bodyColor = vColor;
    if (uPainterlyEnabled == 1) {
        float painterlyValue = samplePainterly(vObjectPosition * uPainterlyScale, normalize(vObjectNormal));
        painterlyValue = clamp((painterlyValue - 0.5) * uPainterlyContrast + 0.5, 0.0, 1.0);
        bodyColor *= 1.0 + (painterlyValue * 2.0 - 1.0) * uPainterlyBrightnessVariation;
    }

    vec3 finalColor = bodyColor;

    // Eyes: front (+Z) projection, masked to the front hemisphere.
    vec3 normalDir = normalize(vObjectNormal);
    float frontMask = smoothstep(0.15, 0.55, normalDir.z);
    vec2 faceUv = vObjectPosition.xy / uEyeRadius;

    // Occasional blink (per-creature phase) + gentle pupil drift = cute.
    float blinkPhase = fract(uTime * 0.2 + vSeed);
    float blinkPulse = smoothstep(0.0, 0.03, blinkPhase) * (1.0 - smoothstep(0.03, 0.06, blinkPhase));
    float blink = 1.0 - blinkPulse * 0.9;
    vec2 drift = vec2(sin(uTime * 0.8 + vSeed * 6.2831), sin(uTime * 1.1 + vSeed * 3.1415)) * 0.06;

    float eyeMask = 0.0;
    float pupilMask = 0.0;
    for (int side = -1; side <= 1; side += 2) {
        vec2 eyeCenter = vec2(float(side) * uEyeSpacing, uEyeHeight);
        vec2 d = faceUv - eyeCenter;
        d.y /= max(blink, 0.08);
        eyeMask = max(eyeMask, 1.0 - smoothstep(uEyeSize - 0.04, uEyeSize, length(d)));
        vec2 pd = faceUv - (eyeCenter + drift);
        pd.y /= max(blink, 0.08);
        pupilMask = max(pupilMask, 1.0 - smoothstep(uPupilSize - 0.03, uPupilSize, length(pd)));
    }

    finalColor = mix(finalColor, uEyeColor, eyeMask * frontMask);
    finalColor = mix(finalColor, uPupilColor, pupilMask * frontMask);

    // Reveal-circle fade — colour, dithered, or paintery, matching the world.
    float fade = 1.0 - vPropMask;
    if (uPropFadeMode == 1) {
        if (vPropMask <= 0.001) discard;
        finalColor = mix(uBackgroundColor, finalColor, vPropMask);
    } else if (uPropFadeMode == 2) {
        vec2 painteryUv = mix(vWorldXZ * uPainteryDrift, gl_FragCoord.xy * uPainteryScale, uPainteryScreenBlend);
        float painteryBrush = texture2D(uPainterlyTexture, painteryUv).r;
        painteryBrush = mix(painteryBrush, texture2D(uPainterlyTexture, painteryUv * uPainteryLayer2Scale + vec2(0.37)).r, 0.5);
        finalColor = mix(finalColor, uBackgroundColor, smoothstep(painteryBrush - uPainteryBleed, painteryBrush, fade));
        if (fade > painteryBrush) discard;
    } else {
        if (fade >= 0.999 || (fade > 0.0 && bayerDither(gl_FragCoord.xy, uPixelSize) < fade)) discard;
    }

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);

    #include <colorspace_fragment>
}
