# Debug

Development-time tooling, reachable through the `#debug` Leva panel.

- **DebugPanel.jsx** — the panel itself: every tweakable value in the game. Read the caveat below
  before touching it.
- **LoaderDebugOverlay** — visual alignment helper for the loading-ring ↔ top-down hat-shot
  illusion (desktop `loaderDebugParameters` and the mobile loader values). Enable via
  Leva ▸ Debug ▸ Loader Debug ▸ `enabled` to nudge the camera target while seeing the ring.

If you are reading the codebase to understand how the game *plays*, the overlay is skippable —
the panel is not.

## The panel's 12 sections

Colors · World · Grass · Props · Characters · Lantern · Game · Audio · Post · Desktop ·
Mobile · Debug

**Registration order == panel order**, so the sequence of `useControls` calls in DebugPanel.jsx
is the layout. Controls write straight into the zustand store via `setParam`;
`LEVA_SECTION_PATHS` is the reverse map (store → Leva) that refreshes the panel when the store
changes from somewhere else — a colour preset, the mobile loader overlay, HMR-restored state.

## Caveat: the panel is not inert

`DebugPanel` is mounted unconditionally as a child of `<Canvas>`, not gated behind `#debug`,
because four things the shipped game depends on happen inside it:

- the once-per-load `applyGlobalTheme` that installs the starting colour theme,
- pushing the see-through defaults into the shared `seeThrough` module,
- writing the ~60 `--ui-*` CSS custom properties on `:root` that size the entire DOM HUD,
- `updateEdgeUniforms`, which feeds the stylized edge material.

Hiding the panel is fine (that is what `<Leva hidden>` does on the plain page); **unmounting it
is not** — the game would lose its theme, its UI sizing and its edge uniforms. Those four
behaviours are scheduled to move to their proper homes, after which this section should say so.
