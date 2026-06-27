// Instanced variant of the character vertex shader — used for the sheep's scales (one leaf
// geometry drawn 36× via InstancedMesh). three's chunks apply `instanceMatrix` automatically
// (USE_INSTANCING is set for InstancedMesh), so the shared character fragment can light it the
// same way as the skinned body. Object-space position/normal feed the triplanar painterly.
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vInstanceTint;

#include <common>

void main() {
    #include <beginnormal_vertex>
    vObjectNormal = normalize(objectNormal);

    #include <begin_vertex>
    vObjectPosition = transformed;

    // Per-instance colour jitter (set via InstancedMesh.setColorAt → instanceColor).
    #ifdef USE_INSTANCING_COLOR
        vInstanceTint = instanceColor;
    #else
        vInstanceTint = vec3(1.0);
    #endif

    #include <project_vertex>
}
