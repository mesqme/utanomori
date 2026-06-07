uniform sampler2D inputBuffer;
uniform vec2 texelSize;
uniform float strength;

varying vec2 vUv;

void main() {
    vec3 center = texture2D(inputBuffer, vUv).rgb;
    vec3 neighbors =
        texture2D(inputBuffer, vUv + vec2(texelSize.x, 0.0)).rgb +
        texture2D(inputBuffer, vUv - vec2(texelSize.x, 0.0)).rgb +
        texture2D(inputBuffer, vUv + vec2(0.0, texelSize.y)).rgb +
        texture2D(inputBuffer, vUv - vec2(0.0, texelSize.y)).rgb;
    vec3 sharpened = center * 5.0 - neighbors;
    gl_FragColor = vec4(clamp(mix(center, sharpened, strength), 0.0, 1.0), 1.0);
}
