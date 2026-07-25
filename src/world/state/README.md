# world/state

Render-free shared state: plain module-scope objects that several parts of the scene read every
frame, deliberately kept **outside** React and outside the zustand store.

**The rule is one writer, many readers.** Each module is owned by exactly one component, which
mutates it in place during its `useFrame`; everyone else only reads. Nothing here triggers a
re-render, and nothing here is reactive — that is the point. These values change 60 times a
second, and routing them through React state or the store would re-render the scene graph every
frame for data that only shaders and frame loops consume.

| module | written by | read by |
| --- | --- | --- |
| `themeMask` | Terrain (one `updateThemeMask` per frame) | every themed material |
| `trampleField` | MainCharacter, Companions | grass shader |
| `groundShadowField` | MainCharacter, Companions | terrain shader |
| `characterSeeThrough` | MainCharacter, SheepCreature | grass + prop shaders |
| `musicStoneSeeThrough` | MusicStones | prop shader |
| `seeThrough` | DebugPanel (settings) | the see-through writers |
| `revealCircle` | Terrain | props, companions, spawn logic |
| `screenPaintery` | Terrain | prop material |
| `characterHead` | MainCharacter | CharacterEyes |
| `musicStonePointer` | MusicStones | TargetArrow |
| `companionTrail` | MainCharacter | Companions |

Two things follow from that table, and both have been broken before:

- **Do not add a second writer.** When two components wrote the camera rig in different phases,
  the finale broke in a way that looked nothing like its cause.
- **Do not write before you are placed.** A child's `useFrame` runs before its parent has
  positioned the group, so a first-frame write can publish a stale position — which once put a
  see-through hole at the world origin. The writers gate on a warm-up counter for this reason;
  keep it.

Buffers destined for shaders (`trampleField`, `*SeeThrough`, `groundShadowField`) are a single
`Float32Array` uploaded as a `vec4[]` uniform — mutated in place, never reallocated, so three
re-uploads the same object each frame.
