uniform sampler2D inputBuffer;
uniform vec2 texelSize;

varying vec2 vUv;

float luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    float tl = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(-1.0, 1.0)).rgb);
    float tc = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(0.0, 1.0)).rgb);
    float tr = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(1.0, 1.0)).rgb);
    float ml = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(-1.0, 0.0)).rgb);
    float mr = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(1.0, 0.0)).rgb);
    float bl = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(-1.0, -1.0)).rgb);
    float bc = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(0.0, -1.0)).rgb);
    float br = luminance(texture2D(inputBuffer, vUv + texelSize * vec2(1.0, -1.0)).rgb);

    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = tl + 2.0 * tc + tr - bl - 2.0 * bc - br;

    gl_FragColor = vec4(gx * gx, gy * gy, gx * gy, 1.0);
}
