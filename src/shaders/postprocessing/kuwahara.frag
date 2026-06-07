#define SECTOR_COUNT 8
#define MAX_RADIUS 8
#define ANGLE_SAMPLE_COUNT 3

uniform sampler2D tensorBuffer;
uniform sampler2D colorBuffer;
uniform vec2 texelSize;
uniform int radius;
uniform float anisotropyStrength;
uniform float eccentricity;

varying vec2 vUv;

vec4 getOrientation(vec4 tensor) {
    float jxx = tensor.r;
    float jyy = tensor.g;
    float jxy = tensor.b;
    float trace = jxx + jyy;
    float root = sqrt(max((jxx - jyy) * (jxx - jyy) + 4.0 * jxy * jxy, 0.0));
    float lambda1 = 0.5 * (trace + root);
    float lambda2 = 0.5 * (trace - root);
    vec2 orientation = normalize(vec2(-jxy, jxx - lambda1) + vec2(0.00001, 0.0));
    return vec4(orientation, lambda1, lambda2);
}

void main() {
    vec4 orientationData = getOrientation(texture2D(tensorBuffer, vUv));
    vec2 orientation = orientationData.xy;
    float anisotropy = clamp(
        (orientationData.z - orientationData.w) / max(orientationData.z + orientationData.w, 0.00001),
        0.0,
        1.0
    ) * anisotropyStrength;

    float stretch = 1.0 + anisotropy * max(eccentricity, 0.0);
    mat2 rotation = mat2(orientation.x, -orientation.y, orientation.y, orientation.x);
    mat2 anisotropyMatrix = rotation * mat2(1.0 / stretch, 0.0, 0.0, stretch);

    float bestVariance = 1000000.0;
    vec3 bestColor = texture2D(colorBuffer, vUv).rgb;

    for (int sector = 0; sector < SECTOR_COUNT; sector++) {
        float sectorAngle = float(sector) * 6.28318530718 / float(SECTOR_COUNT);
        vec3 sum = vec3(0.0);
        vec3 squaredSum = vec3(0.0);
        float sampleCount = 0.0;

        for (int distanceStep = 1; distanceStep <= MAX_RADIUS; distanceStep++) {
            if (distanceStep <= radius) {
                for (int angleStep = 0; angleStep < ANGLE_SAMPLE_COUNT; angleStep++) {
                    float angleOffset = (float(angleStep) - 1.0) * 0.26179938779;
                    float angle = sectorAngle + angleOffset;
                    vec2 sampleOffset = anisotropyMatrix * (float(distanceStep) * vec2(cos(angle), sin(angle)));
                    vec3 sampleColor = texture2D(colorBuffer, vUv + sampleOffset * texelSize).rgb;
                    sum += sampleColor;
                    squaredSum += sampleColor * sampleColor;
                    sampleCount += 1.0;
                }
            }
        }

        vec3 average = sum / max(sampleCount, 1.0);
        vec3 variance = max(squaredSum / max(sampleCount, 1.0) - average * average, vec3(0.0));
        float luminanceVariance = dot(variance, vec3(0.299, 0.587, 0.114));
        if (luminanceVariance < bestVariance) {
            bestVariance = luminanceVariance;
            bestColor = average;
        }
    }

    gl_FragColor = vec4(bestColor, 1.0);
}
