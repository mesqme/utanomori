import * as THREE from 'three'

// Shared geometry helpers for the GLB props — stones, mushrooms, trees and the tree eye planes.
// The stone bakers are used by both the scattered terrain stones (ScatteredObjects, batched) and
// the music stones (MusicStones, individual meshes) so they build identically.

// Normalise a geometry to ONE attribute layout: position, normal, uv, aFoliage. Copy only
// those (zero-fill uv when missing, recompute normals if absent). aFoliage tags tree leaves
// so the fragment gives them the painterly edge; everything else (stones) gets the fresnel rim.
export function toCanonicalGeometry(source, foliage, seeThrough = 0, wind = 0, part = 0) {
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
    // aSeeThrough: 1 = this prop fades when it occludes the hero/characters (trees + stones); 0 =
    // never see-throughs (mushrooms). aWind: 1 = sways in the wind (trees only). Consistent
    // attributes on EVERY geometry so the BatchedMesh layout matches.
    const stFlag = new Float32Array(count)
    if (seeThrough) stFlag.fill(1)
    geometry.setAttribute('aSeeThrough', new THREE.BufferAttribute(stFlag, 1))
    const windFlag = new Float32Array(count)
    if (wind) windFlag.fill(1)
    geometry.setAttribute('aWind', new THREE.BufferAttribute(windFlag, 1))
    // aPart: 1 = mushroom LEG (the fragment picks the leg colour + dampened variation for it);
    // 0 everywhere else. Present on every prototype so the BatchedMesh layout stays consistent.
    const partFlag = new Float32Array(count)
    if (part) partFlag.fill(1)
    geometry.setAttribute('aPart', new THREE.BufferAttribute(partFlag, 1))
    // aHeight: 0 at this geometry's bottom → 1 at its top (normalised over its own y-bbox), so the
    // stone fragment can darken the base regardless of the variant's size. Present on every prototype
    // (consistent BatchedMesh layout); only stones actually use it.
    geometry.computeBoundingBox()
    const pos = geometry.getAttribute('position')
    const minY = geometry.boundingBox.min.y
    const rangeY = Math.max(geometry.boundingBox.max.y - minY, 1e-5)
    const heights = new Float32Array(count)
    for (let i = 0; i < count; i++) heights[i] = (pos.getY(i) - minY) / rangeY
    geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1))
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
    const canonical = toCanonicalGeometry(geometry, false, 1) // stones see-through (mushrooms don't)
    geometry.dispose()
    return canonical
}

// Bake a mushroom's cap + leg into two grounded prototypes that stay ASSEMBLED. Unlike
// createStoneGeometry (which grounds each mesh independently to y = 0), the cap and leg
// share ONE recentre/ground offset computed from their COMBINED bounding box — XZ centred
// on the pair, dropped so the leg's base sits at y = 0 — so the cap keeps its height above
// the leg. Returns { cap, leg } canonical geometries.
export function createMushroomGeometries(capNode, legNode) {
    const cap = capNode.geometry.clone()
    capNode.updateWorldMatrix(true, false)
    cap.applyMatrix4(capNode.matrixWorld)
    const leg = legNode.geometry.clone()
    legNode.updateWorldMatrix(true, false)
    leg.applyMatrix4(legNode.matrixWorld)

    cap.computeBoundingBox()
    leg.computeBoundingBox()
    const minX = Math.min(cap.boundingBox.min.x, leg.boundingBox.min.x)
    const maxX = Math.max(cap.boundingBox.max.x, leg.boundingBox.max.x)
    const minY = Math.min(cap.boundingBox.min.y, leg.boundingBox.min.y)
    const minZ = Math.min(cap.boundingBox.min.z, leg.boundingBox.min.z)
    const maxZ = Math.max(cap.boundingBox.max.z, leg.boundingBox.max.z)
    const ox = -(minX + maxX) * 0.5
    const oy = -minY
    const oz = -(minZ + maxZ) * 0.5
    cap.translate(ox, oy, oz)
    leg.translate(ox, oy, oz)

    const capCanonical = toCanonicalGeometry(cap, false)
    const legCanonical = toCanonicalGeometry(leg, false, 0, 0, 1) // aPart=1 → leg colour in the shader
    cap.dispose()
    leg.dispose()
    return { cap: capCanonical, leg: legCanonical }
}

// Bake a tree's trunk + bush into two grounded prototypes that stay ASSEMBLED (shared recentre/
// ground offset from their COMBINED bbox — XZ centred on the pair, dropped so the trunk base sits
// at y = 0), so the bush keeps sitting on the trunk. Both get aSeeThrough=1 (trees fade when they
// occlude) + aWind=1 (sway); the bush gets aFoliage=1 (painterly edge), the trunk aFoliage=0
// (fresnel rim). Returns { trunk, bush } canonical geometries.
export function createTreeGeometries(trunkNode, bushNode) {
    const trunk = trunkNode.geometry.clone()
    trunkNode.updateWorldMatrix(true, false)
    trunk.applyMatrix4(trunkNode.matrixWorld)
    const bush = bushNode.geometry.clone()
    bushNode.updateWorldMatrix(true, false)
    bush.applyMatrix4(bushNode.matrixWorld)

    trunk.computeBoundingBox()
    bush.computeBoundingBox()
    const minX = Math.min(trunk.boundingBox.min.x, bush.boundingBox.min.x)
    const maxX = Math.max(trunk.boundingBox.max.x, bush.boundingBox.max.x)
    const minY = Math.min(trunk.boundingBox.min.y, bush.boundingBox.min.y)
    const minZ = Math.min(trunk.boundingBox.min.z, bush.boundingBox.min.z)
    const maxZ = Math.max(trunk.boundingBox.max.z, bush.boundingBox.max.z)
    const ox = -(minX + maxX) * 0.5
    const oy = -minY
    const oz = -(minZ + maxZ) * 0.5
    trunk.translate(ox, oy, oz)
    bush.translate(ox, oy, oz)

    const trunkCanonical = toCanonicalGeometry(trunk, false, 1, 1)
    const bushCanonical = toCanonicalGeometry(bush, true, 1, 1)
    trunk.dispose()
    bush.dispose()
    // The grounding offset is also applied to the eye planes (createEyePlaneGeometry) so they land in
    // the SAME tree-local space as the bush.
    return { trunk: trunkCanonical, bush: bushCanonical, offset: { x: ox, y: oy, z: oz } }
}

// Bake one tree eye plane (a flat UV-square authored on the canopy) into tree-local space using the
// SAME grounding offset as createTreeGeometries — so the tree's instance matrix maps it onto the
// canopy. Carries the plane's UV (the eye is drawn in [0,1]) + aPlaneCenter (its tree-local centre,
// same on every vertex) so the wind can translate the WHOLE plane (no per-vertex distortion).
export function createEyePlaneGeometry(planeNode, offset) {
    const baked = planeNode.geometry.clone()
    planeNode.updateWorldMatrix(true, false)
    baked.applyMatrix4(planeNode.matrixWorld)
    baked.translate(offset.x, offset.y, offset.z)

    const out = new THREE.BufferGeometry()
    out.setAttribute('position', baked.getAttribute('position').clone())
    if (baked.index) out.setIndex(baked.index.clone())
    const count = out.getAttribute('position').count
    const uv = baked.getAttribute('uv')
    out.setAttribute('uv', uv ? uv.clone() : new THREE.BufferAttribute(new Float32Array(count * 2), 2))
    const normal = baked.getAttribute('normal') // tree-local plane normal (for the camera-facing fade)
    if (normal) out.setAttribute('normal', normal.clone())
    else out.computeVertexNormals()

    baked.computeBoundingBox()
    const c = baked.boundingBox.getCenter(new THREE.Vector3())
    const centers = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        centers[i * 3] = c.x
        centers[i * 3 + 1] = c.y
        centers[i * 3 + 2] = c.z
    }
    out.setAttribute('aPlaneCenter', new THREE.BufferAttribute(centers, 3))
    baked.dispose()
    return out
}
