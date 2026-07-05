uniform sampler2D inputBuffer;
uniform vec2 texelSize;
uniform vec2 resolution;
uniform int enabled;
uniform float strength;
uniform int sensorNoiseEnabled;
uniform float luminanceNoise;
uniform float chromaNoise;
uniform float sensorNoiseScale;
uniform float noiseSeed;

// Display color grade (two presets switched on the CPU: high = the normal-brightness-display look
// (desaturated + warmed), low = a gentler eye-comfort look). Identity (no grade) = 1 / 0 / 1.
uniform float uSaturation;
uniform float uWarmth;
uniform float uBrightness;
// Outgoing theme's grade (masked theme transitions): the grade sweeps with the portal/wipe edge
// instead of snapping across the whole screen at the click.
uniform float uSaturationOld;
uniform float uWarmthOld;
uniform float uBrightnessOld;

#include ../lib/themeMask.glsl

varying vec2 vUv;

// Pattern-free hash (Dave Hoskins) — clean, structure-free grain.
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031 + noiseSeed * 0.017);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec3 center = texture2D(inputBuffer, vUv).rgb;
    vec3 color = center;

    // Optional sharpen — runs before grain so the grain stays the untouched top layer.
    if (enabled == 1) {
        vec3 neighbors =
            texture2D(inputBuffer, vUv + vec2(texelSize.x, 0.0)).rgb +
            texture2D(inputBuffer, vUv - vec2(texelSize.x, 0.0)).rgb +
            texture2D(inputBuffer, vUv + vec2(0.0, texelSize.y)).rgb +
            texture2D(inputBuffer, vUv - vec2(0.0, texelSize.y)).rgb;
        vec3 sharpened = center * 5.0 - neighbors;
        color = mix(center, sharpened, strength);
    }

    // Display color grade — applied before grain so the grain stays the untouched top layer. Identity
    // (1 / 0 / 1) is a no-op. brightness scales, saturation pulls toward luma, warmth pushes red up and
    // blue down (counteracts the too-blue / too-saturated look on a normal-brightness display).
    float tmNew = themeMaskNewness();
    color *= mix(uBrightnessOld, uBrightness, tmNew);
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, mix(uSaturationOld, uSaturation, tmNew));
    float warmth = mix(uWarmthOld, uWarmth, tmNew);
    color *= vec3(1.0 + warmth, 1.0, 1.0 - warmth);

    // Film grain — the final layer of the pipeline (nothing filters it afterwards).
    if (sensorNoiseEnabled == 1 && (luminanceNoise > 0.0 || chromaNoise > 0.0)) {
        float grainScale = max(sensorNoiseScale * (resolution.y / 1080.0), 1.0);
        vec2 noiseCoord = floor(gl_FragCoord.xy / grainScale);

        if (luminanceNoise > 0.0) {
            float luminanceVariation = hash(noiseCoord) * 2.0 - 1.0;
            color += luminanceVariation * luminanceNoise;
        }

        if (chromaNoise > 0.0) {
            vec3 chromaVariation = vec3(
                hash(noiseCoord + vec2(17.0, 7.0)),
                hash(noiseCoord + vec2(5.0, 29.0)),
                hash(noiseCoord + vec2(31.0, 13.0))
            ) * 2.0 - 1.0;
            color += chromaVariation * chromaNoise;
        }
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
