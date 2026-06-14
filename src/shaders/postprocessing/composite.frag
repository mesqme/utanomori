uniform sampler2D originalBuffer;
uniform sampler2D displacedBuffer;
uniform sampler2D tensorBuffer;
uniform sampler2D kuwaharaBuffer;
uniform float filterStrength;
uniform float edgeRestoreStrength;
uniform float edgeRestoreThreshold;
uniform int debugMode;
uniform int sensorNoiseEnabled;
uniform float luminanceNoise;
uniform float chromaNoise;
uniform float sensorNoiseScale;
uniform vec2 resolution;
uniform vec2 texelSize;
uniform float noiseSeed;

varying vec2 vUv;

// Pattern-free hash (Dave Hoskins) — the old sin(dot()) version banded into
// visible diagonal lines; this gives clean, structure-free grain at no extra cost.
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031 + noiseSeed * 0.017);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 getOriginalPositiveEdge() {
    vec3 center = texture2D(originalBuffer, vUv).rgb;
    vec3 neighbors =
        texture2D(originalBuffer, vUv + vec2(texelSize.x, 0.0)).rgb +
        texture2D(originalBuffer, vUv - vec2(texelSize.x, 0.0)).rgb +
        texture2D(originalBuffer, vUv + vec2(0.0, texelSize.y)).rgb +
        texture2D(originalBuffer, vUv - vec2(0.0, texelSize.y)).rgb;
    vec3 sharpened = center * 5.0 - neighbors;
    vec3 positiveEdge = max(sharpened - center, vec3(0.0));
    return max(positiveEdge - vec3(edgeRestoreThreshold), vec3(0.0));
}

void main() {
    vec3 originalColor = texture2D(originalBuffer, vUv).rgb;
    vec3 displacedColor = texture2D(displacedBuffer, vUv).rgb;
    vec3 tensorColor = texture2D(tensorBuffer, vUv).rgb;
    vec3 kuwaharaColor = texture2D(kuwaharaBuffer, vUv).rgb;
    vec3 color = mix(displacedColor, kuwaharaColor, filterStrength);

    if (sensorNoiseEnabled == 1 && debugMode == 0) {
        // Scale the grain cell with resolution so it looks the same at 1080p and 4k.
        float grainScale = max(sensorNoiseScale * (resolution.y / 1080.0), 1.0);
        vec2 noiseCoord = floor(gl_FragCoord.xy / grainScale);
        float luminanceVariation = hash(noiseCoord) * 2.0 - 1.0;
        vec3 chromaVariation = vec3(
            hash(noiseCoord + vec2(17.0, 7.0)),
            hash(noiseCoord + vec2(5.0, 29.0)),
            hash(noiseCoord + vec2(31.0, 13.0))
        ) * 2.0 - 1.0;
        color += luminanceVariation * luminanceNoise + chromaVariation * chromaNoise;
    }

    if (debugMode == 1) {
        color = originalColor;
    } else if (debugMode == 2) {
        color = displacedColor;
    } else if (debugMode == 3) {
        color = tensorColor;
    } else if (debugMode == 4) {
        color = kuwaharaColor;
    } else if (debugMode == 5) {
        color = kuwaharaColor + getOriginalPositiveEdge() * edgeRestoreStrength;
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
