varying vec3 vDir;

void main() {
    // The sphere is centred on its mesh origin and never rotated, so object-space
    // position is the world-aligned sky direction (used for the gradient + stars).
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
