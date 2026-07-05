// Screen-space theme-transition mask, shared by every themed material (grass / terrain / props /
// background). While a Portal / Wipe / Dissolve theme switch runs, each material mixes its OLD
// theme values toward the NEW ones by this per-fragment "newness" (0 = still the old theme,
// 1 = fully the new theme) — the WORLD KEEPS MOVING on both sides of the edge (no frozen frame).
// Same torn brush-threshold edge as the ground border's paintery fade. Inactive → returns 1.
uniform float uThemeMaskActive;
uniform int uThemeMaskShape; // 0 = portal (from centre), 1 = wipe (right → left), 2 = dissolve
uniform int uThemeMaskStyle; // 0 = paintery brush texture, 1 = perlin noise
uniform float uThemeMaskProgress;
uniform vec2 uThemeMaskResolution; // drawing-buffer px (gl_FragCoord space)
uniform sampler2D uThemeMaskBrush;
uniform float uThemeMaskBand;
uniform float uThemeMaskBleed;
uniform float uThemeMaskTexScale;
uniform float uThemeMaskPerlinScale;
uniform int uThemeMaskPerlinDetail;

float tmHash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}
float tmValueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(tmHash(i), tmHash(i + vec2(1.0, 0.0)), f.x),
        mix(tmHash(i + vec2(0.0, 1.0)), tmHash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}
float tmEdgeNoise(vec2 uv) {
    if (uThemeMaskStyle == 0) {
        float brush = texture2D(uThemeMaskBrush, uv * uThemeMaskTexScale).r;
        return mix(brush, texture2D(uThemeMaskBrush, uv * uThemeMaskTexScale * 2.2 + vec2(0.37)).r, 0.5);
    }
    vec2 p = uv * uThemeMaskPerlinScale;
    float value = 0.0;
    float amp = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 5; i++) {
        if (i >= uThemeMaskPerlinDetail) break;
        value += amp * tmValueNoise(p);
        norm += amp;
        p *= 2.03;
        amp *= 0.5;
    }
    return value / max(norm, 0.0001);
}

float themeMaskNewness() {
    if (uThemeMaskActive < 0.5) return 1.0;
    vec2 screenUv = gl_FragCoord.xy / uThemeMaskResolution;
    float aspect = uThemeMaskResolution.x / max(uThemeMaskResolution.y, 1.0);
    float brush = tmEdgeNoise(vec2(screenUv.x * aspect, screenUv.y));

    float t;
    if (uThemeMaskShape == 0) {
        vec2 p = screenUv - 0.5;
        p.x *= aspect;
        float maxR = 0.5 * sqrt(aspect * aspect + 1.0);
        float rN = length(p) / maxR;
        float front = uThemeMaskProgress * (1.0 + uThemeMaskBand);
        t = clamp((front - rN) / max(uThemeMaskBand, 0.0001), 0.0, 1.0);
    } else if (uThemeMaskShape == 1) {
        float front = mix(1.0, -uThemeMaskBand, uThemeMaskProgress);
        t = clamp((screenUv.x - front) / max(uThemeMaskBand, 0.0001), 0.0, 1.0);
    } else {
        t = uThemeMaskProgress;
    }

    // Brush-threshold with bleed (the ground border's paintery fade): newness ramps where the
    // per-pixel progression beats the local noise value.
    return smoothstep(brush - uThemeMaskBleed, brush + 0.0001, t);
}
