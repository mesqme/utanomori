// Instanced variant of the character vertex shader — used for the sheep's scales (one leaf
// geometry drawn 36× via InstancedMesh). three's chunks apply `instanceMatrix` automatically
// (USE_INSTANCING is set for InstancedMesh), so the shared character fragment can light it the
// same way as the skinned body. Object-space position/normal feed the triplanar painterly.
varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vInstanceTint;
varying vec2 vUv1; // unused on the sheep (no in-shader eyes) — kept so the varyings match the fragment
varying vec2 vUv; // unused on the scales — kept so the varyings match the fragment

#include <common>

void main() {
    #include <beginnormal_vertex>
    #include <begin_vertex>

    // The triplanar painterly reads vObjectPosition/Normal. Each scale is the SAME leaf geometry, so
    // its raw local position is identical across all 36 instances — sampling that makes the brush
    // repeat per-scale. Instead use the scale's REST position on the body: the instance matrix is
    // recomposed each frame as compose(restPos, restRot*twist, scale), so its translation column
    // (instanceMatrix[3]) is the rest centre — constant under the fur-dance twist. Sampling that
    // locks the brush to the body surface (no swim as the sheep moves or the scales dance), giving a
    // painterly shade per tuft that flows across the body like the skinned hero.
    #ifdef USE_INSTANCING
        vec3 restCentre = instanceMatrix[3].xyz;
        vObjectPosition = restCentre;
        vObjectNormal = normalize(restCentre); // radial ≈ surface normal for the triplanar blend
    #else
        vObjectPosition = transformed;
        vObjectNormal = normalize(objectNormal);
    #endif

    vUv1 = vec2(0.0);
    vUv = vec2(0.0);

    // Per-instance colour jitter (set via InstancedMesh.setColorAt → instanceColor).
    #ifdef USE_INSTANCING_COLOR
        vInstanceTint = instanceColor;
    #else
        vInstanceTint = vec3(1.0);
    #endif

    #include <project_vertex>
}
