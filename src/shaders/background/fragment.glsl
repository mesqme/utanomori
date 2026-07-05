// Layer 1 — base colour (vertical gradient)
uniform vec3 uBackgroundColor; // flat pre-intro colour and final texture mix colour
uniform vec3 uGradientTopColor; // top / zenith gradient colour
uniform vec3 uHorizonColor; // horizon / lower gradient colour
uniform float uGradientIntensity; // 0 = flat base colour, 1 = full vertical gradient
// Outgoing theme (masked theme transitions — the sky keeps moving on both sides of the edge).
uniform vec3 uBackgroundColorOld;
uniform vec3 uGradientTopColorOld;
uniform vec3 uHorizonColorOld;
uniform float uGradientIntensityOld;
uniform float uStarsEnabledOld; // 0/1

#include ../lib/themeMask.glsl
uniform float uGradientHeight; // sky direction.y where the horizon colour sits
uniform float uGradientPower; // gradient curve

// Layer 2 — paintery texture (watercolor), screen space
uniform bool uTextureEnabled;
uniform int uColorMode; // 0 = intensity, 1 = colour mix, 2 = both
uniform sampler2D uTexture;
uniform float uTextureSize;
uniform vec2 uTexturePan; // screen-space drift (device px) faked from camera yaw/pitch
uniform vec2 uResolution; // drawing buffer size (px) — anchor the texture to the screen centre
uniform float uTextureLayer2;
uniform float uTextureContrast; // contrast applied to the texture itself, before use
uniform float uTextureBrightness; // brightness variation
uniform float uTextureMixIntensity; // background colour mix amount

// Layer 3 — stars (direction space, so they stay fixed in the sky)
uniform bool uStarsEnabled;
uniform int uStarStyle; // 0 = stylized (sparkle), 1 = natural (soft points)
uniform float uTime;
uniform float uStarCells; // star grid cells per radian
uniform float uStarDensity;
uniform float uStarSize;
uniform float uStarBrightness;
uniform float uStarTwinkleSpeed;
uniform float uStarRays;
uniform vec3 uStarColor;
uniform vec3 uStarColorOld; // outgoing theme's star tint (masked transitions)
uniform float uStarsFadeStart; // sky direction.y where the star field begins
uniform float uStarsFadeWidth; // span over which density ramps from ~0 to full

// Constellations (sparse seeds, each a short random walk joining bright stars)
uniform bool uConstellationsEnabled;
uniform float uConstellationDensity; // share of cells that seed a constellation (keep low)
uniform float uConstellationBrightness; // line glow
uniform float uConstellationWidth; // line thickness (cell units)

varying vec3 vDir;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    return vec2(n, hash21(p + n));
}

// Distance from point p to the segment a-b.
float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * t);
}

// Density fade by latitude, per cell row so stars don't flicker as the fragment moves.
float latitudeFade(float cellLatId) {
    float y = sin(cellLatId / max(uStarCells, 1e-3));
    return smoothstep(uStarsFadeStart, uStarsFadeStart + max(uStarsFadeWidth, 1e-3), y);
}

// Map a cell-space offset to screen space (keeping its cell-space length), using the
// screen-space derivatives of the sky grid. Lets the sparkle rays line up with the
// screen vertical/horizontal instead of following the curved sphere surface.
vec2 screenAlign(vec2 delta, vec2 dSkyX, vec2 dSkyY, float jdet) {
    vec2 s = vec2(dSkyY.y * delta.x - dSkyY.x * delta.y, -dSkyX.y * delta.x + dSkyX.x * delta.y) / jdet;
    float ls = length(s);
    return ls > 1e-6 ? s * (length(delta) / ls) : delta;
}

// Stylized sparkle (1/x diamond + cross rays) evaluated at a screen-aligned offset.
float sparkle(vec2 r, float size, float rays) {
    float manhattan = abs(r.x) + abs(r.y);
    float core = pow(size / (manhattan + size), 3.0);
    float crossH = pow(size / (abs(r.y) * 4.0 + size), 2.0) * exp(-abs(r.x) * 14.0);
    float crossV = pow(size / (abs(r.x) * 4.0 + size), 2.0) * exp(-abs(r.y) * 14.0);
    return core + (crossH + crossV) * rays;
}

float softPoint(vec2 delta, float size) {
    float d2 = dot(delta, delta);
    return exp(-d2 / max(size * size, 1e-5)) + exp(-d2 / max(size * size * 9.0, 1e-5)) * 0.22;
}

void main() {
    vec3 dir = normalize(vDir);

    // Masked theme transition: the sky blends outgoing → live palette per fragment (tmNew = 1
    // when no transition runs), so the portal/wipe edge crosses the sky too.
    float tmNew = themeMaskNewness();
    vec3 bgColor = mix(uBackgroundColorOld, uBackgroundColor, tmNew);
    vec3 topColor = mix(uGradientTopColorOld, uGradientTopColor, tmNew);
    vec3 horizonColor = mix(uHorizonColorOld, uHorizonColor, tmNew);
    float gradIntensity = mix(uGradientIntensityOld, uGradientIntensity, tmNew);

    // ----- Layer 1: base vertical gradient -----
    float h = clamp((dir.y - uGradientHeight) / max(1.0 - uGradientHeight, 1e-3), 0.0, 1.0);
    h = pow(h, uGradientPower);
    vec3 gradientColor = mix(horizonColor, topColor, h);
    vec3 color = mix(bgColor, gradientColor, clamp(gradIntensity, 0.0, 1.0));

    // ----- Layer 2: paintery texture colour variation (screen space) -----
    if (uTextureEnabled) {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution + uTexturePan) / uTextureSize;
        float brush = texture2D(uTexture, uv).r;
        brush = mix(brush, texture2D(uTexture, uv * uTextureLayer2 + vec2(0.37)).r, 0.5);
        brush = clamp((brush - 0.5) * uTextureContrast + 0.5, 0.0, 1.0); // contrast on the texture itself
        if (uColorMode != 1) {
            color *= 1.0 + (brush - 0.5) * 2.0 * uTextureBrightness;
        }
        if (uColorMode != 0) {
            color = mix(color, bgColor, clamp(brush * uTextureMixIntensity, 0.0, 1.0));
        }
    }

    // ----- Layer 3: stars + constellations -----
    // Stars render if EITHER side of a masked transition has them; their brightness follows the
    // mask so they dissolve across the portal/wipe edge (e.g. night stars fading inside the day).
    float starsOn = mix(uStarsEnabledOld, uStarsEnabled ? 1.0 : 0.0, tmNew);
    vec3 starColor = mix(uStarColorOld, uStarColor, tmNew);
    if (starsOn > 0.001) {
        float lon = atan(dir.z, dir.x);
        float lat = asin(clamp(dir.y, -1.0, 1.0));
        vec2 sky = vec2(lon, lat) * uStarCells;
        vec2 cellId = floor(sky);
        vec2 cellLocal = fract(sky);

        // Screen orientation of the sky grid (for screen-aligned sparkle rays).
        vec2 dSkyX = dFdx(sky);
        vec2 dSkyY = dFdy(sky);
        float jdet = dSkyX.x * dSkyY.y - dSkyY.x * dSkyX.y;
        jdet = abs(jdet) < 1e-6 ? (jdet < 0.0 ? -1e-6 : 1e-6) : jdet;

        vec3 starAccum = vec3(0.0);
        float lines = 0.0;

        for (int yy = -1; yy <= 1; yy++) {
            for (int xx = -1; xx <= 1; xx++) {
                vec2 neighbor = vec2(float(xx), float(yy));
                vec2 id = cellId + neighbor;
                float present = hash21(id);
                if (present > uStarDensity * latitudeFade(id.y)) continue;

                vec2 starPos = neighbor + 0.2 + hash22(id + 1.0) * 0.6;
                vec2 delta = cellLocal - starPos;

                bool isNode = uConstellationsEnabled && hash21(id + 41.0) < uConstellationDensity;

                // Constellation lines: join this node to up to two of its present neighbour
                // stars, so segments always connect real stars and shapes stay clean.
                if (isNode) {
                    int made = 0;
                    for (int dy = -1; dy <= 1; dy++) {
                        for (int dx = -1; dx <= 1; dx++) {
                            if (made >= 2 || (dx == 0 && dy == 0)) continue;
                            vec2 off = vec2(float(dx), float(dy));
                            vec2 idB = id + off;
                            if (hash21(idB) > uStarDensity * latitudeFade(idB.y)) continue;
                            vec2 partnerPos = (neighbor + off) + 0.2 + hash22(idB + 1.0) * 0.6;
                            lines += smoothstep(uConstellationWidth, 0.0, segDist(cellLocal, starPos, partnerPos));
                            made++;
                        }
                    }
                }

                float brightness = hash21(id + 7.0);
                brightness *= brightness; // bias toward faint stars
                if (isNode) brightness = mix(brightness, 1.0, 0.6); // endpoints a bit brighter

                // Desynced twinkle: per-star rate AND phase, sharpened into sparse flares.
                float tRate = uStarTwinkleSpeed * mix(0.4, 1.4, hash21(id + 27.3));
                float s = 0.5 + 0.5 * sin(uTime * tRate + hash21(id + 13.7) * 6.2831);
                float twinkle = mix(0.85, 1.7, pow(s, 4.0));

                if (uStarStyle == 1) {
                    float temp = hash21(id + 3.0);
                    vec3 tint = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.92, 0.82), temp);
                    starAccum += starColor * tint * softPoint(delta, uStarSize) * brightness * twinkle;
                } else {
                    vec2 r = screenAlign(delta, dSkyX, dSkyY, jdet);
                    starAccum += starColor * sparkle(r, uStarSize, uStarRays) * brightness * twinkle;
                }
            }
        }
        color += starAccum * uStarBrightness * starsOn;
        color += starColor * lines * uConstellationBrightness * starsOn;
    }

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
