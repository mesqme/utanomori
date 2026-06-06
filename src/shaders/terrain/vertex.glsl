varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vRoadDistance;

attribute float aRoadDistance;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  vWorldPosition = worldPos.xyz;
  vUv = uv;
  vRoadDistance = aRoadDistance;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
