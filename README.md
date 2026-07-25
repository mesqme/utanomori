# Utanomori — the forest of songs

A hand-painted night forest you wander through, looking for the spirits who carry a lost melody.
Find one, and it teaches you a phrase on the singing stones; repeat it back and it joins you.
Gather them all and the song is whole.

**Play it: [mesq.me/utanomori](https://mesq.me/utanomori/)** — desktop and mobile, best with headphones.

Built with React Three Fiber for the [Three.js Journey](https://threejs-journey.com/) challenge.

## Running it

```bash
npm install
npm run dev      # vite dev server
npm test         # node --test — field samplers + the loading-manager chain
npm run build    # production build into dist/
```

Append `#debug` to the URL to open the Leva tuning panel (12 sections covering the whole look:
world, props, characters, post-processing, audio, UI). Every value you see there is a live
parameter with a documented default — the scene is tuned entirely through it.

## The look

Everything painterly is done in shaders, not in post: a baked watercolor brush texture sampled in
screen space (so it reads like paint on glass rather than a filter), triplanar-mapped props,
a stylized fresnel rim on hard surfaces, and dithered edges. The only post pass is a display
colour grade plus film grain. Grass is a single instanced draw per chunk with per-blade patch
data baked on the CPU; props are batched meshes.

## Where things live

```
src/
├── index.jsx          entry — deliberately three-free (see below)
├── App.jsx            the lazy half: canvas, HUD, audio wiring
├── Experience.jsx*    the R3F scene graph
│
├── loader/            loading screen + the GO button. Ships in the entry chunk, so nothing
│                      here may import three or @react-three/*.
├── world/             scene behaviour, one component per file (Terrain, MainCharacter,
│   └── utils/         Companions, MusicStones …) plus the shared per-frame state modules
├── materials/         one create<Name>Material / update<Name>Material pair per material
├── shaders/           one folder per effect: background, character, grass, prop, terrain,
│                      eyePlane, postprocessing, and lib/ for shared GLSL
├── postprocessing/    the final pass (colour grade + grain)
│
├── game/              flow and story: phase director, dialogue, the melody mini-game,
│                      the camera rig, and the Web-Audio engines (music, ambience, one-shots)
├── stores/            zustand stores — plumbing only, no tuning values
├── config/            the data layer: DEFAULT_* parameters, scene styles, colour themes,
│                      character and note definitions
├── ui/                DOM overlays (prompts, joystick, links, tutorial)
├── debug/             development-time tuning tools — see debug/README.md
└── assets/            audio, models (.glb), textures
```

\* `Experience.jsx` currently sits in `world/`; it is moving to `src/` as part of an in-progress
structure pass.

## Two things that look odd on purpose

**The entry chunk contains no three.js.** `index.jsx`, everything in `loader/`, plus
`stores/useLoaderShell`, `game/loaderBridge.js` and `config/device.js` are compiled into a ~200 kB
entry bundle that renders the loading screen, while the 1.7 MB world bundle loads behind it. That
is why the loading ring appears almost immediately instead of after the 3D bundle arrives, and why
those files talk to the app through a small bridge instead of importing it. Adding a three import
to any of them silently doubles time-to-first-paint.

Related: `loader/loadingManagerChain.js` explains why progress is *chained* onto three's
`DefaultLoadingManager` rather than assigned — several libraries assign those same handler slots,
and the last one to evaluate wins.

**Shared uniforms have exactly one writer.** Several cross-cutting effects — the theme transition
mask, the see-through discs, the trample field, ground shadows — are plain module-scope objects
(`world/utils/*.js`) that many materials read but exactly **one** component mutates per frame.
Reads are free; writes belong to one owner. The same rule governs the camera: one system owns
`cameraRig` per game phase. Both invariants have been broken before and both times the symptom was
far away from the cause.

## Credits

Music by Aleksandr Manin. Reference artwork by Kei Yotsuba. Course and inspiration:
Bruno Simon's Three.js Journey.
