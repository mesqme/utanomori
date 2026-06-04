uniform float uTime;
uniform float uWiggleStrength;
uniform float uWiggleSpeed;
uniform float uWorldNoiseScale;
uniform float uUvWiggleScale;
uniform sampler2D uNoiseTexture;
uniform float uNoiseMix;

varying vec3 vWorldPosition;
varying vec2 vUv1;
varying vec2 vUv;

attribute vec2 uv1;

float csm_noiseTex(vec2 p) {
  return texture2D(uNoiseTexture, p).r;
}

void main() {
  csm_Position = position;
  if (uv1.y >= 0.5) {
    // leaves
    // Wiggle (world + UV noise, blended)
    vec3 worldPosBase = (modelMatrix * vec4(position, 1.0)).xyz;
    float t = uTime * uWiggleSpeed;

    float nWorld = csm_noiseTex(worldPosBase.xz * uWorldNoiseScale + vec2(t, t * 0.73));
    float nUv = csm_noiseTex(uv * uUvWiggleScale + vec2(-t * 0.41, t * 0.29));

    float wWorld = nWorld * 2.0 - 1.0;
    float wUv = nUv * 2.0 - 1.0;
    float wiggle = mix(wWorld, wUv, clamp(uNoiseMix, 0.0, 1.0));

    csm_Position = position + normal * wiggle * uWiggleStrength;
  }
  vUv1 = uv1;
  vUv = uv;
  vec4 worldPos = vec4(csm_Position, 1.0);
  vWorldPosition = (modelMatrix * worldPos).xyz;
}
