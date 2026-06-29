// Procedural cartoon eyes drawn on a small quad in front of the hero's face: two yellow circles
// with a big wobbly (perlin) border, each holding a squished black pupil with its own perlin
// border, and a vertical-lid blink. Everything outside the eyes is transparent (alpha 0) so the
// face shows through.
precision highp float;

varying vec2 vUv;

uniform vec3 uEyeColor;
uniform vec3 uPupilColor;
uniform float uEyeRadius;
uniform float uEyeSpacing;
uniform float uEyeOffsetY;
uniform float uEyeAspect; // 1 = round; <1 squished horizontally
uniform float uEyeNoiseScale;
uniform float uEyeNoiseStrength;
uniform float uPupilWidth;
uniform float uPupilHeight;
uniform float uPupilOffsetX;
uniform float uPupilOffsetY;
uniform float uPupilNoiseScale;
uniform float uPupilNoiseStrength;
uniform float uEyeEdgeSoftness;
uniform float uEyeBlink; // 0 = open, 1 = shut

// --- Ashima 2D simplex noise (perlin-like, smooth) -------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
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
    vec2 uv = vUv - 0.5; // centre the quad, range ~[-0.5, 0.5]

    // Two eyes mirrored about x = 0; pick the nearer eye's local frame.
    float side = uv.x < 0.0 ? -1.0 : 1.0;
    vec2 p = uv - vec2(side * uEyeSpacing * 0.5, uEyeOffsetY);

    // Yellow eyeball: a circle with a big wobbly border, normalised so r = 1 at the edge.
    vec2 pe = p / vec2(max(uEyeRadius * uEyeAspect, 1e-3), max(uEyeRadius, 1e-3));
    float r = length(pe);
    float eyeEdge = 1.0 + snoise(pe * uEyeNoiseScale) * uEyeNoiseStrength;
    float eyeMask = 1.0 - smoothstep(eyeEdge - uEyeEdgeSoftness, eyeEdge, r);

    // Blink: top + bottom lids close over a vertical aperture (full circle at open, nothing shut).
    float aperture = (1.0 - uEyeBlink) * uEyeRadius;
    float lidSoft = max(uEyeRadius * uEyeEdgeSoftness, 1e-4);
    float lid = 1.0 - smoothstep(aperture - lidSoft, aperture, abs(p.y));
    eyeMask *= lid;

    // Squished black pupil with its own perlin border.
    vec2 pp = (p - vec2(uPupilOffsetX, uPupilOffsetY)) / vec2(max(uPupilWidth, 1e-3), max(uPupilHeight, 1e-3));
    float rp = length(pp);
    float pupilEdge = 1.0 + snoise(pp * uPupilNoiseScale + 11.3) * uPupilNoiseStrength;
    float pupilMask = 1.0 - smoothstep(pupilEdge - uEyeEdgeSoftness, pupilEdge, rp);

    vec3 color = mix(uEyeColor, uPupilColor, pupilMask);
    float alpha = eyeMask; // the pupil only shows where the (lidded) eyeball is opaque
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
}
