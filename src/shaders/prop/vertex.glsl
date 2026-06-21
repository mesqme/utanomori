#include <common>
#include <batching_pars_vertex>
#include <color_pars_vertex>

uniform vec3 uCircleCenter;
uniform float uCircleRadiusFactor;
uniform float uPropChunkSize;
uniform float uPropFadeOffset;

attribute float aFoliage; // 1 on tree-leaf vertices → painterly edge; 0 elsewhere → fresnel rim

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vPropMask;
varying vec2 vWorldXZ;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vFoliage;

void main() {
    #include <color_vertex>
    #include <batching_vertex>

    // Object-space (per-prototype) position/normal feed the triplanar painterly look.
    vObjectPosition = position;
    vObjectNormal = normalize(normal);
    vFoliage = aFoliage;

    // Apply the BatchedMesh per-instance matrix to reach world space.
    vec4 batchedPosition = vec4(position, 1.0);
    #ifdef USE_BATCHING
        batchedPosition = batchingMatrix * batchedPosition;
    #endif

    vec4 worldPosition = modelMatrix * batchedPosition;
    vWorldXZ = worldPosition.xz;
    vWorldPos = worldPosition.xyz;

    vec3 batchedNormal = normal;
    #ifdef USE_BATCHING
        batchedNormal = mat3(batchingMatrix) * normal;
    #endif
    vWorldNormal = normalize(mat3(modelMatrix) * batchedNormal);
    float distanceToCenter = length(worldPosition.xz - uCircleCenter.xz);
    float radius = uPropChunkSize * uCircleRadiusFactor;
    vPropMask = 1.0 - smoothstep(radius - uPropFadeOffset, radius, distanceToCenter);

    gl_Position = projectionMatrix * modelViewMatrix * batchedPosition;
}
