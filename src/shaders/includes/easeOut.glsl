// Ease-out curve; the grass uses it to taper a blade's width from its base to its tip.
float easeOut(float x, float t) {
    return 1.0 - pow(1.0 - x, t);
}
