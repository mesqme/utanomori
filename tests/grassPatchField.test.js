import test from 'node:test'
import assert from 'node:assert/strict'

import { getGrassPatchCell, sampleGrassPatchField } from '../src/world/utils/grassPatchField.js'

const parameters = {
    worldSeed: 9187,
    spacing: 2.6,
    jitter: 0.68,
    domainWarpScale: 0.12,
    domainWarpStrength: 0.45,
}

test('grass patch cells and samples are deterministic', () => {
    assert.deepEqual(getGrassPatchCell(-3, 8, parameters), getGrassPatchCell(-3, 8, parameters))
    assert.deepEqual(sampleGrassPatchField(7.25, -11.75, parameters), sampleGrassPatchField(7.25, -11.75, parameters))
})

test('sampling is independent from chunk ownership', () => {
    const leftChunkSample = sampleGrassPatchField(4.50001, -2.25, parameters)
    const rightChunkSample = sampleGrassPatchField(4.50001, -2.25, parameters)
    assert.deepEqual(leftChunkSample, rightChunkSample)
})

test('different patch cells retain independent stable seeds', () => {
    const first = getGrassPatchCell(1, 2, parameters)
    const second = getGrassPatchCell(2, 2, parameters)
    const changedFirstCoordinates = getGrassPatchCell(1, 3, parameters)
    const unchangedSecond = getGrassPatchCell(2, 2, parameters)

    assert.notEqual(first.seed, second.seed)
    assert.notEqual(first.seed, changedFirstCoordinates.seed)
    assert.equal(second.seed, unchangedSecond.seed)
})

test('sample multipliers stay inside supported ranges', () => {
    for (let x = -20; x <= 20; x += 0.37) {
        const sample = sampleGrassPatchField(x, x * -0.73, parameters)
        assert.ok(sample.heightMultiplier >= 0.1 && sample.heightMultiplier <= 2)
        assert.ok(sample.widthMultiplier >= 0.1 && sample.widthMultiplier <= 2)
        assert.ok(sample.colorMix >= 0 && sample.colorMix <= 1)
        assert.ok(Number.isInteger(sample.colorFamily) && sample.colorFamily >= 0 && sample.colorFamily < 4)
        assert.ok(sample.borderScale > 0 && sample.borderScale <= 1)
        assert.ok(Number.isFinite(sample.leanStrength))
    }
})

test('internal Perlin variation changes smoothly inside one patch', () => {
    const cell = getGrassPatchCell(3, -2, parameters)
    const first = sampleGrassPatchField(cell.centerX + 0.1, cell.centerZ + 0.1, parameters)
    const nearby = sampleGrassPatchField(cell.centerX + 0.11, cell.centerZ + 0.1, parameters)

    assert.equal(first.patchId, nearby.patchId)
    assert.ok(Math.abs(first.heightMultiplier - nearby.heightMultiplier) < 0.02)
    assert.ok(Math.abs(first.widthMultiplier - nearby.widthMultiplier) < 0.02)
    assert.ok(Math.abs(first.colorMix - nearby.colorMix) < 0.02)
    assert.ok(Math.abs(first.leanStrength - nearby.leanStrength) < 0.02)
})
