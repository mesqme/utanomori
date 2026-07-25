// Ordered dithering, shared by the ground and the grass so the two edges always agree — a fade
// that dithered differently on terrain and on grass would tear visibly along the world border.
//
// KEEP THIS ARITHMETIC. The obvious implementation fills a 64-element local int array and indexes
// it with a runtime value; that dynamically-indexed large local array makes ANGLE's Metal shader
// compiler throw an internal error at pipeline creation, and the ground and grass silently fail to
// render on macOS. The version below reproduces exactly the same 0..63 Bayer matrix through the
// recursive 2x2 construction, with no array at all.

float getBayerThreshold(vec2 fragCoord, float pixelSize) {
    // Pixelate
    vec2 pixelCoord = floor(fragCoord / pixelSize);

    // 8x8 Bayer Matrix
    int x = int(mod(pixelCoord.x, 8.0));
    int y = int(mod(pixelCoord.y, 8.0));

    float bx = float(x);
    float by = float(y);
    float v = 0.0;
    float scale = 16.0;
    for (int bit = 0; bit < 3; bit++) {
        float p = pow(2.0, float(bit));
        float xi = mod(floor(bx / p), 2.0);
        float yi = mod(floor(by / p), 2.0);
        v += (2.0 * xi + 3.0 * yi - 4.0 * xi * yi) * scale;
        scale *= 0.25;
    }
    return v / 64.0;
}

// Cut a fragment out at `fadeLevel` (0 = keep everything, 1 = discard everything).
bool shouldDiscard(vec2 fragCoord, float pixelSize, float fadeLevel) {
    if (fadeLevel <= 0.0) return false;
    if (fadeLevel >= 1.0) return true;
    return getBayerThreshold(fragCoord, pixelSize) < fadeLevel;
}
