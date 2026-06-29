// Eye-plane fragment: draws one eye PAIR on the plane's [0,1] UV square (two yellow circles with
// squished pupils, perlin borders, blink + the occasional glance). Everything outside the eyes is
// transparent so only the eyes read on the canopy. Blink/glance are time-driven off a per-plane phase.
precision highp float;

uniform float uTime;
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
uniform float uPupilNoiseScale;
uniform float uPupilNoiseStrength;
uniform float uEdgeSoftness;
uniform float uBlinkInterval;
uniform float uBlinkWidth;
uniform float uLookInterval;
uniform float uLookHold;
uniform float uLookAmount;
uniform float uLookChance;

varying vec2 vUv;
varying float vPropMask;
varying float vPhase;

vec3 emod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 emod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 eperm(vec3 x) { return emod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = emod289(i);
    vec3 p = eperm(eperm(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
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

void main() {
    if (vPropMask <= 0.001) discard; // faded out at the reveal-circle edge

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

    float alpha = emask * vPropMask;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uEyeColor, uPupilColor, pmask), alpha);
    #include <colorspace_fragment>
}
