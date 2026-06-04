// Instanced stone shader (vertex)

uniform vec3 uCircleCenter;
uniform float uChunkSize;
uniform sampler2D uNoiseTexture;
uniform float uNoiseStrength;
uniform float uNoiseScale;
uniform float uCircleRadiusFactor;
uniform float uGrassFadeOffset;

uniform vec3 uStoneColor;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vFadeMask; // 1 = fully visible, 0 = fully faded

float saturateValue(float x) {
  return clamp(x, 0.0, 1.0);
}

void main() {
  // Build instanced world matrix
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif

  vec4 worldPosition = m * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  // Approximate world normal (good enough for low-poly stones)
  vNormal = normalize(mat3(m) * normal);

  // Color (optionally modulated by instance color)
  vColor = uStoneColor;

  // Border fade mask (same idea as grass: noisy circle with dither fade in fragment)
  vec2 worldXZ = vWorldPosition.xz;
  vec2 circleXZ = uCircleCenter.xz;
  float distToCircle = length(worldXZ - circleXZ);

  vec2 noiseUV = worldXZ * uNoiseScale * 0.1;
  float noiseValue = texture2D(uNoiseTexture, noiseUV).r;
  float noiseOffset = (noiseValue * 2.0 - 1.0) * uNoiseStrength;

  float radius = uChunkSize * uCircleRadiusFactor * (1.0 + noiseOffset);
  vFadeMask = 1.0 - smoothstep(radius - uGrassFadeOffset, radius, distToCircle);
  vFadeMask = saturateValue(vFadeMask);

  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
}
