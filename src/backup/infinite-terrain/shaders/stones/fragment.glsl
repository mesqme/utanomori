uniform float uPixelSize;
uniform int uDitherMode;

varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vFadeMask;

// --- Dither Functions (same as grass) ---
float getDiamondThreshold(vec2 fragCoord, float pixelSize) {
    vec2 uv = mod(fragCoord + 0.01, pixelSize);
    vec2 centered = (uv / pixelSize) * 2.0 - 1.0;
    float dist = abs(centered.x) + abs(centered.y);
    return dist / 2.0;
}

float getBayerThreshold(vec2 fragCoord, float pixelSize) {
    vec2 pixelCoord = floor(fragCoord / pixelSize);
    int x = int(mod(pixelCoord.x, 8.0));
    int y = int(mod(pixelCoord.y, 8.0));

    int M[64];
    M[0]=0;  M[1]=32; M[2]=8;  M[3]=40; M[4]=2;  M[5]=34; M[6]=10; M[7]=42;
    M[8]=48; M[9]=16; M[10]=56;M[11]=24;M[12]=50;M[13]=18;M[14]=58;M[15]=26;
    M[16]=12;M[17]=44;M[18]=4; M[19]=36;M[20]=14;M[21]=46;M[22]=6; M[23]=38;
    M[24]=60;M[25]=28;M[26]=52;M[27]=20;M[28]=62;M[29]=30;M[30]=54;M[31]=22;
    M[32]=3; M[33]=35;M[34]=11;M[35]=43;M[36]=1; M[37]=33;M[38]=9; M[39]=41;
    M[40]=51;M[41]=19;M[42]=59;M[43]=27;M[44]=49;M[45]=17;M[46]=57;M[47]=25;
    M[48]=15;M[49]=47;M[50]=7; M[51]=39;M[52]=13;M[53]=45;M[54]=5; M[55]=37;
    M[56]=63;M[57]=31;M[58]=55;M[59]=23;M[60]=61;M[61]=29;M[62]=53;M[63]=21;

    int index = y * 8 + x;
    return float(M[index]) / 64.0;
}

bool shouldDiscard(vec2 fragCoord, float pixelSize, float fadeLevel, int mode) {
    if (fadeLevel <= 0.0) return false;
    if (fadeLevel >= 1.0) return true;

    float threshold = 0.0;
    if (mode == 0) {
        threshold = getDiamondThreshold(fragCoord, pixelSize + 4.0);
    } else if (mode == 1) {
        threshold = getBayerThreshold(fragCoord, pixelSize);
    }
    return threshold < fadeLevel;
}

float saturateValue(float x) {
  return clamp(x, 0.0, 1.0);
}

vec3 lambertLight(vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColour) {
  float wrap = 0.5;
  float dotNL = saturateValue((dot(normal, lightDir) + wrap) / (1.0 + wrap));
  vec3 lighting = vec3(dotNL);

  float backlight = saturateValue((dot(viewDir, -lightDir) + wrap) / (1.0 + wrap));
  vec3 scatter = vec3(pow(backlight, 2.0));

  lighting += scatter;
  return lighting * lightColour;
}

vec3 hemiLight(vec3 normal, vec3 groundColour, vec3 skyColour) {
  return mix(groundColour, skyColour, 0.5 * normal.y + 0.5);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Hemi
  vec3 c1 = vec3(1.0, 1.0, 0.75);
  vec3 c2 = vec3(0.05, 0.05, 0.25);
  vec3 ambientLighting = hemiLight(normal, c2, c1);

  // Directional light (match grass direction for consistency)
  vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
  vec3 lightColour = vec3(1.0);
  vec3 diffuseLighting = lambertLight(normal, viewDir, lightDir, lightColour);

  vec3 lighting = diffuseLighting * 0.25 + ambientLighting * 0.75;
  vec3 color = vColor * lighting;

  // Dither fade (same logic as grass)
  if (vFadeMask < 0.99) {
      float fade = 1.0 - vFadeMask;
      if (shouldDiscard(gl_FragCoord.xy, uPixelSize, fade, uDitherMode)) {
          discard;
      }
  }

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
