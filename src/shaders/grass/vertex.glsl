uniform float uTime;
uniform float uGrassSegments;
uniform float uGrassChunkSize;
uniform float uGrassWidth;
uniform float uGrassHeight;
uniform float uLeanFactor;
uniform float uCameraFacingStrength;
uniform float uOrientationVariation;
uniform float uRoadGrassMinScale;

uniform float uWindScale;
uniform float uWindStrength;
uniform float uWindSpeed;
uniform float uWindDirection;

uniform vec3 uCircleCenter;

uniform sampler2D uTrailTexture;
uniform vec2 uTrailCenter;
uniform float uTrailWorldSize;
uniform float uTrailResolution;
uniform float uTrampleEnabled;
uniform float uTrailStrength;
uniform vec4 uTramplers[8];
uniform float uUseTrailSource;
uniform float uUseRadiusSource;

uniform float uScaleEnabled;
uniform float uScaleSource;
uniform float uScaleRadius;
uniform float uScaleStart;
uniform float uScaleEnd;
uniform float uScaleRate;
uniform float uScaleAmount;

uniform float uLeanEnabled;
uniform float uLeanSource;
uniform float uLeanRadius;
uniform float uLeanStart;
uniform float uLeanEnd;
uniform float uLeanRate;
uniform float uLeanAmount;

uniform float uDissolveEnabled;
uniform float uDissolveSource;
uniform float uDissolveRadius;
uniform float uDissolveStart;
uniform float uDissolveEnd;
uniform float uDissolveRate;

uniform float uLightenEnabled;
uniform float uLightenSource;
uniform float uLightenRadius;
uniform float uLightenStart;
uniform float uLightenEnd;
uniform float uLightenRate;

uniform sampler2D uNoiseTexture;
uniform float uNoiseStrength;
uniform float uNoiseScale;
uniform float uCircleRadiusFactor;
uniform float uGrassFadeOffset;

attribute vec3 aInstancePosition;
attribute vec2 aPatchCenter;
attribute vec4 aPatchData;
attribute vec3 aPatchColor;
attribute vec3 aPatchDebugColor;
attribute float aRoadMask;
attribute float aObjectSuppress; // 1 = inside a stone/tree safe radius → no grass; fades to 0
attribute vec2 aObjectLean; // direction × strength to lean away from the nearest stone/tree

uniform vec4 uMusicStones[7]; // dynamic song-mini-game stones: xy = world XZ, z = radius, w = active
uniform float uMusicStoneFade; // fade band width beyond each music stone's radius

uniform vec3 uLanternPosition; // lantern world position (shared with the fragment's ground light)
uniform float uLanternGrassEnabled;
uniform float uLanternGrassRadius;
uniform float uLanternGrassSoftness;
uniform float uLanternGrassScale; // how much the grass shortens near the lantern

varying vec3 vColor;
varying vec4 vGrassData;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vPatchBorderScale;
varying vec3 vPatchDebugColor;
varying float vTrampleDissolve;
varying float vTrampleLighten;
varying float vLanternInfluence;

#include includes.glsl

// Remap a raw [0,1] source value into a layer influence via start..end + a rate curve.
float trampleRemap(float raw, float start, float end, float rate) {
  return pow(clamp((raw - start) / max(end - start, 0.0001), 0.0, 1.0), rate);
}

void main() {
  int grassSegments = int(uGrassSegments);
  int grassVertices = (grassSegments + 1) * 2;
  float grassHeightMask = 1.0;
  float grassMinHeight = 0.25;
  vec3 grassOffset = aInstancePosition;
  vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffset, 1.0)).xyz;
  vec2 worldXZ = grassBladeWorldPos.xz;
  vec3 hashVal = hash(grassBladeWorldPos);

  float distToCircle = length(worldXZ - uCircleCenter.xz);
  float noiseValue = texture2D(uNoiseTexture, worldXZ * uNoiseScale * 0.1).r;
  float noiseOffset = (noiseValue * 2.0 - 1.0) * uNoiseStrength;
  float grassRadius = uGrassChunkSize * uCircleRadiusFactor * (1.0 + noiseOffset);
  float grassMask = 1.0 - smoothstep(grassRadius - uGrassFadeOffset, grassRadius, distToCircle);
  grassHeightMask *= grassMask;
  grassHeightMask *= mix(1.0, uRoadGrassMinScale, aRoadMask);
  // Stones / trees: full kill inside their safe radius, fading across the band (baked CPU-side).
  grassHeightMask *= (1.0 - aObjectSuppress);

  // Music stones (song mini-game): the same clear + lean, but DYNAMIC — the radius tracks
  // each stone's animated scale, so the clearing grows/recovers as the stone rises/sinks.
  vec2 musicLean = vec2(0.0);
  for (int i = 0; i < 7; i++) {
    if (uMusicStones[i].w < 0.5) continue;
    float msR = uMusicStones[i].z;
    float msD = distance(worldXZ, uMusicStones[i].xy);
    float msS = 1.0 - smoothstep(msR, msR + uMusicStoneFade, msD);
    grassHeightMask *= (1.0 - msS);
    vec2 away = msD > 1e-4 ? (worldXZ - uMusicStones[i].xy) / msD : vec2(0.0);
    musicLean += away * msS * 0.45;
  }

  // Lantern: a character-like grass interaction (scale here; alpha + colour in the fragment)
  // around the lantern's world position. No lean.
  float lanternInfluence = 0.0;
  if (uLanternGrassEnabled > 0.5) {
    float lanternDist = distance(worldXZ, uLanternPosition.xz);
    lanternInfluence = 1.0 - smoothstep(uLanternGrassRadius - uLanternGrassSoftness, uLanternGrassRadius, lanternDist);
    grassHeightMask *= 1.0 - lanternInfluence * uLanternGrassScale;
  }
  vLanternInfluence = lanternInfluence;

  // Grass-trail reaction — four independent layers, each driven by either the fading
  // trail canvas ('Trail') or a plain radius around the nearest character ('Radius').
  // Scale + lean act here in the vertex; dissolve + lighten pass to the fragment.
  vec2 trampleLeanDir = vec2(0.0);
  float trampleLeanStrength = 0.0;
  vTrampleDissolve = 0.0;
  vTrampleLighten = 0.0;

  if (uTrampleEnabled > 0.5) {
    // --- Shared source samples ---
    // Trail intensity + gradient direction (away from the path).
    float trailRaw = 0.0;
    vec2 trailDir = vec2(0.0);
    if (uUseTrailSource > 0.5) {
      vec2 trailUv = (worldXZ - uTrailCenter) / uTrailWorldSize + 0.5;
      if (trailUv.x > 0.0 && trailUv.x < 1.0 && trailUv.y > 0.0 && trailUv.y < 1.0) {
        trailRaw = clamp(texture2D(uTrailTexture, trailUv).r * uTrailStrength, 0.0, 1.0);
        if (trailRaw > 0.001) {
          float texel = 1.0 / uTrailResolution;
          float gradX = texture2D(uTrailTexture, trailUv + vec2(texel, 0.0)).r - texture2D(uTrailTexture, trailUv - vec2(texel, 0.0)).r;
          float gradZ = texture2D(uTrailTexture, trailUv + vec2(0.0, texel)).r - texture2D(uTrailTexture, trailUv - vec2(texel, 0.0)).r;
          vec2 grad = vec2(-gradX, -gradZ);
          float gradLen = length(grad);
          trailDir = gradLen > 0.0001 ? grad / gradLen : vec2(0.0);
        }
      }
    }
    // Nearest active character (for the 'Radius' source) + direction away from it.
    float nearestDist = 1e9;
    vec2 nearestDir = vec2(0.0);
    if (uUseRadiusSource > 0.5) {
      for (int i = 0; i < 8; i++) {
        if (uTramplers[i].w < 0.5) continue;
        vec2 toBlade = worldXZ - uTramplers[i].xz;
        float dist = length(toBlade);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestDir = dist > 0.0001 ? toBlade / dist : vec2(0.0);
        }
      }
    }

    // --- Scale layer (shorten) ---
    if (uScaleEnabled > 0.5) {
      float raw = uScaleSource < 0.5 ? trailRaw : 1.0 - clamp(nearestDist / uScaleRadius, 0.0, 1.0);
      float influence = trampleRemap(raw, uScaleStart, uScaleEnd, uScaleRate);
      grassHeightMask *= 1.0 - influence * uScaleAmount;
    }
    // --- Lean layer ---
    if (uLeanEnabled > 0.5) {
      float raw = uLeanSource < 0.5 ? trailRaw : 1.0 - clamp(nearestDist / uLeanRadius, 0.0, 1.0);
      trampleLeanDir = uLeanSource < 0.5 ? trailDir : nearestDir;
      trampleLeanStrength = trampleRemap(raw, uLeanStart, uLeanEnd, uLeanRate) * uLeanAmount;
    }
    // --- Dissolve layer (handled in fragment) ---
    if (uDissolveEnabled > 0.5) {
      float raw = uDissolveSource < 0.5 ? trailRaw : 1.0 - clamp(nearestDist / uDissolveRadius, 0.0, 1.0);
      vTrampleDissolve = trampleRemap(raw, uDissolveStart, uDissolveEnd, uDissolveRate);
    }
    // --- Lighten layer (handled in fragment) ---
    if (uLightenEnabled > 0.5) {
      float raw = uLightenSource < 0.5 ? trailRaw : 1.0 - clamp(nearestDist / uLightenRadius, 0.0, 1.0);
      vTrampleLighten = trampleRemap(raw, uLightenStart, uLightenEnd, uLightenRate);
    }
  }

  int vertFrontBackId = gl_VertexID % (grassVertices * 2);
  int vertId = vertFrontBackId % grassVertices;
  int xTest = vertId & 0x1;
  int zTest = vertFrontBackId >= grassVertices ? 1 : -1;
  float xSide = float(xTest);
  float zSide = float(zTest);
  float heightPercent = float(vertId - xTest) / (float(grassSegments) * 2.0);

  float width = uGrassWidth * aPatchData.y * easeOut(1.08 - heightPercent, 2.0) * grassHeightMask;
  float height = max(0.05, uGrassHeight * aPatchData.x * grassHeightMask);
  float x = (xSide - 0.5) * width;

  vec2 cameraDirection = normalize(cameraPosition.xz - worldXZ);
  float cameraAngle = atan(cameraDirection.x, cameraDirection.y);
  float variedAngle = cameraAngle + hashVal.x * 3.14159 * uOrientationVariation;
  vec2 variedDirection = vec2(sin(variedAngle), cos(variedAngle));
  vec2 facingDirection = normalize(mix(variedDirection, cameraDirection, uCameraFacingStrength));
  vec2 widthDirection = vec2(facingDirection.y, -facingDirection.x);

  vec2 radialDelta = worldXZ - aPatchCenter;
  vec2 radialDirection = length(radialDelta) > 0.0001 ? normalize(radialDelta) : vec2(0.0);
  float bendProfile = heightPercent * heightPercent;
  float radialLean = max(0.0, aPatchData.z * (1.0 + uLeanFactor * 0.5));
  vec2 radialOffset = radialDirection * radialLean * height * bendProfile;

  vec2 windUv = worldXZ * uWindScale * 0.1 + vec2(uTime * uWindSpeed * 0.1);
  float windNoise = texture2D(uNoiseTexture, windUv).r * 2.0 - 1.0;
  vec2 windDirection = vec2(cos(uWindDirection), sin(uWindDirection));
  vec2 windOffset = windDirection * windNoise * uWindStrength * height * bendProfile;
  float verticalCompression = clamp(1.0 - radialLean * bendProfile * 0.18, 0.65, 1.0);
  vec2 trampleOffset = trampleLeanDir * trampleLeanStrength * height * bendProfile;
  // Lean away from nearby stones / trees (aObjectLean already carries direction × strength;
  // musicLean is the dynamic music-stone contribution).
  vec2 objectOffset = (aObjectLean + musicLean) * height * bendProfile;
  vec3 grassLocalPosition = grassOffset + vec3(
    widthDirection.x * x + radialOffset.x + windOffset.x + trampleOffset.x + objectOffset.x,
    heightPercent * height * verticalCompression,
    widthDirection.y * x + radialOffset.y + windOffset.y + trampleOffset.y + objectOffset.y
  );

  vec4 mvPosition = modelViewMatrix * vec4(grassLocalPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.w = grassHeightMask < grassMinHeight ? 0.0 : gl_Position.w;

  vColor = aPatchColor;
  vNormal = normalize(vec3(facingDirection.x * -zSide, 0.2, facingDirection.y * -zSide));
  vWorldPosition = (modelMatrix * vec4(grassLocalPosition, 1.0)).xyz;
  vGrassData = vec4(x, heightPercent, xSide, grassMask);
  vPatchBorderScale = aPatchData.w;
  vPatchDebugColor = aPatchDebugColor;
}
