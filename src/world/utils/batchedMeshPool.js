import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Convenience wrapper for building ONE BatchedMesh from a set of prototype
 * geometries and adding / removing instances at runtime. It hides the fiddly
 * parts of the BatchedMesh API:
 *   - normalises every prototype to be consistently indexed (BatchedMesh requires
 *     it — polyhedra like IcosahedronGeometry come back non-indexed);
 *   - sizes the vertex / index buffers automatically;
 *   - guards capacity and reuses freed instance slots;
 *   - one `dispose()` for the whole thing.
 *
 * The whole batch renders in ~1 draw call (WebGL multi-draw). Frustum culling is
 * off both for the mesh and per instance — see the note on perObjectFrustumCulled
 * below.
 *
 * Usage:
 *   const pool = createBatchedMeshPool({
 *       material,
 *       maxInstances: 4096,
 *       prototypes: [{ id: 'trunk', geometry, color }, ...], // geometry already in final local space
 *   })
 *   // render: <primitive object={pool.mesh} />   (or scene.add(pool.mesh))
 *   const id = pool.addInstance('trunk', matrix, color)
 *   pool.removeInstance(id)
 *   pool.dispose()
 *
 * The pool copies each prototype's geometry into the batch, so the caller still
 * owns (and should dispose) the geometries it passed in.
 */
export function createBatchedMeshPool({ prototypes, material, maxInstances = 1024 }) {
    const normalized = prototypes.map((prototype) => {
        const geometry = mergeVertices(prototype.geometry) // always indexed + welded
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
        return { id: prototype.id, geometry, color: prototype.color ? new THREE.Color(prototype.color) : null }
    })

    const totalVertices = normalized.reduce((sum, p) => sum + p.geometry.attributes.position.count, 0)
    const totalIndices = normalized.reduce((sum, p) => sum + (p.geometry.index ? p.geometry.index.count : 0), 0)

    const mesh = new THREE.BatchedMesh(maxInstances, totalVertices, totalIndices, material)
    mesh.frustumCulled = false
    // Per-instance frustum culling was dropping on-screen instances during the fast credits
    // camera move (props popping out mid-screen, nowhere near the reveal-fade edge). The whole
    // batch is one multi-draw call and the instance count is bounded (maxInstances), so the cost
    // of always drawing them is negligible — correctness wins here.
    mesh.perObjectFrustumCulled = false
    mesh.sortObjects = false

    const geometryIds = {}
    const prototypeColors = {}
    for (const prototype of normalized) {
        geometryIds[prototype.id] = mesh.addGeometry(prototype.geometry)
        prototypeColors[prototype.id] = prototype.color
        prototype.geometry.dispose() // data is copied into the batch buffers
    }

    let activeCount = 0
    // Track which instance ids are currently alive so a stale / double removal is skipped
    // instead of throwing from BatchedMesh.deleteInstance (which would crash the render loop).
    const liveInstanceIds = new Set()

    return {
        mesh,
        geometryIds,
        prototypeColors,
        get activeCount() {
            return activeCount
        },
        get capacity() {
            return maxInstances
        },

        addInstance(prototypeId, matrix, color) {
            if (activeCount >= maxInstances) return -1
            const geometryId = geometryIds[prototypeId]
            if (geometryId === undefined) return -1

            const instanceId = mesh.addInstance(geometryId)
            if (matrix) mesh.setMatrixAt(instanceId, matrix)
            if (color) mesh.setColorAt(instanceId, color)
            liveInstanceIds.add(instanceId)
            activeCount++
            return instanceId
        },

        setMatrix(instanceId, matrix) {
            // Skip ids that were freed (e.g. a per-frame animation loop still holding a mushroom whose
            // chunk just streamed out, or a stale id left over after an HMR pool rebuild) — otherwise
            // BatchedMesh.setMatrixAt throws "Invalid instanceId" and crashes the render loop.
            if (!liveInstanceIds.has(instanceId)) return
            mesh.setMatrixAt(instanceId, matrix)
        },

        setColor(instanceId, color) {
            if (!liveInstanceIds.has(instanceId)) return
            mesh.setColorAt(instanceId, color)
        },

        removeInstance(instanceId) {
            // Skip stale / already-removed ids (e.g. a chunk released twice) instead of letting
            // BatchedMesh.deleteInstance throw and crash the render loop.
            if (!liveInstanceIds.has(instanceId)) return
            liveInstanceIds.delete(instanceId)
            mesh.deleteInstance(instanceId)
            activeCount = Math.max(0, activeCount - 1)
        },

        dispose() {
            mesh.material.dispose()
            mesh.dispose()
        },
    }
}
