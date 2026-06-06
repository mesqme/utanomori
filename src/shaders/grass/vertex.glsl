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

uniform sampler2D uTrailTexture;
uniform vec3 uBallPosition;
uniform vec3 uCircleCenter;
uniform float uTrailCanvasSize;
uniform float uSobelMode;

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

varying vec3 vColor;
varying vec4 vGrassData;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vTrailValue;
varying float vPatchBorderScale;
varying vec3 vPatchDebugColor;

#include includes.glsl

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

  vec2 deltaXZ = worldXZ - uBallPosition.xz;
  float distToBall = length(deltaXZ);
  float radiusFade = 1.0 - smoothstep(grassRadius * 0.8, grassRadius * 1.2, distToBall);
  vec2 trailUv = clamp(0.5 - deltaXZ / uGrassChunkSize, 0.0, 1.0);
  trailUv.x = 1.0 - trailUv.x;
  float trailValue = texture2D(uTrailTexture, trailUv).r;
  float nearBallClamp = (1.0 - smoothstep(0.0, 1.0, distToBall)) * trailValue;
  grassHeightMask *= mix(1.0, grassMinHeight, nearBallClamp);
  float flattenFactor = smoothstep(0.6, 1.0, trailValue) * radiusFade;
  grassHeightMask *= mix(1.0, grassMinHeight, flattenFactor);

  vec2 trailBendDirection = vec2(0.0);
  float trailBendAmount = 0.0;
  if (trailValue > 0.05 && radiusFade > 0.0) {
    float texel = 1.0 / max(uTrailCanvasSize, 1.0);
    vec2 gradient;
    if (uSobelMode < 0.5) {
      gradient = vec2(
        texture2D(uTrailTexture, trailUv + vec2(texel, 0.0)).r - trailValue,
        texture2D(uTrailTexture, trailUv + vec2(0.0, texel)).r - trailValue
      );
    } else if (uSobelMode < 1.5) {
      gradient = vec2(
        texture2D(uTrailTexture, trailUv + vec2(texel, 0.0)).r - texture2D(uTrailTexture, trailUv - vec2(texel, 0.0)).r,
        texture2D(uTrailTexture, trailUv + vec2(0.0, texel)).r - texture2D(uTrailTexture, trailUv - vec2(0.0, texel)).r
      );
    } else {
      float t00 = texture2D(uTrailTexture, trailUv + vec2(-texel, -texel)).r;
      float t10 = texture2D(uTrailTexture, trailUv + vec2(0.0, -texel)).r;
      float t20 = texture2D(uTrailTexture, trailUv + vec2(texel, -texel)).r;
      float t01 = texture2D(uTrailTexture, trailUv + vec2(-texel, 0.0)).r;
      float t21 = texture2D(uTrailTexture, trailUv + vec2(texel, 0.0)).r;
      float t02 = texture2D(uTrailTexture, trailUv + vec2(-texel, texel)).r;
      float t12 = texture2D(uTrailTexture, trailUv + vec2(0.0, texel)).r;
      float t22 = texture2D(uTrailTexture, trailUv + vec2(texel, texel)).r;
      gradient = vec2(
        (t20 + 2.0 * t21 + t22) - (t00 + 2.0 * t01 + t02),
        (t02 + 2.0 * t12 + t22) - (t00 + 2.0 * t10 + t20)
      );
    }
    float gradientLength = length(gradient);
    if (gradientLength > 0.0001) {
      trailBendDirection = -gradient / gradientLength;
      trailBendAmount = smoothstep(0.3, 1.0, trailValue) * clamp(gradientLength * 5.0, 0.0, 1.0) * radiusFade;
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
  vec2 trailOffset = trailBendDirection * trailBendAmount * 0.5 * heightPercent * (1.0 - flattenFactor);

  float verticalCompression = clamp(1.0 - radialLean * bendProfile * 0.18, 0.65, 1.0);
  vec3 grassLocalPosition = grassOffset + vec3(
    widthDirection.x * x + radialOffset.x + windOffset.x + trailOffset.x,
    heightPercent * height * verticalCompression,
    widthDirection.y * x + radialOffset.y + windOffset.y + trailOffset.y
  );

  vec4 mvPosition = modelViewMatrix * vec4(grassLocalPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.w = grassHeightMask < grassMinHeight ? 0.0 : gl_Position.w;

  vColor = aPatchColor;
  vNormal = normalize(vec3(facingDirection.x * -zSide, 0.2, facingDirection.y * -zSide));
  vWorldPosition = (modelMatrix * vec4(grassLocalPosition, 1.0)).xyz;
  vGrassData = vec4(x, heightPercent, xSide, grassMask);
  vTrailValue = trailValue * radiusFade;
  vPatchBorderScale = aPatchData.w;
  vPatchDebugColor = aPatchDebugColor;
}
