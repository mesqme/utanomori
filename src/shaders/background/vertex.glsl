varying vec3 vDir;

void main() {
    // The sphere is centred on its own mesh origin, so object-space position IS the sky
    // direction (used for the gradient + stars). It carries the sphere's slow spin, which is
    // what makes the star field drift.
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
