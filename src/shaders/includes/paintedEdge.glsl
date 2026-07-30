// Soft brushy silhouette dissolve. The contour (where the surface turns
// away from the camera) dissolves into the background through the brush noise, for a
// thin painterly oil/pastel edge. Shared by the character and prop materials.
uniform int uEdgeEnabled;
uniform int uEdgeMode; // 0 = alpha blend, 1 = dither (alpha test)
uniform vec3 uEdgeColor;
uniform vec3 uEdgeColorOld; // outgoing theme's edge colour (masked theme transitions)
uniform float uEdgeTint; // tint toward uEdgeColor near the contour
uniform float uEdgeWidth; // extra rim extent (in N·V units, ×0.02)
uniform float uEdgeBias; // base rim extent (N·V threshold)
uniform float uEdgeSoftness; // alpha-mode dissolve softness
uniform float uEdgeNoiseScale; // brush sampling scale on the rim
uniform float uEdgeSharpness; // rim power: >1 concentrates the edge at the true silhouette

#define EDGE_WIDTH_TO_NDV 0.02

// 1 at the silhouette (surface edge-on to the camera), 0 in the interior. A pure N·V
// band — no screen-space derivative — so it's resolution-independent AND temporally
// stable: a tiny camera drift changes N·V smoothly instead of making fwidth jump, so
// the dither edge no longer crawls while the camera lerp settles. On rounded surfaces
// N·V changes slowly near the silhouette, so the raw band reads thick — `uEdgeSharpness`
// powers the rim to pull the edge back to a thin line at the contour.
float silhouetteRim(vec3 worldNormal, vec3 worldPosition) {
    vec3 viewDir = normalize(cameraPosition - worldPosition);
    float ndv = abs(dot(normalize(worldNormal), viewDir));
    float w = uEdgeBias + uEdgeWidth * EDGE_WIDTH_TO_NDV;
    float rim = clamp(1.0 - smoothstep(0.0, w, ndv), 0.0, 1.0);
    return pow(rim, max(uEdgeSharpness, 0.001));
}

// Tints finalColor near the contour and returns the fragment alpha. In dither mode it
// discards stippled fragments (opaque-safe). `brush` is the painterly noise [0..1].
// `maskNewness` blends the outgoing→live edge colour during a masked theme transition (the
// props pass their per-fragment themeMask value; other users call the 4-arg overload = 1.0).
float paintedEdgeAlpha(inout vec3 finalColor, vec3 worldNormal, vec3 worldPosition, float brush, float maskNewness) {
    if (uEdgeEnabled == 0) return 1.0;

    float rim = silhouetteRim(worldNormal, worldPosition);
    if (rim <= 0.0) return 1.0;

    // Darken/tint the contour before it dissolves.
    vec3 edgeColor = mix(uEdgeColorOld, uEdgeColor, maskNewness);
    finalColor = mix(finalColor, edgeColor, smoothstep(0.0, 1.0, rim) * uEdgeTint);

    if (uEdgeMode == 1) {
        // Dither: the brush is the threshold → a stippled, opaque-safe dissolve that
        // lets the background show through the holes.
        if (rim > brush) discard;
        return 1.0;
    }

    // Alpha: brushy fade to transparent where the rim crosses the local brush value.
    return 1.0 - smoothstep(brush - uEdgeSoftness, brush + uEdgeSoftness, rim);
}

// 4-arg overload for materials without the theme mask (the character): live edge colour only.
float paintedEdgeAlpha(inout vec3 finalColor, vec3 worldNormal, vec3 worldPosition, float brush) {
    return paintedEdgeAlpha(finalColor, worldNormal, worldPosition, brush, 1.0);
}
