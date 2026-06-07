uniform sampler2D originalBuffer;
uniform sampler2D displacedBuffer;
uniform sampler2D tensorBuffer;
uniform sampler2D kuwaharaBuffer;
uniform float filterStrength;
uniform int debugMode;
uniform int sensorNoiseEnabled;
uniform float luminanceNoise;
uniform float chromaNoise;
uniform float sensorNoiseScale;
uniform vec2 resolution;
uniform float noiseSeed;

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233)) + noiseSeed * 23.17) * 43758.5453);
}

void main() {
    vec3 originalColor = texture2D(originalBuffer, vUv).rgb;
    vec3 displacedColor = texture2D(displacedBuffer, vUv).rgb;
    vec3 tensorColor = texture2D(tensorBuffer, vUv).rgb;
    vec3 kuwaharaColor = texture2D(kuwaharaBuffer, vUv).rgb;
    vec3 color = mix(displacedColor, kuwaharaColor, filterStrength);

    if (sensorNoiseEnabled == 1 && debugMode == 0) {
        vec2 noiseCoord = floor(gl_FragCoord.xy / max(sensorNoiseScale, 1.0));
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
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
