varying vec3 vWorldPosition;
varying float vRoadDistance;

attribute float aRoadDistance;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  vWorldPosition = worldPos.xyz;
  vRoadDistance = aRoadDistance;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
