#include <common>
#include <color_pars_vertex>

uniform vec3 uCircleCenter;
uniform float uCircleRadiusFactor;
uniform float uPropChunkSize;
uniform float uPropFadeOffset;

attribute float aSeed;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vSeed;
varying float vPropMask;
varying vec2 vWorldXZ;

void main() {
    #include <color_vertex>

    // Object-space position/normal — the eyes are drawn by a front (+Z) projection,
    // so they always face the way the creature is turned.
    vObjectPosition = position;
    vObjectNormal = normalize(normal);
    vSeed = aSeed;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldXZ = worldPosition.xz;
    float distanceToCenter = length(worldPosition.xz - uCircleCenter.xz);
    float radius = uPropChunkSize * uCircleRadiusFactor;
    vPropMask = 1.0 - smoothstep(radius - uPropFadeOffset, radius, distanceToCenter);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
