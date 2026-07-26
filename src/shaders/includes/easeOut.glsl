// Ease-out curve, used to thicken grass blades toward the camera in view space.
float easeOut(float x, float t) {
    return 1.0 - pow(1.0 - x, t);
}
