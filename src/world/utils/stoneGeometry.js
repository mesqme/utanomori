import * as THREE from 'three'

// Shared geometry helpers for the GLB stones — used by both the scattered terrain stones
// (ScatteredObjects, batched) and the music stones (MusicStones, individual meshes) so they
// build identically.

// Normalise a geometry to ONE attribute layout: position, normal, uv, aFoliage. Copy only
// those (zero-fill uv when missing, recompute normals if absent). aFoliage tags tree leaves
// so the fragment gives them the painterly edge; everything else (stones) gets the fresnel rim.
export function toCanonicalGeometry(source, foliage, seeThrough = 0, wind = 0) {
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

// Bake a music stone + its surrounding `_circle` ring into two grounded geometries that stay
// ALIGNED. The stone is grounded exactly like createStoneGeometry (XZ-centred, base at y = 0);
// the circle gets the SAME offset (computed from the STONE's bbox), so when the circle is
// parented to the stone it keeps its authored position around it. `circleNode` may be null
// (then `circle` is null). Returns { stone, circle } canonical geometries.
export function createMusicStoneGeometry(stoneNode, circleNode) {
    const stone = stoneNode.geometry.clone()
    stoneNode.updateWorldMatrix(true, false)
    stone.applyMatrix4(stoneNode.matrixWorld)
    stone.computeBoundingBox()
    const box = stone.boundingBox
    const ox = -(box.min.x + box.max.x) * 0.5
    const oy = -box.min.y
    const oz = -(box.min.z + box.max.z) * 0.5
    stone.translate(ox, oy, oz)
    const stoneCanonical = toCanonicalGeometry(stone, false)
    stone.dispose()

    let circleCanonical = null
    if (circleNode) {
        const circle = circleNode.geometry.clone()
        circleNode.updateWorldMatrix(true, false)
        circle.applyMatrix4(circleNode.matrixWorld)
        circle.translate(ox, oy, oz) // SAME offset as the stone → stays aligned around it
        circleCanonical = toCanonicalGeometry(circle, false)
        circle.dispose()
    }
    return { stone: stoneCanonical, circle: circleCanonical }
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
    const legCanonical = toCanonicalGeometry(leg, false)
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
    return { trunk: trunkCanonical, bush: bushCanonical }
}
