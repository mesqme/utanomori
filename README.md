# Utanomori

![Utanomori — the hero and three collected spirits in the night forest](public/cover.jpg)

A painterly night-forest game built with React Three Fiber. You walk an endless procedural forest,
find three music spirits, and play each one's melody back on a set of singing stones.

**Live: [mesq.me/utanomori](https://mesq.me/utanomori/)** (desktop + mobile, best with headphones)

Built for the [Three.js Journey](https://threejs-journey.com/) challenge.

## Gameplay

- **WASD**/arrows to walk, **Shift** to run, on-screen joystick on touch.
- An arrow points at the current spirit.
- Press **E** in range of the spirit: music stones rise and the spirit plays a melody.
- Click the stones back in order. Three rounds.
- Win and the spirit follows you.
- Three spirits completes the song, then credits.

## Stack

React 19 · @react-three/fiber v9 · three r177 · zustand · Leva · gsap · postprocessing · vite

## Running it

```bash
npm install
npm run dev      # vite dev server
npm test         # node --test
npm run build    # production build into dist/
npm run preview  # serve dist/ — needed because the build is based at /utanomori/
```

`#debug` in the URL opens the Leva panel.

## Docs

**[ARCHITECTURE.md](ARCHITECTURE.md)** — how the app is assembled. Worth a skim before changing anything.

## Credits and license

[MIT](LICENSE) covers the code and the 3D models. The music, the sound effects and the bundled
font are **not** covered — see [LICENSE](LICENSE) for the full scope note.

Music composed by Aleksandr Manin ([x](https://x.com/ManinAleks) · [site](https://www.maninalex.com/)),
used here with permission. The character concept belongs to Kei Yotsuba ([site](https://yotsubakei.com/)).
