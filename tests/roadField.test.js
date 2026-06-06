import test from 'node:test'
import assert from 'node:assert/strict'

import { createRoadSampler, getNearestRoadPoint, sampleRoadDirection, sampleRoadDistance, sampleRoadMask } from '../src/world/utils/roadField.js'

const parameters = {
    enabled: true,
    worldSeed: 4242,
    laneSpacing: 24,
    nodeSpacing: 10,
    meanderStrength: 6,
    width: 1.5,
    softness: 0.75,
}

test('road field samples are deterministic', () => {
    assert.equal(sampleRoadDistance(3.25, -18.5, parameters), sampleRoadDistance(3.25, -18.5, parameters))
    assert.equal(sampleRoadMask(3.25, -18.5, parameters), sampleRoadMask(3.25, -18.5, parameters))
    assert.deepEqual(sampleRoadDirection(3.25, -18.5, parameters), sampleRoadDirection(3.25, -18.5, parameters))
})

test('road direction is normalized', () => {
    for (let z = -50; z <= 50; z += 5) {
        const direction = sampleRoadDirection(2.75, z, parameters)
        assert.ok(Math.abs(Math.hypot(direction.x, direction.z) - 1) < 1e-9)
    }
})

test('road mask remains within zero and one', () => {
    for (let x = -30; x <= 30; x += 0.5) {
        const mask = sampleRoadMask(x, x * 0.7, parameters)
        assert.ok(mask >= 0 && mask <= 1)
    }
})

test('road sampling is continuous across render chunk boundaries', () => {
    const epsilon = 0.0001
    const left = sampleRoadMask(4.5 - epsilon, -2.25, parameters)
    const right = sampleRoadMask(4.5 + epsilon, -2.25, parameters)
    assert.ok(Math.abs(left - right) < 0.001)
})

test('changing width does not change road centerline direction', () => {
    const sampler = createRoadSampler(parameters)
    const widerSampler = createRoadSampler({ ...parameters, width: 4 })
    assert.deepEqual(sampler.sampleDirection(11, 23), widerSampler.sampleDirection(11, 23))
})

test('nearest road point lies on the road centerline', () => {
    const nearest = getNearestRoadPoint(8, -13, parameters)
    assert.equal(sampleRoadDistance(nearest.x, nearest.z, parameters), 0)
})

test('disabled road field has no mask or nearest point', () => {
    const disabled = { ...parameters, enabled: false }
    assert.equal(sampleRoadMask(0, 0, disabled), 0)
    assert.equal(sampleRoadDistance(0, 0, disabled), Infinity)
    assert.equal(getNearestRoadPoint(0, 0, disabled), null)
})
