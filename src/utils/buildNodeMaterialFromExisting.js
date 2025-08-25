import * as THREE from "three/webgpu";

export default function buildNodeMaterialFromExisting(oldMaterial) {
    const nodeMaterial = new THREE.MeshStandardNodeMaterial();

    nodeMaterial.color = oldMaterial.color?.clone() ?? new THREE.Color("white");
    nodeMaterial.roughness = oldMaterial.roughness ?? 0.5;
    nodeMaterial.metalness = oldMaterial.metalness ?? 0.0;
    nodeMaterial.side = oldMaterial.side ?? THREE.DoubleSide;
    nodeMaterial.toneMapped = false;
    nodeMaterial.name = oldMaterial.name ?? "PlayerMaterial";
    nodeMaterial.emissiveIntensity = 0
    nodeMaterial.emissive = null

    if (oldMaterial.name.includes("Emission")){
        nodeMaterial.emissive = oldMaterial.emissive?.clone() ?? new THREE.Color(0xff0000);
        nodeMaterial.emissiveIntensity = 10;
        console.log(oldMaterial)
        nodeMaterial.emissive = oldMaterial.emissive
    }

    nodeMaterial.map = oldMaterial.map ?? null;
    nodeMaterial.normalMap = oldMaterial.normalMap ?? null;
    nodeMaterial.roughnessMap = oldMaterial.roughnessMap ?? null;
    nodeMaterial.metalnessMap = oldMaterial.metalnessMap ?? null;
    nodeMaterial.emissiveMap = oldMaterial.emissiveMap ?? null;

    return nodeMaterial
}