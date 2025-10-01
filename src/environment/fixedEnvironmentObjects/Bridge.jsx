// src/environment/bridge/Bridge.jsx


import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function Bridge() {
    return (
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Bridge"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            receiveShadow
            // Physik
            colliders="trimesh"
            type="fixed"
            friction={1.5}
            restitution={0}
        />
    )
}
