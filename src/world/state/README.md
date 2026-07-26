# world/state

Render-free shared state: plain module-scope objects that several parts of the scene read every
frame, deliberately kept **outside** React and outside the zustand store.

**The rule is one writer per value, many readers.** Whoever owns a value mutates it in place during
its `useFrame`; everyone else only reads. Nothing here triggers a re-render and nothing here is
reactive — that is the point. These values change 60 times a second, and routing them through React
state or the store would re-render the scene graph every frame for data only shaders and frame
loops consume.

That rule takes two shapes, and the table below shows both. Most modules hold a single value with a
single owning component. Three of them — `trampleField`, `groundShadowField` and
`characterSeeThrough` — are **slot-partitioned buffers** with several writers by design: the hero,
the target spirit and each follower all write, but each owns a fixed index it claims on mount and
releases on unmount. The `TRAMPLE_SLOT_*` constants and `claimCharacterSeeThroughSlot()` are what
keep them apart.

| module | written by | read by |
| --- | --- | --- |
| `themeMask` | Terrain (one `updateThemeMask` per frame) | every themed material |
| `trampleField` | MainCharacter, Companions | grass shader |
| `groundShadowField` | MainCharacter, Companions | terrain shader |
| `characterSeeThrough` | MainCharacter, SheepCreature | grass + prop shaders |
| `musicStoneSeeThrough` | MusicStones | prop shader |
| `seeThrough` | DebugPanel (settings) | the see-through writers |
| `revealCircle` | Terrain | props, companions, spawn logic |
| `screenPaintery` | BackgroundSphere | prop + background materials |
| `characterHead` | MainCharacter | CharacterEyes |
| `musicStonePointer` | MusicStones | TargetArrow |
| `companionTrail` | MainCharacter | Companions |

Two rules follow from that table. Both fail silently:

- **Never write a value someone else writes, and never write a slot you did not claim.** Two
  writers overwrite each other at 60 fps, and the visible fault typically shows up in a different
  system — or a different game phase — from the code that caused it.
- **Do not write before you are placed.** A child's `useFrame` runs before its parent has
  positioned the group, so a first-frame write publishes a stale position. Symptom: a see-through
  hole appears at the world origin and blinks whatever is standing there. The warm-up counters in
  the writers exist for this; keep them.

Buffers destined for shaders (`trampleField`, `*SeeThrough`, `groundShadowField`) are a single
`Float32Array` uploaded as a `vec4[]` uniform — mutated in place, never reallocated, so three
re-uploads the same object each frame.
