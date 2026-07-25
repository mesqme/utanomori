import test from 'node:test'
import assert from 'node:assert/strict'

import { chainManagerHandler, preserveManagerHandlers } from '../src/loader/loadingManagerChain.js'

// Stand-in for three's DefaultLoadingManager. The only property that matters here is the one that
// makes the real thing fragile: the four handlers are plain writable slots on a shared singleton.
const createManager = () => ({ onStart: undefined, onProgress: undefined, onLoad: undefined, onError: undefined })

test('chaining keeps the previous handler and runs it first', () => {
    const manager = createManager()
    const calls = []
    manager.onProgress = (...args) => calls.push(['library', ...args])

    chainManagerHandler(manager, 'onProgress', (...args) => calls.push(['ours', ...args]))
    manager.onProgress('stones.glb', 2, 5)

    assert.deepEqual(calls, [
        ['library', 'stones.glb', 2, 5],
        ['ours', 'stones.glb', 2, 5],
    ])
})

test('chaining onto an empty slot does not throw', () => {
    const manager = createManager()
    const seen = []

    chainManagerHandler(manager, 'onLoad', () => seen.push('done'))
    manager.onLoad()

    assert.deepEqual(seen, ['done'])
})

test('a late module assignment orphans the chain, and restore brings it back', () => {
    // The exact regression this guards: a lazily imported module (r3f-perf carries its own copy of
    // drei's useProgress) assigns the slots when it finally evaluates, silently cutting our
    // wrapper out of the singleton. Snapshot around that import and the chain survives.
    const manager = createManager()
    const progress = []
    chainManagerHandler(manager, 'onProgress', (item, loaded, total) => progress.push(loaded / total))

    const restore = preserveManagerHandlers(manager)
    manager.onStart = () => {} // the library's module body evaluating
    manager.onProgress = () => {}
    manager.onError = () => {}

    manager.onProgress('a.mp3', 1, 2)
    assert.deepEqual(progress, [], 'clobbered: our handler stopped receiving progress')

    restore()
    manager.onProgress('a.mp3', 1, 2)
    assert.deepEqual(progress, [0.5], 'restored: our handler receives progress again')
})

test('restore returns every slot, including onError, to its exact prior function', () => {
    const manager = createManager()
    const original = { onStart: () => {}, onProgress: () => {}, onLoad: () => {}, onError: () => {} }
    Object.assign(manager, original)

    const restore = preserveManagerHandlers(manager)
    Object.assign(manager, { onStart: () => {}, onProgress: () => {}, onLoad: () => {}, onError: () => {} })
    restore()

    assert.equal(manager.onStart, original.onStart)
    assert.equal(manager.onProgress, original.onProgress)
    assert.equal(manager.onLoad, original.onLoad)
    assert.equal(manager.onError, original.onError)
})

test('an empty slot is restored to undefined, not to a stub', () => {
    // three guards every call with `!== undefined`, so restoring a no-op function instead of
    // undefined would quietly change its behaviour.
    const manager = createManager()

    const restore = preserveManagerHandlers(manager)
    manager.onStart = () => {}
    restore()

    assert.equal(manager.onStart, undefined)
})
