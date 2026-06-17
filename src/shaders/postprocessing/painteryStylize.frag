// One-time bake: smooth + threshold the paintery brush texture so its small noisy
// details merge into larger painterly regions before any shader samples it. Runs
// once at load (and when the params change), so it costs nothing per frame.
uniform sampler2D uSource;
uniform vec2 uTexel; // 1 / textureSize
uniform float uBlur; // blur spacing in texels (0 = off)
uniform float uLevelsLow; // input black point
uniform float uLevelsHigh; // input white point
uniform float uContrast; // contrast around 0.5
uniform float uPosterize; // quantization steps (0 = off)

varying vec2 vUv;

void main() {
    float value;

    if (uBlur > 0.0) {
        // 5x5 binomial (gaussian) blur, tap spacing = uBlur texels. Source wraps, so
        // the result stays tileable.
        float weights[5];
        weights[0] = 1.0;
        weights[1] = 4.0;
        weights[2] = 6.0;
        weights[3] = 4.0;
        weights[4] = 1.0;

        float sum = 0.0;
        float weightSum = 0.0;
        for (int y = 0; y < 5; y++) {
            for (int x = 0; x < 5; x++) {
                float w = weights[x] * weights[y];
                vec2 offset = (vec2(float(x), float(y)) - 2.0) * uBlur * uTexel;
                sum += texture2D(uSource, vUv + offset).r * w;
                weightSum += w;
            }
        }
        value = sum / weightSum;
    } else {
        value = texture2D(uSource, vUv).r;
    }

    // Levels — remap [low, high] to [0, 1].
    value = clamp((value - uLevelsLow) / max(uLevelsHigh - uLevelsLow, 0.0001), 0.0, 1.0);

    // Contrast around the midpoint.
    value = clamp((value - 0.5) * uContrast + 0.5, 0.0, 1.0);

    // Posterize into flat bands.
    if (uPosterize >= 2.0) {
        value = floor(value * uPosterize + 0.5) / uPosterize;
    }

    gl_FragColor = vec4(vec3(value), 1.0);
}
