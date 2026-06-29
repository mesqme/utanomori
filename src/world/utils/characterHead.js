// Shared handles to the hero's rig, set by MainCharacter once it loads. Read by:
//   • CharacterEyes — `material` (the head mesh's stylized material; the eyes are drawn in its uv1)
//   • the painterly-contrast reveal in MainCharacter — `materials` (every hero stylized material)
export const characterHead = {
    material: null,
    materials: [],
}
