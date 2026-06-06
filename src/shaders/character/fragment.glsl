uniform vec3 uBaseColor;
uniform int uDebugMode;
uniform int uPainterlyEnabled;
uniform sampler2D uPainterlyTexture;
uniform float uPainterlyScale;
uniform float uPainterlyContrast;
uniform vec3 uPainterlyColor;
uniform float uPainterlyColorStrength;
uniform float uPainterlyBrightnessVariation;

varying vec3 vObjectPosition;
varying vec3 vObjectNormal;

float samplePainterlyTexture(vec3 position, vec3 normalDirection) {
    vec3 blendWeights = pow(abs(normalDirection), vec3(4.0));
    blendWeights /= max(blendWeights.x + blendWeights.y + blendWeights.z, 0.0001);

    float xProjection = texture2D(uPainterlyTexture, position.yz).r;
    float yProjection = texture2D(uPainterlyTexture, position.xz).r;
    float zProjection = texture2D(uPainterlyTexture, position.xy).r;

    return xProjection * blendWeights.x + yProjection * blendWeights.y + zProjection * blendWeights.z;
}

void main() {
    float painterlyValue = 0.5;
    vec3 finalColor = uBaseColor;
    if (uPainterlyEnabled == 1) {
        painterlyValue = samplePainterlyTexture(vObjectPosition * uPainterlyScale, normalize(vObjectNormal));
        painterlyValue = clamp((painterlyValue - 0.5) * uPainterlyContrast + 0.5, 0.0, 1.0);
        float signedVariation = painterlyValue * 2.0 - 1.0;
        finalColor *= 1.0 + signedVariation * uPainterlyBrightnessVariation;
        float tintMask = smoothstep(0.55, 1.0, painterlyValue) * uPainterlyColorStrength;
        finalColor = mix(finalColor, uPainterlyColor, tintMask);
    }

    if (uDebugMode == 1) {
        finalColor = uBaseColor;
    } else if (uDebugMode == 2) {
        finalColor = vec3(painterlyValue);
    }

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);

    #include <colorspace_fragment>
}
