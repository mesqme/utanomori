uniform sampler2D inputBuffer;
uniform vec2 resolution;
uniform float largeNoiseScale;
uniform float largeNoiseStrength;
uniform float fineNoiseScale;
uniform float fineNoiseStrength;
uniform float noiseSeed;

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7)) + noiseSeed * 19.19) * 43758.5453123);
}

float valueNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    local = local * local * (3.0 - 2.0 * local);

    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));

    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

void main() {
    vec2 aspectUv = vec2(vUv.x * resolution.x / max(resolution.y, 1.0), vUv.y);
    vec2 largeOffset = vec2(
        valueNoise(aspectUv * largeNoiseScale),
        valueNoise(aspectUv * largeNoiseScale + vec2(31.7, 11.3))
    ) * 2.0 - 1.0;
    vec2 fineOffset = vec2(
        valueNoise(aspectUv * fineNoiseScale + vec2(7.1, 53.2)),
        valueNoise(aspectUv * fineNoiseScale + vec2(67.4, 19.8))
    ) * 2.0 - 1.0;

    vec2 displacedUv = vUv + (largeOffset * largeNoiseStrength + fineOffset * fineNoiseStrength) / resolution;
    gl_FragColor = texture2D(inputBuffer, clamp(displacedUv, vec2(0.0), vec2(1.0)));
}
