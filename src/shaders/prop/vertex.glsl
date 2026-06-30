#include <common>
#include <batching_pars_vertex>
#include <color_pars_vertex>

uniform vec3 uCircleCenter;
uniform float uCircleRadiusFactor;
uniform float uPropChunkSize;
uniform float uPropFadeOffset;
uniform float uTime;
uniform vec2 uWindDir;      // world XZ wind direction
uniform float uWindStrength;
uniform float uWindSpeed;
uniform float uWindGust;    // 0 = steady sin sway, 1 = strong gusty / abrupt amplitude

attribute float aFoliage; // 1 on tree-leaf vertices → painterly edge; 0 elsewhere → fresnel rim
attribute float aSeeThrough; // 1 = this prop see-throughs (trees + stones); 0 = solid (mushrooms)
attribute float aWind; // 1 = sways in the wind (trees); 0 = static (stones, mushrooms)
attribute float aHeight; // 0 = prototype's bottom → 1 = its top (for the stone bottom-darken gradient)

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying float vPropMask;
varying vec2 vWorldXZ;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vFoliage;
varying float vSeeThrough;
varying float vHeight;
varying float vStone; // 1 only for scattered stones (aSeeThrough=1, aWind=0, aFoliage=0)

void main() {
    #include <color_vertex>
    #include <batching_vertex>

    // Object-space (per-prototype) position/normal feed the triplanar painterly look.
    vObjectPosition = position;
    vObjectNormal = normalize(normal);
    vFoliage = aFoliage;
    vSeeThrough = aSeeThrough;
    vHeight = aHeight;
    vStone = (aSeeThrough > 0.5 && aWind < 0.5 && aFoliage < 0.5) ? 1.0 : 0.0;

    // Apply the BatchedMesh per-instance matrix to reach world space.
    vec4 batchedPosition = vec4(position, 1.0);
    #ifdef USE_BATCHING
        batchedPosition = batchingMatrix * batchedPosition;
    #endif

    vec4 worldPosition = modelMatrix * batchedPosition;

    // Wind sway (trees only, aWind = 1): shear the upper vertices along the world wind direction;
    // the bend grows with local height² (a cantilever — base stays planted, canopy moves most).
    // Rhythm (from the backup): a sin sway whose amplitude is gust-modulated, plus sharp kicks, so
    // it's non-sin / abrupt. Phased per-instance by the world position so trees don't move in sync.
    if (aWind > 0.5 && uWindStrength > 0.0) {
        float windH = max(position.y, 0.0);
        float phase = dot(worldPosition.xz, vec2(0.21, 0.13));
        float t = uTime * uWindSpeed;
        float sway = sin(t + phase);
        float gust = mix(1.0, 0.4 + 0.9 * sin(t * 0.27 + phase * 1.7), uWindGust);
        float kick = sin(t * 1.9 + phase * 0.6);
        kick = sign(kick) * pow(abs(kick), 3.0) * uWindGust * 0.4;
        worldPosition.xz += uWindDir * ((sway * gust + kick) * uWindStrength * windH * windH);
    }

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

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
