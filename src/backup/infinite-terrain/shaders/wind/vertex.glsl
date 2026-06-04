uniform float uTime;
uniform float uTimeMultiplier;
uniform float uSpeed;
attribute float aTimeOffset;
varying vec2 vUv;
varying float vTimeOffset;
varying vec3 vWorldPosition;

void main() {
    vUv = uv;
    vTimeOffset = aTimeOffset;
    vec3 p = position;
    float timeMultiplier = uTimeMultiplier * uSpeed;
    float localTime = (uTime + vTimeOffset) * timeMultiplier;
    // p.z += sin(p.x * 1.0 + localTime * 3.0) * 0.1;
    p.y += sin(p.x * 1.0 + localTime * 1.0) * 0.1;

    vec4 worldPosition = modelMatrix * vec4(p, 1.0);
    vWorldPosition = worldPosition.xyz;
    worldPosition.z += sin(worldPosition.x * 1.0 + localTime * 2.0) * 0.2;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
