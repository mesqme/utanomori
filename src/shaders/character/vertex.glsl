varying vec3 vObjectPosition;
varying vec3 vObjectNormal;
varying vec3 vInstanceTint;
varying vec2 vUv1; // second UV set (TEXCOORD_1) — the head's front-face layout for the in-shader eyes
varying vec2 vUv; // first UV set (TEXCOORD_0) — mask face texture (uUseBaseTexture)

attribute vec2 uv1;

#include <common>
#include <uv_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>

void main() {
    #include <uv_vertex>
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>

    vObjectNormal = normalize(objectNormal);

    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>

    vObjectPosition = transformed;
    vInstanceTint = vec3(1.0); // skinned meshes carry no per-instance tint
    vUv1 = uv1;
    vUv = uv;

    #include <project_vertex>
}
