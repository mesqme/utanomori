uniform sampler2D originalBuffer;
uniform sampler2D kuwaharaBuffer;
uniform float filterStrength;
uniform int debugMode;

varying vec2 vUv;

void main() {
    vec3 originalColor = texture2D(originalBuffer, vUv).rgb;
    if (debugMode == 1) {
        gl_FragColor = vec4(clamp(originalColor, 0.0, 1.0), 1.0);
        return;
    }

    vec3 kuwaharaColor = texture2D(kuwaharaBuffer, vUv).rgb;
    if (debugMode == 2) {
        gl_FragColor = vec4(clamp(kuwaharaColor, 0.0, 1.0), 1.0);
        return;
    }

    vec3 color = mix(originalColor, kuwaharaColor, filterStrength);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
