# Debug helpers

Development-time tuning tools, reachable only through the `#debug` Leva panel:

- **LoaderDebugOverlay** — visual alignment helper for the loading-ring ↔ top-down hat-shot
  illusion (desktop `loaderDebugParameters` and the mobile loader values). Enable via
  Leva ▸ Debug ▸ Loader Debug ▸ `enabled` to nudge the camera target while seeing the ring.

If you are reading the codebase to understand how the game *plays*, you can skip this file —
it is inert for players.

## One caveat: the Leva panel is not inert

The debug **panel** itself (`world/Controls.jsx`, moving here shortly) is a different story. It
is mounted unconditionally, not behind `#debug`, because four things the shipped game depends on
happen inside it:

- the once-per-load `applyGlobalTheme` that installs the starting colour theme,
- pushing the see-through defaults into the shared `seeThrough` module,
- writing the ~60 `--ui-*` CSS custom properties on `:root` that size the entire DOM HUD,
- `updateEdgeUniforms`, which feeds the stylized edge material.

Hiding the panel is fine; **unmounting it is not** — the game loses its theme, its UI sizing and
its edge uniforms. Those four behaviours are scheduled to move out to their proper homes, after
which this file should be updated to say so.
