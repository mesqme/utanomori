// Eye-plane vertex: a flat UV-square baked onto a tree canopy, instanced via the BatchedMesh per
// tree. The tree's wind sway is evaluated ONCE at the plane centre and applied to EVERY vertex, so
// the whole plane translates with the canopy (the eye image stays undistorted).
#include <common>
#include <batching_pars_vertex>

uniform vec3 uCircleCenter;
uniform float uCircleRadiusFactor;
uniform float uPropChunkSize;
uniform float uPropFadeOffset;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform float uWindGust;

attribute vec3 aPlaneCenter; // tree-local centre of this plane (same on every vertex)

varying vec2 vUv;
varying float vPropMask;
varying float vPhase;

void main() {
    #include <batching_vertex>
    vUv = uv;

    vec4 batchedPos = vec4(position, 1.0);
    vec4 batchedCenter = vec4(aPlaneCenter, 1.0);
    #ifdef USE_BATCHING
        batchedPos = batchingMatrix * batchedPos;
        batchedCenter = batchingMatrix * batchedCenter;
    #endif
    vec4 worldPosition = modelMatrix * batchedPos;
    vec3 centerWorld = (modelMatrix * batchedCenter).xyz;

    if (uWindStrength > 0.0) {
        float windH = max(aPlaneCenter.y, 0.0);
        float phase = dot(centerWorld.xz, vec2(0.21, 0.13));
        float t = uTime * uWindSpeed;
        float sway = sin(t + phase);
        float gust = mix(1.0, 0.4 + 0.9 * sin(t * 0.27 + phase * 1.7), uWindGust);
        float kick = sin(t * 1.9 + phase * 0.6);
        kick = sign(kick) * pow(abs(kick), 3.0) * uWindGust * 0.4;
        worldPosition.xz += uWindDir * ((sway * gust + kick) * uWindStrength * windH * windH);
    }

    float distanceToCenter = length(centerWorld.xz - uCircleCenter.xz);
    float radius = uPropChunkSize * uCircleRadiusFactor;
    vPropMask = 1.0 - smoothstep(radius - uPropFadeOffset, radius, distanceToCenter);
    vPhase = fract(sin(dot(centerWorld.xz, vec2(12.9898, 78.233))) * 43758.5453);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
