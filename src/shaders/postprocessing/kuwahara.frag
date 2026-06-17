#define SECTOR_COUNT 8
#define MAX_RADIUS 24
#define ANGLE_SAMPLE_COUNT 3

uniform sampler2D colorBuffer;
uniform vec2 texelSize;
uniform int radius;

varying vec2 vUv;

// Isotropic generalized Kuwahara: split the neighbourhood into 8 fixed angular
// sectors, keep the smoothest (lowest luminance variance) sector's average colour.
void main() {
    float bestVariance = 1000000.0;
    vec3 bestColor = texture2D(colorBuffer, vUv).rgb;

    for (int sector = 0; sector < SECTOR_COUNT; sector++) {
        float sectorAngle = float(sector) * 6.28318530718 / float(SECTOR_COUNT);
        vec3 sum = vec3(0.0);
        vec3 squaredSum = vec3(0.0);
        float sampleCount = 0.0;

        for (int angleStep = 0; angleStep < ANGLE_SAMPLE_COUNT; angleStep++) {
            float angle = sectorAngle + (float(angleStep) - 1.0) * 0.26179938779;
            vec2 sampleDirection = vec2(cos(angle), sin(angle));

            for (int distanceStep = 1; distanceStep <= MAX_RADIUS; distanceStep++) {
                if (distanceStep <= radius) {
                    vec2 sampleOffset = float(distanceStep) * sampleDirection;
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
