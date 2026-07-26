# Debug

Development-time tooling, reachable through the `#debug` Leva panel.

- **DebugPanel.jsx** — the panel itself: every tweakable value in the game. Read the caveat below
  before touching it.
- **LoaderDebugOverlay** — visual alignment helper for the loading-ring ↔ top-down hat-shot
  illusion (desktop `loaderDebugParameters` and the mobile loader values). Its Leva section is
  deliberately **not registered** — the alignment is locked and should not be nudged by accident.
  The overlay and its parameters are intact: to tune it again, set `enabled: true` in
  `DEFAULT_LOADER_DEBUG_PARAMETERS` (`config/parameterDefaults.js`), or re-add a
  `useControls('Debug.Loader Debug', …)` block using the `Loader Debug` map that
  `controls/levaSectionPaths.js` still carries.

Note that `loaderDebugParameters` is **live shipped config** despite the name — `targetX/Z`,
`circleRadius`, `ringWidth` and `cameraHeight` drive the real loading ring and the locked hat shot
on every run. Only `enabled`/`nudgeStep` and the overlay itself are debug.

If you are reading the codebase to understand how the game *plays*, the overlay is skippable —
the panel is not.

## The panel's 13 sections

Debug · Colors · World · Grass · Props · Characters · Lantern · Game · Audio · See-Through ·
Post · Desktop · Mobile

**Registration order == panel order**, so the sequence of `useControls` calls in DebugPanel.jsx
is the layout. Controls write straight into the zustand store via `setParam`;
`LEVA_SECTION_PATHS` is the reverse map (store → Leva) that refreshes the panel when the store
changes from somewhere else — a colour preset, the mobile loader overlay, HMR-restored state.

## Caveat: the panel is not inert

`DebugPanel` is mounted unconditionally as a child of `<Canvas>`, not gated behind `#debug`,
because four things the shipped game depends on run from inside it. Three now live in named hooks
of their own, but this component is still their only caller:

| behaviour | lives in |
| --- | --- |
| installs the starting colour theme on load | `world/useInitialTheme.js` |
| seeds the shared `seeThrough` settings | `world/useSeeThroughDefaults.js` |
| writes the 44 CSS custom properties that size the entire DOM UI | `ui/useUiCssVariables.js` |
| feeds the stylized edge material | `updateEdgeUniforms`, still inline |

Hiding the panel is fine — that is what `<Leva hidden>` does on the plain page. **Unmounting it, or
lazy-loading it behind `#debug`, is not:** the game loses its theme, its see-through tuning and
every UI dimension, with no error to tell you why.
