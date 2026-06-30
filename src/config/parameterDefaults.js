// Single home for the tweakable GLOBAL parameter defaults (the `DEFAULT_*` groups) + their HMR
// version constants. useStore.jsx imports these and only wires them into the store + the hot-reload
// merge — so when you want to change a default value, you change it HERE.
//
// (The painterly scene-style sections — terrain/grass/objects/background/etc. — live separately in
// sceneStyles.js, since they're a per-style "look preset" rather than global feature params.)
import { defaultSceneStyle } from './sceneStyles.js'
import { characterStylizedDefaults } from './stylizedMaterialDefaults.js'
import { sheepCharacterDefaults } from './sheepMaterials.js'

// { piano: { orange:{baseColor}, white:{baseColor}, brown:{baseColor} }, drums:{…}, winds:{…} }
export function cloneSheepCharacters() {
    return Object.fromEntries(
        Object.entries(sheepCharacterDefaults).map(([music, mats]) => [
            music,
            Object.fromEntries(Object.entries(mats).map(([id, color]) => [id, { baseColor: color }])),
        ])
    )
}

// HMR version gates — bump the matching one when its defaults change so a dev hot-reload
// force-applies them instead of keeping the preserved runtime values (which would otherwise mask
// the new defaults). See the merge block in useStore.jsx.
export const GRASS_STYLE_VERSION = 19
export const CHARACTER_STYLIZED_VERSION = 4
// Bump when objectParameters / edgeParameters / propRimParameters defaults change.
export const OBJECT_STYLE_VERSION = 9
export const LOADER_DEBUG_VERSION = 6
export const GAME_UI_VERSION = 14

export const DEFAULT_CAMERA_PARAMETERS = {
    debugOrbit: false,
    debugOrbitAngle: 0,
    debugOrbitDistance: 18.9,
    debugOrbitHeight: 15.1,
    debugTargetYOffset: 0.4,
}

export const DEFAULT_LOADER_DEBUG_PARAMETERS = {
    enabled: false,
    targetX: 5.71,
    targetZ: 0.04,
    nudgeStep: 0.02,
    circleRadius: 106,
    ringWidth: 15.5,
    cameraHeight: 18,
    cssColorA: '#03021a',
    cssColorB: '#9d1111',
}

// Lantern fire + glow: a flickering flame placed in the hollow middle of the lantern (whose
// origin sits at the TOP) and a semi-transparent, paintery-edged glow circle around it. Both
// follow the lantern's world position (state.lanternPosition). All offsets/sizes are tunable
// since they depend on the exact lantern mesh dimensions.
export const DEFAULT_LANTERN_FIRE_PARAMETERS = {
    enabled: true,
    // Fire offsets are LOCAL to the lantern (attached to the bone, see MainCharacter), so the
    // flame follows the lantern's position AND rotation. -Y drops it from the top origin.
    fireOffsetX: 0,
    fireOffsetY: -0.7,
    fireOffsetZ: 0.05,
    fireBoneOffset: 0.08, // nudge the flame up the lantern→flame bone axis (only used with the flame bone)
    fireSize: 0.13,
    fireColorCore: '#ffe6a8', // hot inner flame
    fireColorEdge: '#ff6a16', // outer flame
    flickerSpeed: 7.3,
    flickerAmount: 0.18,
    // Glow — a semi-transparent paintery-edged circle (sharp dithered edge like the ground
    // border). Has its OWN local offset, independent of the fire, so the halo can sit apart.
    glowOffsetX: 0,
    glowOffsetY: -0.43,
    glowOffsetZ: 0,
    glowSize: 2.63,
    glowColor: '#ff8f4d',
    glowOpacity: 0.23,
    glowRadius: 0.76, // circle radius within the plane (0..1)
    glowBleed: 0.0, // softness of the paintery edge
    glowTextureScale: 0.03, // paintery brush tiling
    glowFront: 0.0, // push toward the camera so it draws over the lantern + stick
}

// Lantern grass interaction: a character-like reaction (scale + alpha + colour, NO lean) in the
// grass around the lantern's world position — like a soft clearing under the held light.
export const DEFAULT_LANTERN_GRASS_PARAMETERS = {
    enabled: true,
    radius: 1.7, // world units around the lantern
    softness: 1.8, // fade band toward the edge
    scale: 0.69, // how much the grass shortens (0..1)
    alpha: 1.0, // how much the grass fades out (0..1)
    color: '#ffd9a0', // tint toward this colour
    colorAmount: 0.81, // how strongly to tint (0..1)
}

// Intro camera travel (GameDirector): optional rise → descending 360° spiral down to the
// hero. Fully tunable + replayable via the "Intro Camera" Leva folder ("redo the animation").
export const DEFAULT_INTRO_CAMERA_PARAMETERS = {
    riseHeight: 0, // 0 = no initial rise; the spiral starts immediately
    riseDuration: 0, // seconds of that initial rise (0 = skip straight to the spiral)
    spiralDuration: 4.55, // seconds of the descending 360° spiral down to the hero
    orbitDistance: 14, // peak camera radius mid-spiral (swells out, then pulls in)
    revealReduce: 0.04, // how much the terrain/grass reveal shrinks during the rise
}

// A single arrow (arrow.glb, forward = local -X, origin behind it) floating in front of the
// hero toward the hidden companion at ANY distance (TargetArrow). Once close it travels high
// above the companion, points down and spins; when the mini-game starts it scales away.
export const DEFAULT_ARROW_PARAMETERS = {
    distance: 2.6, // how far in front of the hero the arrow floats (far state)
    yOffset: 2.0, // float height above the ground (far state)
    scale: 0.4, // arrow model scale
    modelYaw: 90, // deg — aligns the model's -X "forward" with the target direction
    closeRadius: 6, // distance at which the arrow starts travelling above the companion
    closeBand: 3, // transition width (overhead complete at closeRadius - closeBand)
    overheadHeight: 4, // how high above the companion the arrow hovers + spins
    spinSpeed: 1.6, // overhead spin speed
    floatAmount: 0.25, // bob amplitude
    floatSpeed: 2.0, // bob speed
    color: '#ffffff',
}

// Song mini-game: the "press E" interaction radius + the floating head-notes (CompanionNotes).
// (The old 2D note wheel + spatial singing voices were removed — the mini-game is now the 3D
// music stones, and the backing audio lives in musicTracks.js.)
export const DEFAULT_SONG_GAME_PARAMETERS = {
    interactRadius: 4.0, // distance (world units) to a companion at which the "press E" prompt appears
    // Floating notes above a singing head — now the 3D models from notes.glb (CompanionNotes).
    noteDuration: 1.75, // seconds each note lives
    noteGrow: 1.45, // final scale multiplier before it fades
    noteScale: 0.19, // base world size of a note
    noteRiseWorld: 1.45, // world units it floats upward over its life
    noteWobbleWorld: 0.77, // world units of side-to-side sway + initial spread
    noteColor: '#99e386', // fallback note tint (each companion's notes use its own body colour)
    // 3D feedback above the character head (CharacterFeedback): heart.glb on a correct press,
    // mark.glb (rocking) on a miss. Models are authored large, so these scales are small.
    heartScale: 0.15,
    markScale: 0.15,
}

// 3D music stones (song mini-game): seven coloured stones that rise around the companion,
// flash on each played note, and are clicked to repeat the song. Colours default to NOTES.
export const DEFAULT_MUSIC_STONE_PARAMETERS = {
    color0: '#e85c5c',
    color1: '#ef9f43',
    color2: '#f2d24b',
    color3: '#5fc46a',
    color4: '#46c2c9',
    color5: '#5b8def',
    color6: '#b072e6',
    radius: 3.6, // rainbow radius (half-width + rise) above the companion's head
    scale: 0.55, // normal stone scale (matches the ordinary stoneSize)
    yOffset: 1.25, // base height offset (added on top of hoverHeight)
    hoverHeight: 2.0, // height of the rainbow's low ends above the ground
    bobAmount: 0.07, // gentle vertical bob amplitude (when floatRotate is off)
    bobSpeed: 0.95, // bob / wobble speed
    floatRotate: true, // float in place (gentle rotation wobble) instead of a vertical bob
    floatRotateAmount: 0.17, // wobble amplitude in radians when floatRotate is on
    flashBoost: 1.4, // brightness multiplier when a note hits the stone (sing / click)
    hoverBoost: 0.35, // slight brighten while a clickable stone is hovered
    hoverScale: 0.18, // extra scale-up while a clickable stone is hovered (on top of brighten)
    hoverProxyRadius: 1.8, // world radius of the invisible hover/click proxy around each stone
    flashDuration: 0.32, // seconds the flash decays over
    listenTempo: 1.6, // playback speed multiplier when hearing the song (>1 = slower)
    notePlayDuration: 0.9, // base seconds each note plays before the next during the melody (× listenTempo)
    alwaysSixNotes: true, // always stage a full 6-stone board (extra stones are silent decoys)
    roundClearPause: 1.1, // seconds the "Nice!" banner holds before the next round's countdown
    countdownFrom: 3, // 3·2·1 — how many counts before each round's playback
    countdownStep: 0.7, // seconds per countdown tick
    staggerDelay: 0.12, // delay between each stone's scale-in (left→right)
    scaleInDuration: 0.5, // seconds for one stone to rise
    scaleOutDuration: 0.4, // seconds for the stones to sink on teardown
    grassFade: 0.6, // grass fade band beyond each stone's radius (currently dormant)
    cameraHeight: 4.2, // camera height → near-frontal view of the vertical rainbow
    cameraDistance: 13, // distance back from the companion
    cameraLerp: 3.6, // how smoothly the camera moves / returns
    // "Dialogue camera": a closer framing on the music character used for any interaction speech
    // (the prompt + the fail speech). Shares the stones azimuth so prompt↔stones is a clean pull.
    dialogueCameraHeight: 2.6, // camera height for the close-up speech framing
    dialogueCameraDistance: 7, // distance back from the character during speech
    dialogueTargetY: 1.2, // look-at height (the character's head) during speech
    // Pointer (the shared arrow): during playback it snaps to the singing note; during input it
    // follows the mouse freely around the arc and snaps onto a stone only while its proxy is hovered.
    pointerColor: '#ffffff',
    // Size is taken from the walking target arrow (arrowParameters.scale) — it's the same arrow.
    pointerRadius: 1.75, // arrow distance from the rainbow centre (the half-circle's centre)
    // See-through: during the game, the bottom side stones act like the hero — trees in front of
    // them fade away so the stones stay readable. This is the world radius of each stone's hole.
    seeThroughEnabled: true,
    seeThroughRadius: 2.8,
}

// The three synched backing tracks (one per music companion). All start (looping, muted) on GO;
// the MusicController only fades each track's volume. The current TARGET's track is heard by
// distance to the hero; a COLLECTED companion's track plays softly behind the party; everything
// is muted during a conversation / mini-game.
export const DEFAULT_MUSIC_PARAMETERS = {
    hearNear: 0, // distance (hero→target) at/under which the target track reaches nearVolume
    hearFar: 10, // distance beyond which it fades down to farVolume
    nearVolume: 1.0, // PREVIEW volume when right next to the companion (the simplified track plays full)
    farVolume: 0.0, // target preview volume when far (a faint hint of where to head)
    distanceFalloff: 1.0, // >1 = stays much quieter at range, only swells up close (ease-in on distance)
    collectedVolume: 0.7, // a collected companion's FULL melody plays behind the hero (lower than preview)
    creditsVolume: 1.0, // at the credits (party complete) all collected melodies swell to full
    volumeLerp: 2.1, // volume smoothing (higher = snappier fades)
}

// Ambient + character + footstep SFX (see ambientSounds.js / AmbientController). Wind is the
// constant bed (ducked during dialogues), cicadas a secondary bed, owls a random far/close pool,
// plus per-character one-shots and a switchable footstep pair.
export const DEFAULT_AMBIENT_SOUND_PARAMETERS = {
    windVolume: 0.09, // wind during walking gameplay (always present, gentle)
    windDialogueVolume: 0.05, // wind ducked right down during a conversation / mini-game / intro
    cicadaVolume: 0.12, // secondary ambient bed
    owlVolume: 0.5, // peak volume of each owl hoot in the random pool
    owlGapMin: 5, // min seconds of silence between owls
    owlGapMax: 16, // max seconds of silence between owls
    owlFade: 1.6, // fade in / out time (s) around each owl clip
    footstepVolume: 0.02,
    footstepInterval: 0.45, // seconds between steps while moving
    footstepSpeedThreshold: 2.95, // hero speed (u/s) above which footsteps play
    footstepGrass: true, // true = grassy footstep pair, false = plain footstep pair
    mumbleVolume: 0.38, // capucine_mumble — companion conversation
    sadVolume: 0.42, // capucin_sad — companion runs away after a missed song
    sighSound: 2, // which sigh plays on the hero's intro dialogue (0..3 = sigh_01..04)
    sighVolume: 0.9, // intro-dialogue sigh volume
}

// Procedural cartoon eyes drawn on a quad in front of the hero's face (see CharacterEyes + the
// characterEyes shader). Placement is local to the character model; shape is in quad-UV units.
// The eyes are drawn directly in the head mesh's fragment shader, laid out in the head's second UV
// (uv1). CharacterEyes drives the blink + glance; everything here is shape/colour in uv1 space.
export const DEFAULT_CHARACTER_EYES_PARAMETERS = {
    enabled: true,
    debugUv1: false, // paint the head by its second UV (R=u, G=v) to find the eye layout
    // Eyeball (yellow circle with a big wobbly border), positioned in the head's uv1.
    eyeColor: '#f2c20a',
    eyeRadius: 0.26,
    eyeSpacing: 0.55, // gap between the two eyes
    eyeOffsetY: -0.1,
    eyeAspect: 0.8, // 1 = round, <1 squished horizontally
    eyeNoiseScale: 1.0, // LOW = big chunky border wobbles ("very large noise")
    eyeNoiseStrength: 0.04,
    // Pupil (squished ellipse with its own perlin border).
    pupilColor: '#130d09',
    pupilWidth: 0.08,
    pupilHeight: 0.15, // taller than wide = squished
    pupilOffsetX: 0,
    pupilOffsetY: 0.03,
    pupilNoiseScale: 0.8,
    pupilNoiseStrength: 0.05,
    edgeSoftness: 0.01, // border softness (normalised)
    // Blink.
    blinkInterval: 2.9, // base seconds between blinks
    blinkIntervalRandom: 3.0, // + up to this many extra seconds (randomised)
    blinkDuration: 0.21, // seconds for a full close + open
    // Occasional left/right glance (pupil slides ±amount). Rarer than blinks.
    pupilLook: true,
    pupilLookAmount: 0.06, // how far the pupil slides left/right
    pupilLookInterval: 6.5, // base seconds between glances (well above the blink interval)
    pupilLookIntervalRandom: 5.0, // + up to this many extra seconds (randomised)
    pupilLookHold: 1.1, // seconds it holds the glance before returning to centre
    pupilLookSpeed: 6.0, // glance ease speed (higher = snappier)
}

// Eyes drawn on the authored eye PLANES of the tree GLBs (one eye pair per plane's [0,1] UV). Each
// tree shows a random `planesPerTree` of its planes (see ScatteredObjects + the eyePlane shaders).
export const DEFAULT_TREE_EYES_PARAMETERS = {
    planesPerTree: 3, // how many of a tree's eye planes show (random subset)
    // Camera-facing fade: fully transparent once the plane's normal·view drops to facingThreshold
    // (near 90° / edge-on, and back-facing planes); ramps to opaque over facingFalloff.
    facingThreshold: 0.55,
    facingFalloff: 0.38,
    eyeColor: '#a68bd3',
    pupilColor: '#120d09',
    eyeRadius: 0.13, // in the plane's [0,1] UV (0.5 = half the square)
    eyeSpacing: 0.33,
    eyeOffsetY: -0.02,
    eyeAspect: 0.99,
    eyeNoiseScale: 1.2,
    eyeNoiseStrength: 0.08,
    pupilWidth: 0.04,
    pupilHeight: 0.1,
    pupilNoiseScale: 1.0,
    pupilNoiseStrength: 0.1,
    edgeSoftness: 0.04,
    blinkInterval: 3.5, // seconds between blinks
    blinkWidth: 0.06, // fraction of the interval a blink occupies
    lookInterval: 7.0, // seconds between glances
    lookHold: 0.3, // fraction of the interval a glance is held
    lookAmount: 0.05, // how far the pupil slides
    lookChance: 0.7, // fraction of eye planes that do the occasional glance
}

// The sheep music companion: animation pacing, world scale, and the scales' jump-driven twist.
export const DEFAULT_SHEEP_PARAMETERS = {
    modelScale: 0.65, // world scale of the glb (× the per-companion definition.scale)
    modelYaw: 90, // degrees — correct the model's facing (it exported 90° off)
    yOffset: 0, // lift off the ground if the model sinks
    idleTimeScale: 1,
    runTimeScale: 1,
    runBlendInSpeed: 8, // idle→run crossfade speed when it starts moving
    runBlendOutSpeed: 6, // run→idle crossfade speed when it stops
    swayAxis: 'Z', // local axis the scales twist around (Blender Y often maps to three's Z)
    swayGain: 10, // motion-bone bounce → scale twist (radians per world unit of vertical move)
    swayDamp: 1.5, // how quickly the twist follows the bounce (lower = more lag/inertia)
    swayMax: 0.45, // clamp on the twist angle (radians)
    scaleColorVariation: 0.12, // slight per-scale colour jitter (0 = all scales the same colour)
    followLead: 2.4, // trail distance from the hero to the FIRST collected companion
    followGap: 1.7, // trail distance between consecutive collected companions
    seeThroughRadius: 1.6, // world radius of the see-through hole props punch around this companion
    seeThroughHeight: 0.6, // height above the companion's feet to centre the see-through hole
}

// Sheep stylized material: the hero's painterly settings + per-companion base colours.
export const DEFAULT_SHEEP_MATERIAL_PARAMETERS = {
    ...characterStylizedDefaults,
    characters: cloneSheepCharacters(),
}

// One-time stylization baked into the paintery brush texture (blur + levels +
// contrast + posterize) so its small details merge into larger painterly regions,
// replacing the per-frame Kuwahara abstraction.
export const DEFAULT_PAINTERY_TEXTURE_PARAMETERS = {
    enabled: true,
    textureName: 'paintaryAlpha', // source paintery texture for the terrain bake (ground/grass/border)
    blur: 2.0,
    levelsLow: 0.0,
    levelsHigh: 1.0,
    contrast: 1.15,
    posterize: 0,
}

// Stylized game UI (speech bubble + buttons). Defined per scene style (see gameUiParameters in
// sceneStyles.js); mirrored here as the global default the store seeds + HMR-merges.
export const DEFAULT_GAME_UI_PARAMETERS = defaultSceneStyle.gameUiParameters
