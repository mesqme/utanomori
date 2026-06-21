import * as THREE from 'three'

// Shared geometry helpers for the GLB stones — used by both the scattered terrain stones
// (ScatteredObjects, batched) and the music stones (MusicStones, individual meshes) so they
// build identically.

// Normalise a geometry to ONE attribute layout: position, normal, uv, aFoliage. Copy only
// those (zero-fill uv when missing, recompute normals if absent). aFoliage tags tree leaves
// so the fragment gives them the painterly edge; everything else (stones) gets the fresnel rim.
export function toCanonicalGeometry(source, foliage) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', source.getAttribute('position').clone())
    if (source.index) geometry.setIndex(source.index.clone())
    const normal = source.getAttribute('normal')
    if (normal) geometry.setAttribute('normal', normal.clone())
    const count = geometry.getAttribute('position').count
    const uv = source.getAttribute('uv')
    geometry.setAttribute('uv', uv ? uv.clone() : new THREE.BufferAttribute(new Float32Array(count * 2), 2))
    if (!normal) geometry.computeVertexNormals()
    const flag = new Float32Array(count)
    if (foliage) flag.fill(1)
    geometry.setAttribute('aFoliage', new THREE.BufferAttribute(flag, 1))
    return geometry
}

// Bake an authored stone mesh into a grounded prototype: apply the node's transform, recentre
// on XZ and drop it so its base sits at y = 0 (so the safe radius is measured around the
// stone's centre and the instance position lands it on the terrain).
export function createStoneGeometry(node) {
    const geometry = node.geometry.clone()
    node.updateWorldMatrix(true, false)
    geometry.applyMatrix4(node.matrixWorld)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    geometry.translate(-(box.min.x + box.max.x) * 0.5, -box.min.y, -(box.min.z + box.max.z) * 0.5)
    const canonical = toCanonicalGeometry(geometry, false)
    geometry.dispose()
    return canonical
}
