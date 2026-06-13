/**
 * Placeholder secondary-character mesh — a rounded blob body with big readable
 * eyes and optional ears, matching the look-language of the concept art. Built
 * from primitives; replace with a Blender GLB later (keyed by `definition.id`).
 *
 * The parent group owns position / rotation; this only describes the visual,
 * pre-scaled by `definition.scale` and standing on the local ground plane.
 */
export default function CompanionCreature({ definition }) {
    const { bodyColor, accentColor, pupilColor, ears = 'none', scale = 0.5 } = definition

    return (
        <group scale={scale}>
            {/* Body */}
            <mesh position={[0, 0.45, 0]} scale={[1, 0.9, 1]} castShadow>
                <sphereGeometry args={[0.5, 18, 16]} />
                <meshStandardMaterial color={bodyColor} roughness={0.85} metalness={0} />
            </mesh>

            {/* Belly highlight */}
            <mesh position={[0, 0.33, 0.34]} scale={[0.6, 0.5, 0.4]}>
                <sphereGeometry args={[0.5, 14, 12]} />
                <meshStandardMaterial color={accentColor} roughness={0.9} metalness={0} />
            </mesh>

            {/* Eyes */}
            {[-0.18, 0.18].map((x) => (
                <group key={x}>
                    <mesh position={[x, 0.55, 0.4]}>
                        <sphereGeometry args={[0.13, 14, 12]} />
                        <meshStandardMaterial color="#fff8ff" roughness={0.6} metalness={0} />
                    </mesh>
                    <mesh position={[x, 0.55, 0.5]}>
                        <sphereGeometry args={[0.06, 12, 10]} />
                        <meshStandardMaterial color={pupilColor} roughness={0.5} metalness={0} />
                    </mesh>
                </group>
            ))}

            {/* Ears */}
            {ears === 'round' &&
                [-0.24, 0.24].map((x) => (
                    <mesh key={x} position={[x, 0.92, 0]} scale={[0.8, 1, 0.8]}>
                        <sphereGeometry args={[0.17, 12, 10]} />
                        <meshStandardMaterial color={bodyColor} roughness={0.85} metalness={0} />
                    </mesh>
                ))}
            {ears === 'cat' &&
                [-0.24, 0.24].map((x) => (
                    <mesh key={x} position={[x, 0.95, 0]} rotation={[0, 0, x > 0 ? -0.2 : 0.2]}>
                        <coneGeometry args={[0.14, 0.32, 4]} />
                        <meshStandardMaterial color={bodyColor} roughness={0.85} metalness={0} flatShading />
                    </mesh>
                ))}
        </group>
    )
}
