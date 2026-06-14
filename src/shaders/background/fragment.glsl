uniform int uMode; // 0 = colour, 1 = stylized texture, 2 = night sky
uniform vec3 uColor;
uniform sampler2D uTexture;
uniform float uTextureScale;
uniform float uTextureContrast;
uniform float uTextureLayer2;
uniform float uTime;
uniform float uStarCellSize;
uniform float uStarDensity;
uniform float uStarSize;
uniform float uStarBrightness;
uniform float uStarTwinkleSpeed;
uniform float uStarRays;
uniform vec3 uStarColor;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
    float n = hash21(p);
    return vec2(n, hash21(p + n));
}

void main() {
    vec3 color = uColor;

    if (uMode == 1) {
        // Stylized brush texture over the sky (screen space, two layers).
        vec2 uv = gl_FragCoord.xy * uTextureScale;
        float brush = texture2D(uTexture, uv).r;
        brush = mix(brush, texture2D(uTexture, uv * uTextureLayer2 + vec2(0.37)).r, 0.5);
        color *= 1.0 + (brush - 0.5) * 2.0 * uTextureContrast;
    } else if (uMode == 2) {
        // Screen-space stars: a jittered grid, each star a 1/x diamond with cross rays.
        vec2 cell = gl_FragCoord.xy / uStarCellSize;
        vec2 cellId = floor(cell);
        vec2 cellLocal = fract(cell);
        float starField = 0.0;

        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 neighbor = vec2(float(x), float(y));
                vec2 id = cellId + neighbor;
                float present = hash21(id);
                if (present > uStarDensity) continue;

                vec2 starPos = neighbor + 0.2 + hash22(id + 1.0) * 0.6;
                vec2 delta = cellLocal - starPos;

                float manhattan = abs(delta.x) + abs(delta.y);
                float core = pow(uStarSize / (manhattan + uStarSize), 3.0); // 1/x diamond
                float crossH = pow(uStarSize / (abs(delta.y) * 4.0 + uStarSize), 2.0) * exp(-abs(delta.x) * 14.0);
                float crossV = pow(uStarSize / (abs(delta.x) * 4.0 + uStarSize), 2.0) * exp(-abs(delta.y) * 14.0);

                float brightness = hash21(id + 7.0);
                brightness *= brightness; // bias toward faint stars
                float twinkle = 0.55 + 0.45 * sin(uTime * uStarTwinkleSpeed + present * 6.2831);

                starField += (core + (crossH + crossV) * uStarRays) * brightness * twinkle;
            }
        }

        color += uStarColor * starField * uStarBrightness;
    }

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
