import PreparedStaticModel from "../../app/PrepareStaticModel.jsx";

export default function Altar() {
    return (
        <PreparedStaticModel
            modelUrl="Models.glb"
            nodeName="Altar"
            position={[0, -20, 0]}
            // Schatten/Material-Regeln
            castShadow
            receiveShadow
            // Physik
            colliders="cuboid"
            type="fixed"
            friction={1.0}
            restitution={0}
        />
    )
}