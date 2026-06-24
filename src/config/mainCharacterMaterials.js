export const mainCharacterMaterialPresets = Object.freeze({
    previous: {
        label: 'Previous',
        materials: {
            red: { baseColor: '#cc2d36', toonColor: '#5c1028' },
            black: { baseColor: '#191919', toonColor: '#05030b' },
            darkBrown: { baseColor: '#7a4159', toonColor: '#241229' },
            blue: { baseColor: '#3661da', toonColor: '#15206a' },
            lightBrown: { baseColor: '#b5777d', toonColor: '#4d263c' },
            metal: { baseColor: '#91a2ff', toonColor: '#34419c' },
            lantern: { baseColor: '#e6a23a', toonColor: '#7a3d18' },
        },
    },
    tuned: {
        label: 'Tuned',
        materials: {
            red: { baseColor: '#cc2544', toonColor: '#722255' },
            black: { baseColor: '#31222d', toonColor: '#241941' },
            darkBrown: { baseColor: '#7a4159', toonColor: '#482452' },
            blue: { baseColor: '#5648a0', toonColor: '#34219a' },
            lightBrown: { baseColor: '#ad7278', toonColor: '#583972' },
            metal: { baseColor: '#91a2ff', toonColor: '#34419c' },
            lantern: { baseColor: '#e6a23a', toonColor: '#7a3d18' },
        },
    },
})

export const mainCharacterMaterialGroups = Object.freeze([
    { id: 'red', label: 'Red', baseColor: '#cc2544', toonColor: '#722255' },
    { id: 'black', label: 'Black', baseColor: '#31222d', toonColor: '#241941' },
    { id: 'darkBrown', label: 'Dark Brown', baseColor: '#7a4159', toonColor: '#482452' },
    { id: 'blue', label: 'Blue', baseColor: '#5648a0', toonColor: '#34219a' },
    { id: 'lightBrown', label: 'Light Brown', baseColor: '#ad7278', toonColor: '#583972' },
    { id: 'metal', label: 'Metal', baseColor: '#91a2ff', toonColor: '#34419c' },
    { id: 'lantern', label: 'Lantern', baseColor: '#e6a23a', toonColor: '#7a3d18' },
])

export const mainCharacterMaterialSlots = Object.freeze([
    { meshName: 'hat_1', materialId: 'red' },
    { meshName: 'head_1', materialId: 'black' },
    { meshName: 'Cylinder001', materialId: 'black' },
    { meshName: 'Cylinder001_1', materialId: 'darkBrown' },
    { meshName: 'Cylinder008', materialId: 'black' },
    { meshName: 'Cylinder008_1', materialId: 'darkBrown' },
    { meshName: 'lantern_1', materialId: 'lantern' },
    { meshName: 'Cylinder010', materialId: 'blue' },
    { meshName: 'Cylinder010_1', materialId: 'darkBrown' },
    { meshName: 'Cylinder004', materialId: 'blue' },
    { meshName: 'Cylinder004_1', materialId: 'black' },
    { meshName: 'Cylinder002', materialId: 'blue' },
    { meshName: 'Cylinder002_1', materialId: 'lightBrown' },
    { meshName: 'blanket_1', materialId: 'blue' },
    { meshName: 'Cube006', materialId: 'darkBrown' },
    { meshName: 'Cube006_1', materialId: 'lightBrown' },
    { meshName: 'Cube006_2', materialId: 'metal' },
    { meshName: 'Cube006_3', materialId: 'black' },
])

export const mainCharacterMaterialDefaults = Object.freeze(
    mainCharacterMaterialGroups.reduce((defaults, group) => {
        defaults[group.id] = { ...mainCharacterMaterialPresets.previous.materials[group.id] }
        return defaults
    }, {})
)
