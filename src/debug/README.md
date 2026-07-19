# Debug helpers

Nothing in this folder is part of the game logic. These are development-time tuning tools,
reachable only through the `#debug` Leva panel, inert for players:

- **LoaderDebugOverlay** — visual alignment helper for the loading-ring ↔ top-down hat-shot
  illusion (desktop `loaderDebugParameters` and the mobile loader values). Enable via
  Leva ▸ Debug ▸ Loader Debug ▸ `enabled` to nudge the camera target while seeing the ring.

If you are reading the codebase to understand how the game works, you can skip this folder.
